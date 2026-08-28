// /**
//  * Generates a complete A4-print-optimized HTML document for the
//  * Director's Dashboard report. Open in a new window and call window.print()
//  * to let the user save as PDF via the browser's native dialog.
//  */

// interface ReportData {
//     overview: Record<string, any>;
//     funds: Record<string, any>;
//     intl: Record<string, any>;
//     proposals: Record<string, any>;
//     ipr: Record<string, any>;
//     topProjects: any[];
//     recentProjects: any[];
//     projectStatusByYearData: any[];
//     fundingTypeData: any[];
//     fullName: string;
//     /** Map of department id → display name from Department_prornd */
//     deptNameMap?: Record<string, string>;
// }

// function fmt(amount: number): string {
//     if (!amount) return "₹0";
//     if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
//     if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
//     return `₹${amount.toLocaleString("en-IN")}`;
// }

// function dateStr(): string {
//     return new Date().toLocaleDateString("en-IN", {
//         day: "2-digit",
//         month: "long",
//         year: "numeric",
//     });
// }

// function formatDate(iso?: string): string {
//     if (!iso) return "—";
//     return new Date(iso).toLocaleDateString("en-IN", {
//         day: "2-digit",
//         month: "short",
//         year: "numeric",
//     });
// }

// function statusBadge(status?: string): string {
//     if (!status) return '<span class="badge badge-gray">—</span>';
//     const s = status.toLowerCase();
//     if (s.includes("ongoing") || s.includes("active"))
//         return `<span class="badge badge-blue">Ongoing</span>`;
//     if (s.includes("complet"))
//         return `<span class="badge badge-green">Completed</span>`;
//     if (s.includes("register"))
//         return `<span class="badge badge-amber">Registered</span>`;
//     return `<span class="badge badge-gray">${status}</span>`;
// }

// export function generateDirectorReportHtml(d: ReportData): string {
//     const {
//         overview,
//         funds,
//         intl,
//         proposals,
//         ipr,
//         topProjects,
//         recentProjects,
//         projectStatusByYearData,
//         fundingTypeData,
//         fullName,
//         deptNameMap = {},
//     } = d;

//     const resolveDept = (id?: string): string =>
//         id ? (deptNameMap[id] ?? id) : "—";

//     const totalProjects = overview.total_projects || 0;
//     const researchProjects = overview.research_projects || 0;
//     const consultancyProjects = overview.consultancy_projects || 0;
//     const ongoingProjects = overview.ongoing_projects || 0;
//     const totalStaffCount = overview.total_staff_count || 0;

//     const fundAlloc = funds.total_allocation || 0;
//     const fundUtilized = funds.utilized || 0;
//     const fundRemaining = funds.remaining || 0;
//     const fundUtilPct =
//         fundAlloc > 0 ? ((fundUtilized / fundAlloc) * 100).toFixed(1) : "0";

//     const totalFundingSrc = fundingTypeData.reduce(
//         (s: number, x: any) => s + (x.value || 0),
//         0,
//     );

//     /* ── Project Status table rows ── */
//     const yearRows = projectStatusByYearData
//         .map(
//             (r: any) => `
//         <tr>
//             <td>${r.year ?? "—"}</td>
//             <td class="num">${r.registered ?? 0}</td>
//             <td class="num">${r.ongoing ?? 0}</td>
//             <td class="num">${r.completed ?? 0}</td>
//             <td class="num">${(r.registered ?? 0) + (r.ongoing ?? 0) + (r.completed ?? 0)}</td>
//         </tr>`,
//         )
//         .join("");

//     /* ── Top funded projects rows ── */
//     const topRows = topProjects
//         .slice(0, 10)
//         .map(
//             (p: any, i: number) => `
//         <tr>
//             <td class="num muted">${String(i + 1).padStart(2, "0")}</td>
//             <td>
//                 <span class="proj-title">${p.project_title || "Untitled"}</span><br>
//                 <span class="mono small">${p.project_id || "—"}</span>
//             </td>
//             <td>${p.pi_name || "—"}</td>
//             <td>${resolveDept(p.department)}</td>
//             <td>${statusBadge(p.status || p.workflow_state)}</td>
//             <td class="num green bold">${fmt(p.total_budget_amount || 0)}</td>
//         </tr>`,
//         )
//         .join("");

//     /* ── Recent projects rows ── */
//     const recentRows = recentProjects
//         .slice(0, 8)
//         .map(
//             (p: any, i: number) => `
//         <tr>
//             <td class="num muted">${String(i + 1).padStart(2, "0")}</td>
//             <td>
//                 <span class="proj-title">${p.project_title || "Untitled"}</span><br>
//                 <span class="mono small">${p.project_id || "—"}</span>
//             </td>
//             <td>${p.pi_name || "—"}</td>
//             <td>${resolveDept(p.department)}</td>
//             <td class="muted">${formatDate(p.creation)}</td>
//         </tr>`,
//         )
//         .join("");

//     /* ── Funding sources rows ── */
//     const fundSrcRows = fundingTypeData
//         .slice(0, 8)
//         .map(
//             (f: any) => {
//                 const pct =
//                     totalFundingSrc > 0
//                         ? Math.round((f.value / totalFundingSrc) * 100)
//                         : 0;
//                 return `
//         <tr>
//             <td>${f.name || "—"}</td>
//             <td class="num">${f.value ?? 0}</td>
//             <td class="num">${pct}%</td>
//             <td>
//                 <div class="bar-track">
//                     <div class="bar-fill" style="width:${pct}%"></div>
//                 </div>
//             </td>
//         </tr>`;
//             },
//         )
//         .join("");

