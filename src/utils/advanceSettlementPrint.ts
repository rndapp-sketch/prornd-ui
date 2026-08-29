import tempTemplate from "@/pages/printformat/advance_settlement_format.html?raw";
import { ToWords } from "to-words";

// Activity Log will be generated inline via DOM scraping.

const toWords = new ToWords({ localeCode: "en-IN", converterOptions: { ignoreDecimal: false } });

const fmtNum = (val: any) => {
    const n = Number(val) || 0;
    return n.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const computeAmountInWords = (data: Record<string, any>): string => {
    if (data.amount_in_words) return data.amount_in_words;
    const n = Number(data.amount);
    if (!n) return "-";
    try { return toWords.convert(n); } catch { return "-"; }
};

import { getFileUrl } from "@/utils/fileUtils";

export function generateAdvanceSettlementHtml(
    data: Record<string, any>,
    resolvedProjectTitle: string,
    resolvedAccountHead: string,
    resolvedApplicantName = "",
    activityEl: HTMLElement | null = null,
): string {
    const creation = data.creation
        ? new Date(data.creation).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        })
        : "";

    // Generate Expenditure Table
    const expenditureRows =
      data.expenditure_details
        ?.map(
          (item: any, index: number) => {
            return `
            <tr>
                <td style="text-align: center;">${index + 1}</td>
                <td>${item.expenditure_date ? new Date(item.expenditure_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-"}</td>
                <td>${item.vendors_name || item.vendor_name || "-"}</td>
                <td>${item.description || item.particulars || "-"}</td>
                <td style="text-align: right;">${(parseFloat(item.amount || item.amount_in_rs) || 0).toLocaleString("en-IN")}</td>
            </tr>
        `;}
        )
        .join("") ||
      '<tr><td colspan="5" style="text-align: center;">No items</td></tr>';

    const expenditureTableHtml = `
      <table class="info-table" style="margin-top: 4px;">
          <thead>
              <tr>
                  <th style="width: 5%;">Sl No.</th>
                  <th style="width: 15%;">Date</th>
                  <th style="width: 20%;">Vendor Name</th>
                  <th>Particulars</th>
                  <th style="width: 15%; text-align: right;">Amount (Rs.)</th>
              </tr>
          </thead>
          <tbody>
              ${expenditureRows}
              <tr>
                  <td colspan="4" class="label-bg" style="text-align: left !important;">Total Settlement</td>
                  <td class="text-right label-bg" align="right">${(data.total_amount || 0).toLocaleString("en-IN")}</td>
              </tr>
          </tbody>
      </table>
    `;
    
    let activityRows = "<tr><td colspan='3' style='text-align:center;color:#888;font-style:italic;'>No activity recorded.</td></tr>";
    let activityCount = 0;

    if (activityEl) {
        const allItems = Array.from(activityEl.querySelectorAll(".flex.items-start"));
        
        const extracted = allItems.map((item) => {
            const spans = item.querySelectorAll("span");
            const rawName = spans[1]?.textContent?.trim() || "";
            let name = rawName;
            const designation = item.querySelector(".designation-text")?.textContent?.trim() || "";
            if (designation) {
                name = `${rawName} <br><span class="designation">(${designation})</span>`;
            }
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
            activityRows = extracted.map(
                (e) => `
                    <tr>
                        <td>${e.name}</td>
                        <td>${e.content}</td>
                        <td style="white-space:nowrap;">${e.time}</td>
                    </tr>`
            ).join("");
            activityCount = extracted.length;
        }
    }
    
    const finalActivityHtml = `
        <table class="activity-table">
            <thead>
                <tr>
                    <th>Approver</th>
                    <th>Comment</th>
                    <th>Time</th>
                </tr>
            </thead>
            <tbody>
                ${activityRows}
            </tbody>
        </table>`;

    // Gather attachments for the end of the document
    const uploadItems = data.expenditure_details?.filter((item: any) => {
        return item.attachment || item.attachments || item.uploads || item.attachments_optional || item.upload || item.file || item.document || item.receipt;
    }) || [];

    let attachmentsHtml = "";
    if (uploadItems.length > 0) {
        const attachmentRows = uploadItems.map((item: any) => {
            const attachment = item.attachment || item.attachments || item.uploads || item.attachments_optional || item.upload || item.file || item.document || item.receipt;
            const fileName = attachment.split('/').pop() || "Attachment";
            return `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px; font-weight:bold; font-family:sans-serif; color:#333; font-size: 13px;">${fileName}</td>
              <td style="padding: 12px; text-align:right;">
                <a href="${getFileUrl(attachment)}" target="_blank" style="display:inline-block; padding:10px 24px; background:#2563eb; color:white; text-decoration:none; border-radius:6px; font-weight:bold; font-family:sans-serif; font-size: 13px;">Print Attached File</a>
              </td>
            </tr>
          `;
        }).join("");

        attachmentsHtml = `
            <div class="hide-on-print" style="margin-top: 30px; page-break-inside: avoid;">
                <div class="section-title" style="margin-bottom: 10px;">Attachments</div>
                <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border: 1px solid #e2e8f0;">
                    <tbody>
                        ${attachmentRows}
                    </tbody>
                </table>
            </div>
        `;
    }

    const cleanHtml = tempTemplate
        .replace("{{DOC_REF}}", data.name || "")
        .replace("{{WORKFLOW_STATE}}", data.workflow_state || "")
        .replace("{{DATE}}", creation)
        .replace("{{PROJECT_CODE}}", data.project_code || "")
        .replace("{{ACCOUNT_HEAD}}", resolvedAccountHead || data.account_head || "")
        .replace("{{PROJECT_TITLE}}", resolvedProjectTitle || "")
        .replace("{{TEMP_ADVANCE_REF}}", data.temporary_advance_application || "-")
        .replace("{{TOTAL_AMOUNT}}", `₹ ${(data.total_amount || 0).toLocaleString("en-IN")}`)
        .replace("{{APPLICANT_NAME}}", resolvedApplicantName || data.owner || "")
        .replace("{{APPLICANT_WEBMAIL}}", data.applicant_webmail || data.owner || "")
        .replace("{{APPLICANT_DEPARTMENT}}", data.applicant_department || "-")
        .replace("{{APPLICANT_DESIGNATION}}", data.applicant_designation || "-")
        .replace("{{ACCOUNT_HOLDER}}", data.bank_account_holders_name || "-")
        .replace("{{ACCOUNT_NUMBER}}", data.bank_account_number || "-")
        .replace("{{EXPENDITURE_TABLE}}", expenditureTableHtml)
        .replace("{{ACTIVITY_COUNT}}", String(activityCount))
        .replace("{{ACTIVITY_LOG_SECTION}}", finalActivityHtml + attachmentsHtml)
        .replace("{{CURRENT_TIME}}", new Date().toLocaleString("en-IN", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit", hour12: true
        }));

    return cleanHtml;
}
