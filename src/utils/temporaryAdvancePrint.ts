import tempTemplate from "@/pages/printformat/temporary_advance_format.html?raw";
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

export function generateTemporaryAdvanceHtml(
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

    let beneficiarySection = "";
    if (data.advance_for_id || data.advance_for_department || data.advance_for_designation) {
        beneficiarySection = `
        <div class="section-title">Beneficiary Details</div>
        <table class="info-table">
            <tr>
                <td class="label">Beneficiary ID</td>
                <td>${data.advance_for_id || "-"}</td>
                <td class="label">Department</td>
                <td>${data.advance_for_department || "-"}</td>
            </tr>
            <tr>
                <td class="label">Designation</td>
                <td colspan="3">${data.advance_for_designation || "-"}</td>
            </tr>
        </table>
        `;
    }

    const indenterName = resolvedApplicantName || data.applicant_name || data.owner || "";
    
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
                    <th>Approver (Name &amp; Designation)</th>
                    <th>Comment</th>
                    <th>Time</th>
                </tr>
            </thead>
            <tbody>
                ${activityRows}
            </tbody>
        </table>`;

    const cleanHtml = tempTemplate
        .replace("{{DOC_REF}}", data.name || "")
        .replace("{{WORKFLOW_STATE}}", data.workflow_state || "")
        .replace("{{DATE}}", creation)
        .replace("{{PROJECT_CODE}}", data.project_code || "")
        .replace("{{ACCOUNT_HEAD}}", resolvedAccountHead || data.account_head || "")
        .replace("{{PROJECT_TITLE}}", resolvedProjectTitle || "")
        .replace("{{ADVANCE_AMOUNT}}", `₹ ${fmtNum(data.amount)}`)
        .replace("{{APPLYING_FOR}}", data.applying_for_select || "-")
        .replace("{{AMOUNT_IN_WORDS}}", computeAmountInWords(data))
        .replace("{{APPLICANT_NAME}}", indenterName)
        .replace("{{APPLICANT_WEBMAIL}}", data.applicant_webmail || data.owner || "")
        .replace("{{APPLICANT_DEPARTMENT}}", data.applicant_department || "-")
        .replace("{{APPLICANT_DESIGNATION}}", data.applicant_designation || "-")
        .replace("{{APPLICANT_CATEGORY}}", data.applicant_category || "-")
        .replace("{{BENEFICIARY_SECTION}}", beneficiarySection)
        .replace("{{BANK_NAME}}", data.bank_name || "-")
        .replace("{{ACCOUNT_HOLDER}}", data.account || "-")
        .replace("{{ACCOUNT_NUMBER}}", data.bank_account_number || "-")
        .replace("{{IFSC_CODE}}", data.ifsc_code || "-")
        .replace("{{JUSTIFICATION}}", data.justification || data.reason || data.purpose || data.comments || "-")
        .replace("{{ACTIVITY_COUNT}}", String(activityCount))
        .replace("{{ACTIVITY_LOG_SECTION}}", finalActivityHtml)
        .replace("{{CURRENT_TIME}}", new Date().toLocaleString("en-IN", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit", hour12: true
        }));

    return cleanHtml;
}