//     return `<!DOCTYPE html>
// <html lang="en">
// <head>
// <meta charset="UTF-8">
// <meta name="viewport" content="width=device-width, initial-scale=1.0">
// <title>Director's Dashboard Report — IIT Guwahati R&D</title>
// <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
// <style>
//   /* ── Reset & Base ── */
//   *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

//   html {
//     font-size: 10pt;
//     -webkit-print-color-adjust: exact;
//     print-color-adjust: exact;
//   }

//   body {
//     font-family: 'DM Sans', -apple-system, sans-serif;
//     color: #1a1a1a;
//     background: #fff;
//     line-height: 1.5;
//   }

//   /* ── @page: zero browser margins so our .page padding is the sole spacing ── */
//   @page {
//     size: A4;
//     margin: 0;
//   }

//   /* ── Each .page div = one A4 sheet with explicit padding on all sides ── */
//   .page {
//     width: 210mm;
//     min-height: 297mm;
//     margin: 0 auto;
//     padding: 20mm 22mm 18mm 22mm;
//     background: #fff;
//     box-sizing: border-box;
//   }

//   /* Divider between pages on screen */
//   .page + .page {
//     border-top: 3px dashed #e2e8f0;
//     margin-top: 24px;
//   }

//   @media print {
//     html, body { margin: 0; padding: 0; background: #fff; }
//     /* Each .page div forces a new printed page and carries its own padding */
//     .page {
//       width: 210mm;
//       min-height: 0;
//       margin: 0;
//       padding: 20mm 22mm 18mm 22mm;
//       page-break-after: always;
//       box-sizing: border-box;
//     }
//     .page:last-child { page-break-after: auto; }
//     .page + .page { border-top: none; margin-top: 0; }
//     .no-print { display: none !important; }
//     section { break-inside: avoid; }
//   }

//   /* Screen preview top offset for print-bar */
//   @media screen { .page:first-of-type { margin-top: 56px; } }

//   /* ── Print button (screen only) ── */
//   .print-bar {
//     position: fixed;
//     top: 0; left: 0; right: 0;
//     background: #1a1a1a;
//     color: #fff;
//     padding: 10px 24px;
//     display: flex;
//     align-items: center;
//     justify-content: space-between;
//     gap: 12px;
//     z-index: 1000;
//     font-size: 9pt;
//   }
//   .print-bar .hint { color: #94a3b8; }
//   .btn-print {
//     background: #D97757;
//     color: #fff;
//     border: none;
//     padding: 7px 20px;
//     border-radius: 6px;
//     font-family: 'DM Sans', sans-serif;
//     font-size: 9.5pt;
//     font-weight: 700;
//     cursor: pointer;
//     letter-spacing: 0.02em;
//   }
//   .btn-print:hover { opacity: 0.88; }

//   /* ── Cover Header ── */
//   .cover {
//     border-bottom: 2px solid #1a1a1a;
//     padding-bottom: 14px;
//     margin-bottom: 20px;
//   }
//   .cover-top {
//     display: flex;
//     align-items: flex-start;
//     justify-content: space-between;
//     gap: 16px;
//   }
//   .cover-title {
//     font-size: 19pt;
//     font-weight: 800;
//     letter-spacing: -0.02em;
//     color: #1a1a1a;
//     line-height: 1.15;
//   }
//   .cover-title span { color: #2563eb; }
//   .cover-sub {
//     font-size: 8.5pt;
//     color: #64748b;
//     margin-top: 4px;
//     font-weight: 500;
//   }
//   .cover-meta {
//     text-align: right;
//     font-size: 8pt;
//     color: #64748b;
//     line-height: 1.8;
//     flex-shrink: 0;
//   }
//   .cover-meta strong { color: #1a1a1a; }
//   .cover-badge {
//     display: inline-flex;
//     align-items: center;
//     gap: 5px;
//     background: #f0fdf4;
//     border: 1px solid #bbf7d0;
//     color: #15803d;
//     font-size: 7.5pt;
//     font-weight: 700;
//     padding: 3px 9px;
//     border-radius: 99px;
//     letter-spacing: 0.06em;
//     text-transform: uppercase;
//     margin-top: 6px;
//   }
//   .dot {
//     width: 6px; height: 6px;
//     background: #22c55e;
//     border-radius: 50%;
//   }

//   /* ── Section Dividers ── */
//   .section-header {
//     display: flex;
//     align-items: center;
//     gap: 10px;
//     margin: 20px 0 10px 0;
//     break-after: avoid;
//   }
//   .section-header h2 {
//     font-size: 7.5pt;
//     font-weight: 800;
//     color: #64748b;
//     text-transform: uppercase;
//     letter-spacing: 0.12em;
//     white-space: nowrap;
//   }
//   .section-line {
//     flex: 1;
//     height: 1px;
//     background: #e2e8f0;
//   }

