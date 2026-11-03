import ucTemplateRaw from "@/pages/printformat/uc_request_format.html?raw";
import { withFrappeBase } from "@/utils/frappeUrl";
import { buildActivityLog } from "@/utils/loanRequestPrint";
import { ToWords } from "to-words";

const ucTemplate = withFrappeBase(ucTemplateRaw);
const toWords = new ToWords({ localeCode: "en-IN", converterOptions: { ignoreDecimal: false } });

/** Attach fields of a UC Request, in the order they are printed. */
export const UC_ATTACHMENT_FIELDS: { field: string; label: string }[] = [
    { field: "prev_uc", label: "Previous UC" },
    { field: "uc_format", label: "UC Format" },
    { field: "staff_prepared_uc", label: "UC Prepared by R&D Office" },
    { field: "registrar_signed_uc", label: "Registrar Verified UC" },
];

export const getUcAttachments = (data: Record<string, any>) =>
    UC_ATTACHMENT_FIELDS
        .filter(({ field }) => typeof data[field] === "string" && data[field].trim())
        .map(({ field, label }) => ({ label, url: data[field] as string }));

const esc = (v: any) =>
    String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const orDash = (v: any) => (v ? esc(v) : "-");

const fmtDate = (v: any) =>
    v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";

const fmtDateTime = (v: any) =>
    v
        ? new Date(v).toLocaleString("en-IN", {
              day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
          })
        : "-";

const fmtRupee = (v: any) =>
    `₹ ${(Number(v) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const amountInWords = (v: any) => {
    const n = Number(v);
    if (!n) return "-";
    try { return toWords.convert(n); } catch { return "-"; }
};

function buildDocumentsTable(data: Record<string, any>): string {
    const rows = UC_ATTACHMENT_FIELDS.map(({ field, label }, idx) => {
        const url = data[field];
        const name = typeof url === "string" && url ? esc(decodeURIComponent(url.split("/").pop() || "")) : "";
        return `
        <tr>
            <td style="text-align:center;">${idx + 1}</td>
            <td>${esc(label)}</td>
            <td>${name || '<span style="color:#888;font-style:italic;">Not uploaded</span>'}</td>
        </tr>`;
    }).join("");

    return `
    <table class="breakup-table">
        <thead>
            <tr>
                <th style="width:6%;">#</th>
                <th style="width:40%;">Document</th>
                <th>File</th>
            </tr>
        </thead>
        <tbody>${rows}</tbody>
    </table>`;
}

/** Print HTML for a UC Request. `activityEl` is the hidden ActivityLog container. */
export function generateUcHtml(
    data: Record<string, any>,
    resolvedDeptName = "",
    activityEl: HTMLElement | null = null,
): string {
    const { html: activityHtml, count: activityCount } = buildActivityLog(activityEl);

    const commentsSection = data.uc_comment_if_any
        ? `<div class="section-title">Comments</div><div class="remarks">${esc(data.uc_comment_if_any)}</div>`
        : "";

    const registrarRow = data.uc_type === "Audited UC"
        ? `<tr>
                <td class="label">Sent to Registrar On</td>
                <td>${fmtDateTime(data.hos_printed_on)}</td>
                <td class="label">Registrar Verified Copy</td>
                <td>${data.registrar_signed_uc ? "Received" : "Awaited"}</td>
           </tr>`
        : "";

    const currentTime = new Date().toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
    });

    return ucTemplate
        .replace(/\{\{DOC_REF\}\}/g,          esc(data.name))
        .replace("{{WORKFLOW_STATE}}",         esc(data.workflow_state || "Draft"))
        .replace("{{DATE}}",                   fmtDate(data.creation))
        .replace("{{PROJECT_NUMBER}}",         orDash(data.project_no))
        .replace("{{PROJECT_TITLE}}",          orDash(data.project_title))
        .replace("{{PI_NAME}}",                orDash(data.principal_investigator_name))
        .replace("{{PI_WEBMAIL}}",             orDash(data.pi_webmail))
        .replace("{{DEPARTMENT}}",             orDash(resolvedDeptName || data.implementation_department))
        .replace("{{FUNDING_AGENCY}}",         orDash(data.funding_agency_name))
        .replace("{{SCHEME}}",                 orDash(data.funding_agency_scheme))
        .replace("{{SANCTION_LETTER_NO}}",     orDash(data.sanctioned_letter_no))
        .replace("{{SANCTION_LETTER_DATE}}",   fmtDate(data.sanctioned_letter_date))
        .replace("{{START_DATE}}",             fmtDate(data.prj_start_date))
        .replace("{{END_DATE}}",               fmtDate(data.prj_end_date))
        .replace("{{APPLICANT_NAME}}",         orDash(data.pi_name || data.principal_investigator_name))
        .replace("{{UC_TYPE}}",                orDash(data.uc_type))
        .replace("{{SANCTION_AMOUNT}}",        fmtRupee(data.total_sanction_amount))
        .replace("{{AMOUNT_IN_WORDS}}",        amountInWords(data.total_sanction_amount))
        .replace("{{DOCUMENTS_TABLE}}",        buildDocumentsTable(data))
        .replace("{{COMMENTS_SECTION}}",       commentsSection)
        .replace("{{PI_VERIFIED_BY}}",         orDash(data.pi_verified_by))
        .replace("{{PI_VERIFIED_ON}}",         fmtDateTime(data.pi_verified_on))
        .replace("{{REGISTRAR_ROW}}",          registrarRow)
        .replace("{{ACTIVITY_COUNT}}",         String(activityCount))
        .replace("{{ACTIVITY_LOG_SECTION}}",   activityHtml)
        .replace("{{CURRENT_TIME}}",           currentTime);
}
