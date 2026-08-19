import docTemplate from "@/pages/printformat/disbursal_of_consultancy_format.html?raw";

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

const fmt = (val: any) => {
    const n = Number(val);
    if (!val && val !== 0) return "";
    if (isNaN(n)) return String(val);
    return n.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const fmtDate = (val: any) =>
    val
        ? new Date(val).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        })
        : "-";

export function generateDisbursalOfConsultancyHtml(
    formData: Record<string, any>,
    activityItems: ActivityItem[] = [],
): string {
    const rows: any[] = Array.isArray(formData.details_of_disbursal)
        ? formData.details_of_disbursal
        : [];

    const creation = formData.creation
        ? new Date(formData.creation).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        })
        : new Date().toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });

    const itemRows = rows
        .map(
            (row, i) => `
        <tr>
            <td class="center">${i + 1}</td>
            <td>${row.name1 || ""}</td>
            <td class="center">${row.disbursal_employee_student || ""}</td>
            <td>${row.designation || ""}</td>
            <td>${row.emp_id || ""}</td>
            <td>${row.disbursal_pdf_no_or_bank_account_no || ""}</td>
            <td class="right">${fmt(row.disbursal_amount)}</td>
            <td class="right">${fmt(row.disbursal_personal_share)}</td>
            <td class="right">${fmt(row.disbursal_institute_share)}</td>
        </tr>`,
        )
        .join("");

    return docTemplate
        .replace(/http:\/\/172\.16\.117\.39:8000/g, `http://${ASSET_HOST}:${ASSET_PORT}`)
        .replace("{{DOC_REF}}", formData.name || "")
        .replace("{{DATE}}", creation)
        .replace("{{PI_NAME}}", formData.pi_name || "")
        .replace("{{EMPLOYEE_ID}}", formData.employee_id || "-")
        .replace("{{PROJECT_TITLE}}", formData.project_title || "-")
        .replace("{{DATE_OF_REGISTRATION}}", fmtDate(formData.date_of_registration))
        .replace("{{DATE_OF_COMPLETION}}", fmtDate(formData.date_of_completion))
        .replace("{{TOTAL_AMOUNT_RECEIVED}}", fmt(formData.total_amount_received))
        .replace("{{CURRENT_BALANCE}}", fmt(formData.current_balance))
        .replace("{{ITEM_ROWS}}", itemRows)
        .replace("{{TOTAL_DISBURSAL_AMOUNT}}", fmt(formData.total_disbursal_amount))
        .replace("{{TOTAL_PERSONAL_SHARE}}", fmt(formData.total_personal_share))
        .replace("{{TOTAL_INSTITUTE_SHARE}}", fmt(formData.total_institute_share))
        .replace("{{IDF}}", fmt(formData.idf))
        .replace("{{DPF}}", fmt(formData.dpf))
        .replace("{{STAFF_WELFARE_FUND}}", fmt(formData.staff_welfare_fund))
        .replace("{{STUDENT_WELFARE_FUND}}", fmt(formData.student_welfare_fund))
        .replace("{{ACTIVITY_LOG_SECTION}}", buildActivityLogHtml(activityItems));
}