//   /* ── KPI Grid ── */
//   .kpi-grid {
//     display: grid;
//     grid-template-columns: repeat(5, 1fr);
//     gap: 10px;
//     margin-bottom: 4px;
//   }
//   .kpi-card {
//     border: 1px solid #e2e8f0;
//     border-radius: 10px;
//     padding: 10px 12px 9px 12px;
//     position: relative;
//     overflow: hidden;
//   }
//   .kpi-card::after {
//     content: '';
//     position: absolute;
//     bottom: -12px; right: -12px;
//     width: 50px; height: 50px;
//     border-radius: 50%;
//     opacity: 0.08;
//   }
//   .kpi-card.blue::after  { background: #2563eb; }
//   .kpi-card.green::after { background: #059669; }
//   .kpi-card.violet::after{ background: #7c3aed; }
//   .kpi-card.amber::after { background: #d97706; }
//   .kpi-card.sky::after   { background: #0284c7; }
//   .kpi-label {
//     font-size: 7pt;
//     font-weight: 800;
//     color: #94a3b8;
//     text-transform: uppercase;
//     letter-spacing: 0.1em;
//     margin-bottom: 4px;
//   }
//   .kpi-value {
//     font-size: 18pt;
//     font-weight: 800;
//     letter-spacing: -0.03em;
//     line-height: 1;
//     margin-bottom: 3px;
//   }
//   .kpi-card.blue  .kpi-value { color: #1d4ed8; }
//   .kpi-card.green .kpi-value { color: #047857; }
//   .kpi-card.violet.kpi-value, .kpi-card.violet .kpi-value { color: #6d28d9; }
//   .kpi-card.amber .kpi-value { color: #b45309; }
//   .kpi-card.sky   .kpi-value { color: #0369a1; }
//   .kpi-sub {
//     font-size: 7.5pt;
//     color: #94a3b8;
//     font-weight: 500;
//   }

//   /* ── Tables ── */
//   table {
//     width: 100%;
//     border-collapse: collapse;
//     font-size: 8.5pt;
//   }
//   th {
//     font-size: 7pt;
//     font-weight: 800;
//     color: #94a3b8;
//     text-transform: uppercase;
//     letter-spacing: 0.08em;
//     text-align: left;
//     padding: 6px 8px;
//     border-bottom: 2px solid #e2e8f0;
//   }
//   td {
//     padding: 7px 8px;
//     border-bottom: 1px solid #f1f5f9;
//     vertical-align: middle;
//     color: #1a1a1a;
//   }
//   tr:last-child td { border-bottom: none; }
//   .num { text-align: right; }
//   .muted { color: #94a3b8; }
//   .green { color: #059669; }
//   .blue-t { color: #2563eb; }
//   .bold { font-weight: 700; }
//   .proj-title { font-weight: 700; font-size: 8.5pt; color: #1a1a1a; }
//   .mono { font-family: 'DM Mono', monospace; font-size: 7pt; color: #94a3b8; }
//   .small { font-size: 7pt; }

//   /* ── Badges ── */
//   .badge {
//     display: inline-block;
//     font-size: 6.5pt;
//     font-weight: 800;
//     padding: 2px 6px;
//     border-radius: 99px;
//     text-transform: uppercase;
//     letter-spacing: 0.06em;
//   }
//   .badge-blue   { background: #eff6ff; color: #1d4ed8; }
//   .badge-green  { background: #f0fdf4; color: #15803d; }
//   .badge-amber  { background: #fffbeb; color: #b45309; }
//   .badge-gray   { background: #f8fafc; color: #64748b; }

//   /* ── Two-column grid ── */
//   .two-col {
//     display: grid;
//     grid-template-columns: 1fr 1fr;
//     gap: 16px;
//   }
//   .three-col {
//     display: grid;
//     grid-template-columns: 1fr 1fr 1fr;
//     gap: 16px;
//   }

//   /* ── Card wrapper ── */
//   .card {
//     border: 1px solid #e2e8f0;
//     border-radius: 10px;
//     overflow: hidden;
//   }
//   .card-header {
//     padding: 8px 12px;
//     background: #f8fafc;
//     border-bottom: 1px solid #e2e8f0;
//     font-size: 8pt;
//     font-weight: 800;
//     color: #334155;
//     letter-spacing: 0.01em;
//   }
//   .card-body { padding: 10px 12px; }

//   /* ── Financial summary tiles ── */
//   .fin-tiles {
//     display: grid;
//     grid-template-columns: repeat(3, 1fr);
//     gap: 8px;
//     margin-bottom: 12px;
//   }
//   .fin-tile {
//     border: 1px solid #e2e8f0;
//     border-radius: 8px;
//     padding: 9px 10px;
//     text-align: center;
//   }
//   .fin-tile .amount {
//     font-size: 13pt;
//     font-weight: 800;
//     letter-spacing: -0.02em;
//     line-height: 1.1;
//   }
//   .fin-tile .amt-label {
//     font-size: 7pt;
//     font-weight: 700;
//     color: #94a3b8;
//     text-transform: uppercase;
//     letter-spacing: 0.08em;
//     margin-top: 3px;
//   }

//   /* ── Progress bar ── */
//   .bar-track {
//     height: 5px;
//     background: #e2e8f0;
//     border-radius: 99px;
//     overflow: hidden;
//     min-width: 60px;
//   }
//   .bar-fill {
//     height: 100%;
//     background: #2563eb;
//     border-radius: 99px;
//   }
//   .util-bar-track {
//     height: 6px;
//     background: #e2e8f0;
//     border-radius: 99px;
//     overflow: hidden;
//     margin-top: 4px;
//   }
//   .util-bar-fill {
//     height: 100%;
//     background: #059669;
//     border-radius: 99px;
//   }

