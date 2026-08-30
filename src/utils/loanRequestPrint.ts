import loanTemplate from "@/pages/printformat/loan_request_format.html?raw";
import { ToWords } from "to-words";

const toWords = new ToWords({ localeCode: "en-IN", converterOptions: { ignoreDecimal: false } });

const fmtNum = (val: any) => {
    const n = Number(val) || 0;
    return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtRupee = (val: any) => `₹ ${fmtNum(val)}`;

const computeAmountInWords = (amount: any): string => {
    const n = Number(amount);
    if (!n) return "-";
    try { return toWords.convert(n); } catch { return "-"; }
};

/** Build the fund breakup HTML table from the child table rows */
function buildFundBreakupTable(fundBreakupRows: any[]): string {
    if (!fundBreakupRows || fundBreakupRows.length === 0) {
        return `<p style="font-size:9pt;color:#888;font-style:italic;">No fund breakup entries.</p>`;
    }

    const total = fundBreakupRows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

    const rows = fundBreakupRows.map((row, idx) => `
        <tr>
            <td style="text-align:center;">${idx + 1}</td>
            <td>${row.account_head_label || row.account_head || "-"}</td>
            <td style="text-align:right;">${fmtRupee(row.amount)}</td>
        </tr>`).join("");

    return `
    <table class="breakup-table">
        <thead>
            <tr>
                <th style="width:6%;">#</th>
                <th style="width:72%;">Account Head</th>
                <th style="width:22%; text-align:right;">Amount (₹)</th>
            </tr>
        </thead>
        <tbody>
            ${rows}
        </tbody>
        <tfoot>
            <tr>
                <td colspan="2" style="text-align:right; font-weight:bold;">Total</td>
                <td style="text-align:right;">${fmtRupee(total)}</td>
            </tr>
        </tfoot>
    </table>`;
}

/** Extract activity log rows from the floating activity log DOM element */
function buildActivityLog(activityEl: HTMLElement | null): { html: string; count: number } {
    let activityRows = "<tr><td colspan='3' style='text-align:center;color:#888;font-style:italic;'>No activity recorded.</td></tr>";
    let activityCount = 0;

    if (activityEl) {
        const allItems = Array.from(activityEl.querySelectorAll(".flex.items-start"));

        const extracted = allItems.map((item) => {
            const spans = item.querySelectorAll("span");
            const rawName = spans[1]?.textContent?.trim() || "";
            const designation = item.querySelector(".designation-text")?.textContent?.trim() || "";
            const name = designation
                ? `${rawName}<br><span class="designation">(${designation})</span>`
                : rawName;

            const timeRaw = item.querySelector("p.text-\\[11px\\]")?.textContent?.trim() || "";
            let timeStr = timeRaw;
            const parsedDt = new Date(timeRaw);
            if (!isNaN(parsedDt.getTime())) {
                const ds = parsedDt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                const ts = parsedDt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
                timeStr = `${ds}, ${ts}`;
            }

            const content = item.querySelector(".prose")?.innerHTML?.trim() || spans[2]?.textContent?.trim() || "";
            return { name, content, time: timeStr };
        });

        if (extracted.length > 0) {
            activityRows = extracted.map(e => `
                <tr>
                    <td>${e.name}</td>
                    <td>${e.content}</td>
                    <td style="white-space:nowrap;">${e.time}</td>
                </tr>`).join("");
            activityCount = extracted.length;
        }
    }

    const html = `
        <table class="activity-table">
            <thead>
                <tr>
                    <th>Approver</th>
                    <th>Comment</th>
                    <th>Time</th>
                </tr>
            </thead>
            <tbody>${activityRows}</tbody>
        </table>`;

    return { html, count: activityCount };
}

/** Main function: generates the full print HTML for a Loan Request */
export function generateLoanRequestHtml(
    data: Record<string, any>,
    resolvedApplicantName = "",
    resolvedDeptName = "",
    resolvedDesignation = "",
    resolvedProjectTitle = "",
    fundBreakupRows: any[] = [],
    activityEl: HTMLElement | null = null,
): string {
    // Date formatting
    const creation = data.creation
        ? new Date(data.creation).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : "";

    // "Loan For" beneficiary section (only if applying for someone else)
    let loanForSection = "";
    if (data.self_other === "Other" && (data.loan_for_webmail_id || data.loan_for_name)) {
        loanForSection = `
        <div class="section-title">Applying For (Beneficiary Details)</div>
        <table class="info-table">
            <tr>
                <td class="label">Name</td>
                <td>${data.loan_for_name || "-"}</td>
                <td class="label">Webmail</td>
                <td>${data.loan_for_webmail_id || "-"}</td>
            </tr>
            <tr>
                <td class="label">Department</td>
                <td>${data.loan_for_department || "-"}</td>
                <td class="label">Designation</td>
                <td>${data.loan_for_designation || "-"}</td>
            </tr>
        </table>`;
    }

    // Comments section
    const commentsSection = data.comments_if_any
        ? `<div class="section-title">Comments</div><div class="remarks">${data.comments_if_any}</div>`
        : "";

    const { html: activityHtml, count: activityCount } = buildActivityLog(activityEl);
    const fundBreakupHtml = buildFundBreakupTable(fundBreakupRows);
    const applicantName = resolvedApplicantName || data.applicant_name || data.owner || "";

    const currentTime = new Date().toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
    });

    return loanTemplate
        .replace(/\{\{DOC_REF\}\}/g,           data.name || "")
        .replace("{{WORKFLOW_STATE}}",          data.workflow_state || "Draft")
        .replace("{{DATE}}",                   creation)
        .replace("{{APPLICANT_NAME}}",         applicantName)
        .replace("{{APPLICANT_WEBMAIL}}",      data.applicant_webmail || data.owner || "-")
        .replace("{{APPLICANT_DEPARTMENT}}",   resolvedDeptName || data.applicant_department || "-")
        .replace("{{APPLICANT_DESIGNATION}}",  resolvedDesignation || data.applicant_designation || "-")
        .replace("{{PROJECT_TITLE}}",          resolvedProjectTitle || data.project_title || data.project_name || "-")
        .replace(/\{\{PROJECT_NUMBER\}\}/g,    data.project_number || "-")
        .replace("{{SELF_OTHER}}",             data.self_other || "-")
        .replace("{{LOAN_FOR_SECTION}}",       loanForSection)
        .replace("{{LOAN_ACCOUNT_TYPE}}",      data.loan_account_type || "-")
        .replace("{{LOAN_AMOUNT}}",            fmtRupee(data.loan_amount))
        .replace("{{AMOUNT_IN_WORDS}}",        computeAmountInWords(data.loan_amount))
        .replace("{{FUND_BREAKUP_TABLE}}",     fundBreakupHtml)
        .replace("{{AGREEMENT_1_CLASS}}",      data.agreement_no_1 ? "checked" : "")
        .replace("{{AGREEMENT_2_CLASS}}",      data.agreement_no_2 ? "checked" : "")
        .replace("{{PROJECT_COPI}}",           data.project_copi || "-")
        .replace("{{COMMENTS_SECTION}}",       commentsSection)
        .replace("{{ACTIVITY_COUNT}}",         String(activityCount))
        .replace("{{ACTIVITY_LOG_SECTION}}",   activityHtml)
        .replace("{{CURRENT_TIME}}",           currentTime);
}
