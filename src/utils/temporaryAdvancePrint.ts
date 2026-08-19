import tempTemplate from "@/pages/printformat/temporary_advance_format.html?raw";
import { ToWords } from "to-words";

import type { ActivityItem } from "@/utils/disbursalOfHonorariumPrint";

// The .html?raw template is static text pulled in at build time, so it can't
// reference import.meta.env itself; substitute the asset host here instead.
const ASSET_HOST = import.meta.env.VITE_ASSET_HOST || "172.16.117.39";
const ASSET_PORT = import.meta.env.VITE_ASSET_PORT || "8000";

function buildActivityLogHtml(items: ActivityItem[]): string {
    const filtered = (items || []).filter(
        (c) =>
            c.owner !== "Administrator" &&
            (!c.comment_type || c.comment_type === "Comment"),
    );

    if (!filtered.length) {
        return '<div class="activity-log"><em style="color:#888;font-size:12px;">No activity comments.</em></div>';
    }

    const entries = filtered
        .map((c) => {
            const dt = c.creation ? new Date(c.creation) : null;
            const dateStr = dt
                ? dt.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })
                : "";
            const timeStr = dt
                ? dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
                : "";
            const plainContent = (c.content || "").replace(/<[^>]*>/g, "").trim();
            return `<div class="activity-entry">
            <div class="activity-meta"><strong>${c.owner}</strong>&nbsp;&middot;&nbsp;${dateStr}${timeStr ? ", " + timeStr : ""}</div>
            <div class="activity-content">${plainContent}</div>
        </div>`;
        })
        .join("");

    return `<div class="activity-log">${entries}</div>`;
}

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
    activityItems: ActivityItem[] = [],
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

    const cleanHtml = tempTemplate
        .replace(/http:\/\/172\.16\.117\.39:8000/g, `http://${ASSET_HOST}:${ASSET_PORT}`)
        .replace("{{DOC_REF}}", data.name || "")
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
        .replace("{{ACTIVITY_LOG_SECTION}}", buildActivityLogHtml(activityItems));

    return cleanHtml;
}