//   /* ── Stat list ── */
//   .stat-row {
//     display: flex;
//     justify-content: space-between;
//     align-items: center;
//     padding: 6px 0;
//     border-bottom: 1px solid #f1f5f9;
//     font-size: 8.5pt;
//   }
//   .stat-row:last-child { border-bottom: none; }
//   .stat-label { color: #64748b; }
//   .stat-value { font-weight: 700; color: #1a1a1a; }

//   /* ── Footer ── */
//   .report-footer {
//     margin-top: 24px;
//     padding-top: 10px;
//     border-top: 1px solid #e2e8f0;
//     display: flex;
//     justify-content: space-between;
//     font-size: 7.5pt;
//     color: #94a3b8;
//     font-weight: 500;
//   }
//   .report-footer a { color: #D97757; text-decoration: none; }
// </style>
// </head>
// <body>

// <!-- Print bar (screen only) -->
// <div class="print-bar no-print">
//     <span class="hint">Director's Dashboard Report — Preview</span>
//     <button class="btn-print" onclick="window.print()">⬇ Save as PDF / Print</button>
// </div>

// <!-- ════════════════ PAGE 1 ════════════════ -->
// <div class="page">

//     <!-- ── Cover ── -->
//     <div class="cover">
//         <div class="cover-top">
//             <div>
//                 <div class="cover-title">Director's <span>Overview</span></div>
//                 <div class="cover-sub">R&D Operations Management — Indian Institute of Technology Guwahati</div>
//                 <div class="cover-badge"><span class="dot"></span>Official Report</div>
//             </div>
//             <div class="cover-meta">
//                 <div>Generated on &nbsp;<strong>${dateStr()}</strong></div>
//                 <div>Prepared for &nbsp;<strong>${fullName}</strong></div>
//                 <div>Classification &nbsp;<strong>Internal Use Only</strong></div>
//             </div>
//         </div>
//     </div>

//     <!-- ── KPI Summary ── -->
//     <div class="section-header">
//         <h2>Key Performance Indicators</h2>
//         <div class="section-line"></div>
//     </div>
//     <div class="kpi-grid">
//         <div class="kpi-card blue">
//             <div class="kpi-label">Total Projects</div>
//             <div class="kpi-value">${totalProjects}</div>
//             <div class="kpi-sub">${researchProjects} Research · ${consultancyProjects} Consultancy</div>
//         </div>
//         <div class="kpi-card green">
//             <div class="kpi-label">Total Allocation</div>
//             <div class="kpi-value">${fmt(fundAlloc)}</div>
//             <div class="kpi-sub">${fundUtilPct}% utilized</div>
//         </div>
//         <div class="kpi-card violet">
//             <div class="kpi-label">Ongoing Projects</div>
//             <div class="kpi-value">${ongoingProjects}</div>
//             <div class="kpi-sub">${totalProjects > 0 ? Math.round((ongoingProjects / totalProjects) * 100) : 0}% of portfolio</div>
//         </div>
//         <div class="kpi-card amber">
//             <div class="kpi-label">Patents Filed</div>
//             <div class="kpi-value">${ipr.total_patents_filed || 0}</div>
//             <div class="kpi-sub">Intellectual Property</div>
//         </div>
//         <div class="kpi-card sky">
//             <div class="kpi-label">Intl. Agencies</div>
//             <div class="kpi-value">${intl.active_agencies || 0}</div>
//             <div class="kpi-sub">Active Global MOUs</div>
//         </div>
//     </div>

//     <!-- ── Financial Intelligence ── -->
//     <div class="section-header" style="margin-top:18px;">
//         <h2>Financial Intelligence</h2>
//         <div class="section-line"></div>
//     </div>
//     <div class="fin-tiles">
//         <div class="fin-tile">
//             <div class="amount blue-t">${fmt(fundAlloc)}</div>
//             <div class="amt-label">Total Sanctioned</div>
//         </div>
//         <div class="fin-tile">
//             <div class="amount green">${fmt(fundUtilized)}</div>
//             <div class="amt-label">Funds Utilized</div>
//         </div>
//         <div class="fin-tile">
//             <div class="amount" style="color:#d97706;">${fmt(fundRemaining)}</div>
//             <div class="amt-label">Remaining Balance</div>
//         </div>
//     </div>
//     <div style="display:flex; gap:8px; align-items:center; margin-bottom:4px;">
//         <span style="font-size:8pt; color:#64748b; font-weight:600;">Utilization Rate</span>
//         <span style="font-size:8pt; font-weight:800; color:#059669;">${fundUtilPct}%</span>
//     </div>
//     <div class="util-bar-track" style="margin-bottom:12px;">
//         <div class="util-bar-fill" style="width:${Math.min(parseFloat(fundUtilPct), 100)}%;"></div>
//     </div>
//     <div class="two-col" style="gap:10px; margin-bottom:4px;">
//         <div class="stat-row"><span class="stat-label">Proposals Under Review</span><span class="stat-value">${proposals.total_proposals || 0}</span></div>
//         <div class="stat-row"><span class="stat-label">Proposed Budget (Under Review)</span><span class="stat-value">${fmt(proposals.proposed_budget_total || 0)}</span></div>
//     </div>

//     <!-- ── Project Status by Year ── -->
//     ${projectStatusByYearData.length > 0 ? `
//     <div class="section-header">
//         <h2>Project Status — Financial Year Breakdown</h2>
//         <div class="section-line"></div>
//     </div>
//     <section>
//         <table>
//             <thead>
//                 <tr>
//                     <th>Financial Year</th>
//                     <th class="num">Registered</th>
//                     <th class="num">Ongoing</th>
//                     <th class="num">Completed</th>
//                     <th class="num">Total</th>
//                 </tr>
//             </thead>
//             <tbody>${yearRows}</tbody>
//         </table>
//     </section>` : ""}

