import igfTemplate from "@/pages/printformat/igf_format.html?raw";

// The .html?raw template is static text pulled in at build time, so it can't
// reference import.meta.env itself; substitute the asset host here instead.
const ASSET_HOST = import.meta.env.VITE_ASSET_HOST || "172.16.117.39";
const ASSET_PORT = import.meta.env.VITE_ASSET_PORT || "8000";

export interface ActivityItem {
    owner: string;
    creation: string;
    content: string;
    comment_type?: string;
}

function buildActivityLogHtml(items: ActivityItem[], formData: Record<string, any>): string {
    // Include all comment types except system Administrator entries
    const allItems = [...(items || [])].filter((c) => c.owner !== "Administrator");

    // Inject creation entry if not already present
    const hasCreation = allItems.some((i) => i.comment_type === "Creation");
    if (!hasCreation && formData.creation && formData.owner) {
        allItems.push({
            owner: formData.owner,
            creation: formData.creation,
            content: "",
            comment_type: "Creation",
        });
    }

    if (!allItems.length) {
        return '<table class="activity-table"><tr><td colspan="3" style="text-align: center; color: #888;">No activity yet.</td></tr></table>';
    }

    const sorted = [...allItems].sort(
        (a, b) => new Date(a.creation).getTime() - new Date(b.creation).getTime(),
    );

    // Strip HTML tags and decode basic HTML entities
    const stripHtml = (html: string): string =>
        html
            .replace(/<[^>]*>/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&nbsp;/g, " ")
            .replace(/\s+/g, " ")
            .trim();

    const activityRows = sorted.map((c: any) => {
        const dt = c.creation ? new Date(c.creation) : null;
        const dateStr = dt
            ? dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
            : "";
        const timeStr = dt
            ? dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
            : "";

        // Determine display name: prefer comment_by, then owner
        const displayName = (c.comment_by || c.owner || "").trim();

        // Determine comment text
        const rawContent = stripHtml(c.content || "");

        let commentText = rawContent;
        if (!commentText) {
            if (c.comment_type === "Creation") commentText = "created document";
            else if (c.comment_type === "Workflow") commentText = c.data || "workflow action";
            else if (c.comment_type === "Approval") commentText = "approved";
            else if (c.comment_type === "Submission") commentText = "submitted";
            else if (c.comment_type === "Cancelled") commentText = "cancelled";
            else commentText = c.comment_type || "—";
        }

        return `
            <tr>
                <td>${esc(displayName)}</td>
                <td>${esc(commentText)}</td>
                <td style="white-space:nowrap;">${dateStr}${timeStr ? ", " + timeStr : ""}</td>
            </tr>`;
    }).join("");

    return `
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
}

const fmt = (val: any): string => {
    const n = Number(val);
    if (!val && val !== 0) return "—";
    if (isNaN(n)) return String(val);
    return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const esc = (s: any): string =>
    String(s ?? "—")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

export function generateIgfPrintHtml(
    formData: Record<string, any>,
    resolvedDept: string,
    resolvedAccountHead: string,
    resolvedProjectTitle: string,
    activityItems: ActivityItem[] = [],
): string {
    const items: any[] = Array.isArray(formData.igf_items) ? formData.igf_items : [];
    const committee: any[] = Array.isArray(formData.igf_committee_members) ? formData.igf_committee_members : [];

    const creationDate = formData.creation
        ? new Date(formData.creation).toLocaleDateString("en-IN", {
            day: "2-digit", month: "2-digit", year: "numeric",
        })
        : new Date().toLocaleDateString("en-IN", {
            day: "2-digit", month: "2-digit", year: "numeric",
        });

    const itemRows = items.map((row, i) => {
        const qty = Number(row.igf_quantity ?? row.quantity ?? 0);
        const rate = Number(row.igf_estimated_rate ?? row.estimated_rate ?? 0);
        const total = row.igf_total ?? row.total ?? (qty * rate);
        return `<tr>
            <td class="center">${i + 1}</td>
            <td>${esc(row.igf_item_name ?? row.item_name)}</td>
            <td>${esc(row.igf_item_description ?? row.description)}</td>
            <td class="center">${esc(row.igf_quantity ?? row.quantity)}</td>
            <td class="right">${fmt(rate)}</td>
            <td class="right">${fmt(total)}</td>
        </tr>`;
    }).join("");

    const sanctionedRow = formData.igf_sanctioned_by_agency
        ? `<tr>
            <td class="label">Sanctioned by Agency</td>
            <td colspan="3">${esc(formData.igf_sanctioned_by_agency)}</td>
          </tr>`
        : "";

    const committeeSection = committee.length > 0
        ? `<div class="section-title">Purchase Committee</div>
           <table class="item-table">
               <colgroup><col style="width:50%"/><col style="width:50%"/></colgroup>
               <thead><tr><th>Member Name</th><th>Designation</th></tr></thead>
               <tbody>${committee.map((m) => `<tr>
                   <td>${esc(m.igf_member_name ?? m.member_name)}</td>
                   <td>${esc(m.igf_designation ?? m.designation ?? m.igf_member_designation)}</td>
               </tr>`).join("")}</tbody>
           </table>`
        : "";

    // igf_declaration_text is a Read Only non-stored field; igf_decl_inr_confirmation is the actual check
    const declConfirmed = Boolean(Number(formData.igf_decl_inr_confirmation || 0));
    const declarationSection = declConfirmed
        ? `<div class="section-title">Declaration</div>
           <div style="border:1px solid #000;padding:8px 10px;font-size:12.5px;line-height:1.6;margin-bottom:15px;">
               &#9745; I hereby confirm that the amount stated above is in Indian Rupees (INR) and the details provided are true and correct to the best of my knowledge.
           </div>`
        : "";

    let webmailId = formData.igf_webmail_user_id || "";
    if (webmailId && !webmailId.includes("@")) {
        webmailId += "@iitg.ac.in";
    }

    const cleanHtml = igfTemplate
        .replace(/http:\/\/172\.16\.117\.39:8000/g, `http://${ASSET_HOST}:${ASSET_PORT}`)
        .replace("{{DOC_REF}}", esc(formData.name))
        .replace("{{DATE}}", esc(creationDate))
        .replace("{{INDENTER_NAME}}", esc(formData.igf_indenter))
        .replace("{{INDENTER_DESIGNATION}}", esc(formData.igf_indenter_designation))
        .replace("{{EMPLOYEE_CODE}}", esc(formData.igf_employee_code))
        .replace("{{WEBMAIL_ID}}", esc(webmailId))
        .replace("{{DEPARTMENT}}", esc(resolvedDept || formData.igf_department_centre_section))
        .replace("{{PROJECT_CODE}}", esc(formData.igf_project_code))
        .replace("{{ACCOUNT_HEAD}}", esc(resolvedAccountHead || formData.igf_account_head))
        .replace("{{PROJECT_TITLE}}", esc(resolvedProjectTitle || formData.igf_project_title))
        .replace("{{ITEM_ROWS}}", itemRows || '<tr><td colspan="6" class="center" style="color:#888">No items</td></tr>')
        .replace("{{TOTAL_ESTIMATE}}", fmt(formData.igf_total_estimate))
        .replace("{{TENDER_TYPE}}", esc(formData.igf_tender_type))
        .replace("{{NUMBER_OF_BIDS}}", esc(formData.igf_number_of_bids))
        .replace("{{SANCTIONED_ROW}}", sanctionedRow)
        .replace("{{COMMITTEE_SECTION}}", committeeSection)
        .replace("{{DECLARATION_SECTION}}", declarationSection);

    // Extract Attachments
    const attachments: { name: string, url: string }[] = [];
    
    // 1. Explicit fields
    if (formData.igf_upload_detailed_specification) {
        const url = formData.igf_upload_detailed_specification;
        attachments.push({ name: url.split('/').pop() || "Detailed Specification", url });
    }
    if (formData.igf_upload_vendor_list) {
        const url = formData.igf_upload_vendor_list;
        attachments.push({ name: url.split('/').pop() || "Vendor List", url });
    }

    // 2. Parse from Activity Log (Frappe standard attachments)
    activityItems?.forEach(item => {
        if (item.content && item.content.includes("href=") && (item.content.includes("Attachment") || item.content.includes("fa-lock"))) {
            // Very simple extraction of href and text
            const match = item.content.match(/href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/i);
            if (match) {
                // Ensure we don't duplicate
                if (!attachments.some(a => a.url === match[1])) {
                    attachments.push({ name: match[2].trim() || match[1].split('/').pop() || "Attachment", url: match[1] });
                }
            }
        }
    });

    // Build each attachment as a standalone printable row with its own button
    let attachmentsHtml = "";
    if (attachments.length > 0) {
        const attachmentRows = attachments.map((att) => {
            const proxyUrl = att.url.startsWith("/files/")
                ? `/prod-rnd-files${att.url}`
                : att.url.startsWith("http")
                    ? att.url
                    : `/prod-rnd-files${att.url}`;
            // onclick: open file in new tab — user can Ctrl+P from there
            return `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px; font-weight:bold; font-family:sans-serif; color:#333; font-size: 13px;">${att.name}</td>
              <td style="padding: 12px; text-align:right;">
                <a href="${proxyUrl}" target="_blank"
                   style="display:inline-block; padding:10px 24px; background:#2563eb; color:white; text-decoration:none; border-radius:6px; font-weight:bold; font-family:sans-serif; font-size: 13px;">
                  Print Attached File
                </a>
              </td>
            </tr>`;
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

    return cleanHtml
        .replace("{{ACTIVITY_LOG_SECTION}}", buildActivityLogHtml(activityItems, formData))
        .replace("{{ATTACHMENTS_SECTION}}", attachmentsHtml);
}
