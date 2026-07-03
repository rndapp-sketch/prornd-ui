import igfTemplate from "@/pages/printformat/igf_format.html?raw";

export interface ActivityItem {
    owner: string;
    creation: string;
    content: string;
    comment_type?: string;
}

function buildActivityLogHtml(items: ActivityItem[], formData: Record<string, any>): string {
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
        return '<div class="activity-log"><em style="color:#888;font-size:12px;">No activity yet.</em></div>';
    }

    const sorted = [...allItems].sort(
        (a, b) => new Date(a.creation).getTime() - new Date(b.creation).getTime(),
    );

    const entries = sorted.map((c) => {
        const dt = c.creation ? new Date(c.creation) : null;
        const dateStr = dt
            ? dt.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })
            : "";
        const timeStr = dt
            ? dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
            : "";
        const label = c.comment_type === "Creation" ? "created document" : "";
        const plainContent = (c.content || "").replace(/<[^>]*>/g, "").trim();
        return `<div class="activity-entry">
            <div class="activity-meta"><strong>${c.owner}</strong>${label ? `&nbsp;&middot;&nbsp;${label}` : ""}&nbsp;&middot;&nbsp;${dateStr}${timeStr ? ", " + timeStr : ""}</div>
            ${plainContent ? `<div class="activity-content">${plainContent}</div>` : ""}
        </div>`;
    }).join("");

    return `<div class="activity-log">${entries}</div>`;
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

    return igfTemplate
        .replace("{{DOC_REF}}", esc(formData.name))
        .replace("{{DATE}}", esc(creationDate))
        .replace("{{INDENTER_NAME}}", esc(formData.igf_indenter))
        .replace("{{INDENTER_DESIGNATION}}", esc(formData.igf_indenter_designation))
        .replace("{{EMPLOYEE_CODE}}", esc(formData.igf_employee_code))
        .replace("{{WEBMAIL_ID}}", esc(formData.igf_webmail_user_id))
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
        .replace("{{DECLARATION_SECTION}}", declarationSection)
        .replace("{{ACTIVITY_LOG_SECTION}}", buildActivityLogHtml(activityItems, formData));
}