//     <!-- ── Top Funded Projects ── -->
//     ${topProjects.length > 0 ? `
//     <div class="section-header" style="margin-top:18px;">
//         <h2>Top Funded Projects</h2>
//         <div class="section-line"></div>
//     </div>
//     <section>
//         <table>
//             <thead>
//                 <tr>
//                     <th>#</th>
//                     <th>Project Title / ID</th>
//                     <th>PI / Lead</th>
//                     <th>Department</th>
//                     <th>Status</th>
//                     <th class="num">Budget</th>
//                 </tr>
//             </thead>
//             <tbody>${topRows}</tbody>
//         </table>
//     </section>` : ""}

// </div><!-- /page 1 -->

// <!-- ════════════════ PAGE 2 ════════════════ -->
// <div class="page">

//     <!-- Continuation header -->
//     <div style="display:flex; align-items:center; justify-content:space-between; padding-bottom:10px; margin-bottom:16px; border-bottom:1px solid #e2e8f0;">
//         <span style="font-size:8pt; font-weight:700; color:#334155;">Director's Dashboard Report</span>
//         <span style="font-size:7.5pt; color:#94a3b8;">R&amp;D Operations · IIT Guwahati · ${dateStr()}</span>
//     </div>

//     <!-- ── Funding Sources ── -->
//     ${fundingTypeData.length > 0 ? `
//     <div class="section-header">
//         <h2>Funding Sources — Agency Breakdown</h2>
//         <div class="section-line"></div>
//     </div>
//     <section>
//         <table>
//             <thead>
//                 <tr>
//                     <th>Agency / Source</th>
//                     <th class="num">Projects</th>
//                     <th class="num">Share %</th>
//                     <th>Distribution</th>
//                 </tr>
//             </thead>
//             <tbody>${fundSrcRows}</tbody>
//         </table>
//     </section>` : ""}

//     <!-- ── Recently Registered ── -->
//     ${recentProjects.length > 0 ? `
//     <div class="section-header" style="margin-top:18px;">
//         <h2>Recently Registered Projects</h2>
//         <div class="section-line"></div>
//     </div>
//     <section>
//         <table>
//             <thead>
//                 <tr>
//                     <th>#</th>
//                     <th>Project Title / ID</th>
//                     <th>PI / Lead</th>
//                     <th>Department</th>
//                     <th>Registered On</th>
//                 </tr>
//             </thead>
//             <tbody>${recentRows}</tbody>
//         </table>
//     </section>` : ""}

//     <!-- ── Portfolio Summary ── -->
//     <div class="section-header" style="margin-top:18px;">
//         <h2>Portfolio Summary</h2>
//         <div class="section-line"></div>
//     </div>
//     <section>
//         <div class="three-col">
//             <div class="card">
//                 <div class="card-header">Project Categories</div>
//                 <div class="card-body">
//                     <div class="stat-row">
//                         <span class="stat-label">Research Projects</span>
//                         <span class="stat-value blue-t">${researchProjects}</span>
//                     </div>
//                     <div class="stat-row">
//                         <span class="stat-label">Consultancy Projects</span>
//                         <span class="stat-value" style="color:#7c3aed;">${consultancyProjects}</span>
//                     </div>
//                     <div class="stat-row">
//                         <span class="stat-label">Ongoing Projects</span>
//                         <span class="stat-value green">${ongoingProjects}</span>
//                     </div>
//                 </div>
//             </div>
//             <div class="card">
//                 <div class="card-header">Human Resources</div>
//                 <div class="card-body">
//                     <div class="stat-row">
//                         <span class="stat-label">Total Project Staff</span>
//                         <span class="stat-value">${totalStaffCount}</span>
//                     </div>
//                     <div class="stat-row">
//                         <span class="stat-label">Intl. Agency MOUs</span>
//                         <span class="stat-value">${intl.active_agencies || 0}</span>
//                     </div>
//                     <div class="stat-row">
//                         <span class="stat-label">Patents Filed</span>
//                         <span class="stat-value" style="color:#b45309;">${ipr.total_patents_filed || 0}</span>
//                     </div>
//                 </div>
//             </div>
//             <div class="card">
//                 <div class="card-header">Proposals Pipeline</div>
//                 <div class="card-body">
//                     <div class="stat-row">
//                         <span class="stat-label">Under Review</span>
//                         <span class="stat-value">${proposals.total_proposals || 0}</span>
//                     </div>
//                     <div class="stat-row">
//                         <span class="stat-label">Proposed Budget</span>
//                         <span class="stat-value">${fmt(proposals.proposed_budget_total || 0)}</span>
//                     </div>
//                     <div class="stat-row">
//                         <span class="stat-label">Total Projects</span>
//                         <span class="stat-value">${totalProjects}</span>
//                     </div>
//                 </div>
//             </div>
//         </div>
//     </section>

//     <!-- ── Footer ── -->
//     <div class="report-footer">
//         <span>© 2026 R&D Operations · IIT Guwahati · Internal Use Only</span>
//         <span>Director's Intelligence Hub — <a href="mailto:ernd@iitg.ac.in">ernd@iitg.ac.in</a></span>
//     </div>

// </div><!-- /page -->

