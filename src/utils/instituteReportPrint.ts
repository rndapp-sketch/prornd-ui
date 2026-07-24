export function generateInstituteReportHtml(
    projects: any[], 
    reportType: string, 
    getDeptName?: (id: string) => string,
    getPiName?: (email: string) => string,
    getAgency?: (p: any) => string,
    printedBy: string = "System User"
): string {
    const now = new Date();
    const liveDate = now.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
    const liveTime = now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
    });

    const formatCurrency = (amount: any) => {
        const num = Number(amount) || 0;
        return `₹ ${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "—";
        return new Date(dateStr).toLocaleDateString("en-IN", {
            day: "2-digit", month: "short", year: "numeric",
        });
    };

    const calculateDuration = (start: string, end: string) => {
        if (!start || !end) return "—";
        const d1 = new Date(start);
        const d2 = new Date(end);
        const months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
        if (months <= 0) return "—";
        if (months < 12) return `${months} Months`;
        const years = Math.floor(months / 12);
        const rem = months % 12;
        return rem > 0 ? `${years}y ${rem}m` : `${years} Years`;
    };

    let tableRows = projects.map((p, index) => {
        const deptId = p.implementation_department || p.department;
        const deptName = getDeptName && deptId ? getDeptName(deptId) : (deptId || "—");
        
        const rawEmail = p.pi_webmail || p.pi_name || "";
        const resolvedName = getPiName && rawEmail ? getPiName(rawEmail) : "—";

        const agency = getAgency ? getAgency(p) : (p.select_funding_agency || p.funding_agency_name || p.funding_agency || p.origin_of_funding_agency || p.funding_agency_other || "—");

        return `
            <tr>
                <td style="text-align:center;">${index + 1}</td>
                <td><strong>${p.project_no || "—"}</strong></td>
                <td>
                    <div style="font-weight: bold; margin-bottom: 2px; font-size: 9pt;">${resolvedName}</div>
                    ${rawEmail && resolvedName.toLowerCase() !== rawEmail.toLowerCase() ? `<div style="font-size: 7.5pt; color: #52525b; margin-top: 2px;">${rawEmail}</div>` : ""}
                </td>
                <td>${deptName}</td>
                <td>${p.project_title || "—"}</td>
                <td style="text-align:center;">
                    <div style="font-size: 8pt; font-weight: bold; color: #334155;">${agency}</div>
                    ${p._normalizedScheme && p._normalizedScheme !== "—" ? `<div style="font-size: 7.5pt; color: #2563eb; margin-top: 2px;">${p._normalizedScheme}</div>` : ""}
                </td>
                <td style="text-align:right; font-weight: bold; color: #047857;">${formatCurrency(p.total_budget_amount || p.grand_total_proposal)}</td>
                <td style="text-align:center;">${formatDate(p._overrideStartDate || p.sanctioned_letter_date)}</td>
                <td style="text-align:center;">${formatDate(p.creation)}</td>
                <td style="text-align:center;">${
                    p.project_duration_months
                        ? (Number(p.project_duration_months) >= 12
                            ? (() => { const y = Math.floor(Number(p.project_duration_months)/12); const m = Number(p.project_duration_months)%12; return m > 0 ? `${y}y ${m}m` : `${y} Years`; })()
                            : `${p.project_duration_months} Months`)
                        : calculateDuration(p._overrideStartDate || p.sanctioned_letter_date, p.prj_end_date)
                }</td>
                <td style="text-align:center;">
                    ${p._printStatusHtml || "—"}
                </td>
            </tr>
        `;
    }).join("");

    if (projects.length === 0) {
        tableRows = `<tr><td colspan="11" style="text-align:center; padding: 20px;">No projects found matching the selected criteria.</td></tr>`;
    }

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${reportType} - IITG R&D</title>
    <style>
        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        body {
            margin: 0;
            padding: 0;
            font-family: "Times New Roman", Times, serif;
            font-size: 10pt;
            background: #ccc;
        }

        .page {
            width: 297mm; /* Landscape A4 */
            min-height: 209mm;
            margin: 20px auto;
            background: #fff;
            position: relative;
            box-shadow: 0 0 12px rgba(0,0,0,0.3);
            padding: 15mm;
        }

        .no-print-bar {
            background: #1e293b; color: white; padding: 12px 24px;
            display: flex; justify-content: space-between; align-items: center;
            font-family: sans-serif; font-size: 14px;
        }

        .btn-print {
            background: #2563eb; color: white; border: none; padding: 8px 16px;
            border-radius: 6px; font-weight: 700; cursor: pointer;
        }

        @media print {
            body {
                background-color: #fff;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .page { margin: 0; width: 100%; min-height: auto; box-shadow: none; padding: 15mm; }
            .no-print-bar { display: none !important; }
            @page { size: A4 landscape; margin: 15mm; margin-top: 0; }
            thead { display: table-header-group; }
            tfoot { display: table-footer-group; }
            tr { page-break-inside: avoid; break-inside: avoid; }
        }

        #watermark { display: none; }

        /* HEADER */
        .header-row {
            display: flex;
            align-items: center;
            justify-content: center;
            border-bottom: 2px solid #000;
            padding-bottom: 12px;
            margin-bottom: 20px;
            position: relative;
        }
        .logo-left {
            position: absolute;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
        }
        .logo-left img {
            width: 80px;
            height: auto;
        }
        .header-center {
            text-align: center;
        }
        .header-hindi {
            font-size: 14pt;
            font-weight: bold;
            margin-bottom: 4px;
        }
        .header-english {
            font-size: 14pt;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 4px;
        }
        .header-sub {
            font-size: 12pt;
            font-weight: bold;
        }

        /* TITLE */
        .report-title {
            text-align: center;
            font-size: 14pt;
            font-weight: bold;
            text-transform: uppercase;
            text-decoration: underline;
            margin-bottom: 5px;
        }
        .report-meta {
            text-align: center;
            font-size: 10pt;
            margin-bottom: 20px;
            color: #333;
        }

        /* TABLE */
        table.data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9pt;
        }
        table.data-table th, table.data-table td {
            border: 1px solid #000;
            padding: 6px 8px;
            vertical-align: top;
        }
        table.data-table th {
            background-color: #f4f4f5;
            font-weight: bold;
            text-align: left;
            text-transform: uppercase;
            font-size: 8.5pt;
        }



    </style>
</head>
<body>

    <div class="no-print-bar">
        <span>${reportType} — Preview Mode</span>
        <button class="btn-print" onclick="window.print()">Print Report</button>
    </div>

    <div class="page">
        <!-- HEADER -->
        <div class="header-row">
            <div class="logo-left">
                <img src="http://172.16.117.39:8000/files/IITG_logo.png" alt="IITG" onerror="this.style.display='none'">
            </div>
            <div class="header-center">
                <div class="header-hindi">भारतीय प्रौद्योगिकी संस्थान गुवाहाटी</div>
                <div class="header-english">Indian Institute of Technology Guwahati</div>
                <div class="header-sub">Research and Development Section</div>
            </div>
        </div>

        <div class="report-title">${reportType}</div>
        <div class="report-meta">Generated on: ${liveDate} &nbsp;|&nbsp; Total Records: ${projects.length}</div>

        <table class="data-table">
            <thead>
                <!-- Custom Top Margin & Repeating Header (replaces browser header) -->
                <tr>
                    <td colspan="11" style="border: none; background: white; height: 12mm; vertical-align: bottom; padding: 0 0 8px 0;">
                        <span style="font-size: 10pt; font-family: sans-serif; font-weight: bold; color: #3F3F46;">
                            ${reportType} - IITG R&D
                        </span>
                    </td>
                </tr>
                <tr>
                    <th style="width: 3%;">Sl.</th>
                    <th style="width: 12%;">Project No.</th>
                    <th style="width: 10%;">PI Name</th>
                    <th style="width: 14%;">Department</th>
                    <th style="width: 20%;">Project Title</th>
                    <th style="width: 12%;">Funding Agency</th>
                    <th style="width: 8%; text-align:right;">Sanctioned (₹)</th>
                    <th style="width: 8%; text-align:center;">Start Date</th>
                    <th style="width: 8%; text-align:center;">Creation Date</th>
                    <th style="width: 7%; text-align:center;">Duration</th>
                    <th style="width: 8%; text-align:center;">Status</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
    </div>

</body>
</html>
    `;
}