// <script>
//     // Auto-trigger print for direct PDF save
//     window.addEventListener('load', function() {
//         // Small delay to let fonts load
//         setTimeout(function() {
//             document.querySelector('.print-bar') &&
//             document.querySelector('.print-bar').style &&
//             (document.querySelector('.print-bar').style.display = 'flex');
//         }, 100);
//     });
// </script>
// </body>
// </html>`;
// }


// ==================================================


/**
 * Professional Executive Report Generator for IIT Guwahati R&D
 * Optimized for A4 PDF Printing
 */

interface ReportData {
    overview: Record<string, any>;
    funds: Record<string, any>;
    intl: Record<string, any>;
    proposals: Record<string, any>;
    ipr: Record<string, any>;
    topProjects: any[];
    recentProjects: any[];
    projectStatusByYearData: any[];
    fundingTypeData: any[];
    fullName: string;
    deptNameMap?: Record<string, string>;
    // Stats derived from the dashboard logic
    researchStats: { ongoing: number; submitted: number; total: number };
    consultancyStats: { ongoing: number; submitted: number; total: number };
    startEndSanctionData?: any[];
    topInvestigators?: any[];
    pieChartDeptData?: any[];
}

function fmt(amount: number): string {
    if (!amount) return "₹0";
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
    return `₹${amount.toLocaleString("en-IN")}`;
}

export function generateDirectorReportHtml(d: ReportData): string {
    // This HTML is rendered into an <iframe srcDoc="...">, which resolves absolute
    // paths against the parent page's origin, not the app's configured base path —
    // so a bare "/IITG_Large_Logo.gif" 404s whenever the app is served under a
    // sub-path (e.g. /dev/).
    const logoUrl = `${import.meta.env.BASE_URL}IITG_Large_Logo.gif`;
    const {
        overview,
        funds,
        intl,
        proposals,
        ipr,
        topProjects,
        recentProjects,
        projectStatusByYearData,
        fundingTypeData,
        fullName,
        deptNameMap = {},
        researchStats,
        consultancyStats,
        startEndSanctionData = []
    } = d;

    const liveDate = new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });

    const resolveDept = (id?: string): string => id ? (deptNameMap[id] ?? id) : "—";

    const fundUtilPercent = funds.total_allocation > 0
        ? ((funds.utilized / funds.total_allocation) * 100).toFixed(1)
        : "0.0";

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Executive R&D Report - ${liveDate}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        @page { size: A4; margin: 0; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        
        body { 
            font-family: 'Inter', -apple-system, sans-serif; 
            color: #1e293b; background: #f1f5f9; margin: 0; padding: 0; 
        }

        .no-print-bar {
            background: #1e293b; color: white; padding: 12px 24px;
            display: flex; justify-content: space-between; align-items: center;
            position: sticky; top: 0; z-index: 100; font-size: 13px;
        }

        .btn-print {
            background: #2563eb; color: white; border: none; padding: 8px 16px;
            border-radius: 6px; font-weight: 700; cursor: pointer;
        }

        .page {
            display: flex; flex-direction: column;
            position: relative;
            width: 210mm; min-height: 297mm; padding: 14mm;
            margin: 10mm auto; background: white;
            box-shadow: 0 0 20px rgba(0,0,0,0.05);
        }

        /* Watermark */
        .watermark {
            position: absolute;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            width: 220px; height: 220px;
            opacity: 0.06;
            pointer-events: none;
            z-index: 0;
        }
        .watermark img { width: 100%; height: 100%; object-fit: contain; }
        /* Push all direct page children above watermark */
        .page > *:not(.watermark) { position: relative; z-index: 1; }

        @media print {
            body { background: white; }
            .page { margin: 0; box-shadow: none; page-break-after: always; break-after: page; }
            .page:last-child { page-break-after: auto; break-after: auto; }
            .no-print-bar { display: none !important; }
            tr { page-break-inside: avoid; break-inside: avoid; }
            table { page-break-inside: auto; }
        }

        /* Institutional Header */
        .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 16px; }
        .inst-title { font-size: 18pt; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
        .inst-title span { color: #2563eb; }
        .inst-sub { font-size: 9pt; color: #64748b; font-weight: 500; margin-top: 3px; }
        
        .meta-table { width: 100%; margin-top: 12px; font-size: 8.5pt; color: #475569; }
        .meta-table td { padding: 3px 0; }

        /* Section Headings */
        .section-title {
            font-size: 8.5pt; font-weight: 800; color: #2563eb;
            text-transform: uppercase; letter-spacing: 0.1em;
            margin: 16px 0 10px 0; display: flex; align-items: center;
            gap: 10px; break-after: avoid; page-break-after: avoid;
        }
        .section-title::after { content: ""; flex: 1; height: 1px; background: #e2e8f0; }

        /* KPI Grid */
        .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; break-inside: avoid; }
        .kpi-box { 
            background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 12px; border-radius: 10px;
        }
        .kpi-label { font-size: 7pt; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
        .kpi-val { font-size: 13pt; font-weight: 800; color: #0f172a; line-height: 1.2; }
        .kpi-sub { font-size: 7.5pt; color: #94a3b8; font-weight: 600; margin-top: 3px; }

        /* Tables */
        table { width: 100%; border-collapse: collapse; margin-top: 6px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
        th { background: #f8fafc; padding: 7px 8px; font-size: 7.5pt; font-weight: 700; color: #475569; text-align: left; border-bottom: 2px solid #e2e8f0; }
        td { padding: 7px 8px; font-size: 8pt; border-bottom: 1px solid #f1f5f9; color: #334155; vertical-align: top; }
        tr:nth-child(even) { background: #fafafa; }
        
        .amt-cell { font-weight: 700; color: #059669; text-align: right; white-space: nowrap; }
        .text-right { text-align: right; }
        .bold { font-weight: 700; color: #0f172a; }

        /* Footer */
        .footer {
            margin-top: auto; padding-top: 15px; margin-bottom: 5px;
            border-top: 1px solid #e2e8f0;
            display: flex; justify-content: space-between; font-size: 8pt; color: #94a3b8; font-weight: 600;
        }
    </style>
</head>
<body>

    <div class="no-print-bar">
        <span>Executive Dashboard Report — Preview Mode</span>
        <button class="btn-print" onclick="window.print()">Download as PDF</button>
    </div>

    <div class="page">
        <div class="watermark"><img src="${logoUrl}" alt="IITG Watermark"></div>
        <!-- HEADER -->
        <div class="header">
            <div class="inst-title">R&D <span>Executive Report</span></div>
            <div class="inst-sub">Indian Institute of Technology Guwahati — Research Operations Management</div>
            
            <table class="meta-table">
                <tr>
                    <td width="15%">Prepared For:</td>
                    <td width="35%"><strong>Prof. Devendra Jalihal</strong></td>
                    <td width="15%" style="text-align: right;">Report Date:</td>
                    <td width="35%" style="text-align: right;"><strong>${liveDate}</strong></td>
                </tr>
                <tr>
                    <td>Classification:</td>
                    <td><span style="color: #dc2626; font-weight: 700;">INTERNAL USE ONLY</span></td>
                    <td style="text-align: right;">Reporting Lead:</td>
                    <td style="text-align: right;"><strong>${fullName}</strong></td>
                </tr>
            </table>
        </div>

        <!-- KPIs -->
        <div class="section-title">Institutional KPIs</div>
        <div class="kpi-grid">
            <div class="kpi-box">
                <div class="kpi-label">Total Projects</div>
                <div class="kpi-val">${overview.total_projects}</div>
                <div class="kpi-sub">${overview.ongoing_projects} Ongoing · ${overview.submitted_projects} Sub</div>
            </div>
            <div class="kpi-box">
                <div class="kpi-label">Capital Sanctioned</div>
                <div class="kpi-val" style="color: #059669;">${fmt(funds.total_allocation)}</div>
                <div class="kpi-sub">${fundUtilPercent}% Current Utilization</div>
            </div>
            <div class="kpi-box">
                <div class="kpi-label">Staff Resources</div>
                <div class="kpi-val">${overview.total_staff_count || 0}</div>
                <div class="kpi-sub">Active Project Personnel</div>
            </div>
            <div class="kpi-box">
                <div class="kpi-label">Project Mix</div>
                <div class="kpi-val">${researchStats.total}R / ${consultancyStats.total}C</div>
                <div class="kpi-sub">Research vs Consultancy</div>
            </div>
            <div class="kpi-box">
                <div class="kpi-label">Ongoing Projects</div>
                <div class="kpi-val" style="color: #7c3aed;">${overview.ongoing_projects || 0}</div>
                <div class="kpi-sub">${overview.total_projects > 0 ? Math.round(((overview.ongoing_projects || 0) / overview.total_projects) * 100).toFixed(0) : 0}% of portfolio</div>
            </div>
            <div class="kpi-box">
                <div class="kpi-label">Intl. Collaborators</div>
                <div class="kpi-val" style="color: #0284c7;">${intl.active_agencies || 0}</div>
                <div class="kpi-sub">Active Global Collaborators</div>
            </div>
        </div>

        <!-- FINANCIALS -->
        <div class="section-title">Financial Intelligence</div>
        <table style="border: none; margin-bottom: 10px;">
            <tr style="background: none;">
                <td style="padding: 0 8px 0 0; border: none;" width="33%">
                    <div style="padding: 10px; background: #eff6ff; border-radius: 8px; border: 1px solid #dbeafe;">
                        <div class="kpi-label">Funds Sanctioned</div>
                        <div style="font-size: 12pt; font-weight: 800; color: #1e40af;">${fmt(funds.total_allocation)}</div>
                    </div>
                </td>
                <td style="padding: 0 8px; border: none;" width="33%">
                    <div style="padding: 10px; background: #f0fdf4; border-radius: 8px; border: 1px solid #dcfce7;">
                        <div class="kpi-label">Utilized Amount</div>
                        <div style="font-size: 12pt; font-weight: 800; color: #166534;">${fmt(funds.utilized)}</div>
                    </div>
                </td>
                <td style="padding: 0 0 0 8px; border: none;" width="33%">
                    <div style="padding: 10px; background: #fffbeb; border-radius: 8px; border: 1px solid #fef3c7;">
                        <div class="kpi-label">Remaining Balance</div>
                        <div style="font-size: 12pt; font-weight: 800; color: #92400e;">${fmt(funds.remaining)}</div>
                    </div>
                </td>
            </tr>
        </table>

        <!-- TOP FUNDED PROJECTS -->
        <div class="section-title">Strategic Projects — Top Funded</div>
        <table>
            <thead>
                <tr>
                    <th width="5%">#</th>
                    <th width="55%">Project Details</th>
                    <th width="20%">Department</th>
                    <th width="20%" class="text-right">Budget</th>
                </tr>
            </thead>
            <tbody>
                ${topProjects.slice(0, 5).map((p, i) => `
                    <tr>
                        <td style="color: #94a3b8; font-weight: 700;">${i + 1}</td>
                        <td>
                            <div class="bold">${p.project_title}</div>
                            <div style="font-size: 7.5pt; color: #64748b; margin-top: 2px;">PI: ${p.pi_name} | ID: ${p.project_id}</div>
                        </td>
                        <td>${resolveDept(p.department)}</td>
                        <td class="amt-cell">${fmt(p.total_budget_amount)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="footer">
            <span>IIT Guwahati · Research & Development Operations</span>
            <span>Document IRD-2026-CONF</span>
            <span>Page 1 of 3</span>
        </div>
    </div>

    <!-- PAGE 2 -->
    <div class="page">
        <div class="watermark"><img src="${logoUrl}" alt="IITG Watermark"></div>
        <div class="section-title">Funding Agency Distribution</div>
        <table>
            <thead>
                <tr>
                    <th width="60%">Agency Name</th>
                    <th width="20%" class="text-right">Project Count</th>
                    <th width="20%" class="text-right">Portfolio Share</th>
                </tr>
            </thead>
            <tbody>
                ${fundingTypeData.slice(0, 8).map((f) => {
        const share = overview.total_projects > 0 ? ((f.value / overview.total_projects) * 100).toFixed(1) : "0";
        return `
                    <tr>
                        <td class="bold">${f.name}</td>
                        <td class="text-right">${f.value}</td>
                        <td class="text-right" style="color: #2563eb; font-weight: 700;">${share}%</td>
                    </tr>
                  `;
    }).join('')}
            </tbody>
        </table>

        <div class="section-title">Institutional Portfolio Breakdown</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
                <h4 style="font-size: 9pt; color: #64748b; margin-bottom: 8px;">RESEARCH PROJECTS</h4>
                <table>
                    <tr><td>Active / Ongoing</td><td class="bold text-right">${researchStats.ongoing}</td></tr>
                    <tr><td>Pipeline / Submitted</td><td class="bold text-right">${researchStats.submitted}</td></tr>
                    <tr style="background: #f8fafc;"><td class="bold">Total Research</td><td class="bold text-right" style="color: #2563eb;">${researchStats.total}</td></tr>
                </table>
            </div>
            <div>
                <h4 style="font-size: 9pt; color: #64748b; margin-bottom: 8px;">CONSULTANCY PROJECTS</h4>
                <table>
                    <tr><td>Active / Ongoing</td><td class="bold text-right">${consultancyStats.ongoing}</td></tr>
                    <tr><td>Pipeline / Submitted</td><td class="bold text-right">${consultancyStats.submitted}</td></tr>
                    <tr style="background: #f8fafc;"><td class="bold">Total Consultancy</td><td class="bold text-right" style="color: #7c3aed;">${consultancyStats.total}</td></tr>
                </table>
            </div>
        </div>

        <div class="section-title">Year-wise Pipeline Trend</div>
        <table>
            <thead>
                <tr>
                    <th>Financial Year</th>
                    <th class="text-right">Submitted</th>
                    <th class="text-right">Ongoing</th>
                    <th class="text-right">Total Activity</th>
                </tr>
            </thead>
            <tbody>
                ${projectStatusByYearData.map((y) => `
                    <tr>
                        <td class="bold">FY ${y.year}</td>
                        <td class="text-right">${y.submitted}</td>
                        <td class="text-right">${y.ongoing}</td>
                        <td class="text-right bold">${y.submitted + y.ongoing}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="section-title">Recent System Activity</div>
        <table>
            <thead>
                <tr>
                    <th>Project ID</th>
                    <th>Investigator</th>
                    <th>Date Registered</th>
                </tr>
            </thead>
            <tbody>
                ${recentProjects.slice(0, 4).map((p) => `
                    <tr>
                        <td style="font-family: monospace; font-size: 8pt;">${p.project_id}</td>
                        <td class="bold">${p.pi_name}</td>
                        <td style="color: #64748b;">${new Date(p.creation).toLocaleDateString("en-IN")}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div class="footer">
            <span>IIT Guwahati · Research & Development Operations</span>
            <span>Document IRD-2026-CONF</span>
            <span>Page 2 of 3</span>
        </div>
    </div>

    <!-- PAGE 3 -->
    <div class="page">
        <div class="watermark"><img src="${logoUrl}" alt="IITG Watermark"></div>
        <div class="section-title">Sanction Amount — Start vs End</div>
        <table>
            <thead>
                <tr>
                    <th width="40%">Financial Year</th>
                    <th width="30%" class="text-right">Project Start Amount</th>
                    <th width="30%" class="text-right">Project End Amount</th>
                </tr>
            </thead>
            <tbody>
                ${startEndSanctionData.length > 0 ? startEndSanctionData.map((d: any) => `
                    <tr>
                        <td class="bold">${d.year}</td>
                        <td class="amt-cell">${fmt(d.startAmount)}</td>
                        <td class="amt-cell">${fmt(d.endAmount)}</td>
                    </tr>
                `).join('') : `
                    <tr>
                        <td colspan="3" style="text-align: center; color: #94a3b8; padding: 20px;">No sanction data available</td>
                    </tr>
                `}
            </tbody>
        </table>

        <div class="footer">
            <span>IIT Guwahati · Research & Development Operations</span>
            <span>Document IRD-2026-CONF</span>
            <span>Page 3 of 3</span>
        </div>
    </div>

</body>
</html>
  `;
}