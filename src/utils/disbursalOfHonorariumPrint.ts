import dohTemplate from "@/pages/printformat/disbursal_of_honorarium_format.html?raw";
import { getFileUrl } from "@/utils/fileUtils";

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

function buildActivityLogHtml(items: ActivityItem[], formData?: Record<string, any>): string {
    const filtered = (items || []).filter(
        (c) =>
            c.owner !== "Administrator"
    );

    if (!filtered.length) {
        return `
<div class="section-heading" style="margin-top:8px;">Activity Log</div>
<table class="activity-table">
    <tbody>
        <tr><td colspan="3" style="text-align:center;color:#888;font-style:italic;">No activity recorded.</td></tr>
    </tbody>
</table>`;
    }

    const sorted = [...filtered].sort(
        (a, b) => new Date(a.creation).getTime() - new Date(b.creation).getTime(),
    );

    const rows = sorted
        .map((c) => {
            const dt = c.creation ? new Date(c.creation) : null;
            const dateStr = dt
                ? dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                : "";
            const timeStr = dt
                ? dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toLowerCase()
                : "";
            const plainContent = (c.content || "").replace(/<[^>]*>/g, "").trim();
            const label = c.comment_type === "Creation" ? "Submitted" : "";
            
            const time = dateStr ? `${dateStr}${timeStr ? ", " + timeStr : ""}` : "";
            const finalComment = plainContent || label || "-";

            // If the owner matches formData.owner and we resolved a name, use it
            let displayName = c.owner;
            if (formData && c.owner === formData.owner && formData.resolved_owner_name) {
                // If it resolved to "Arun (arun@iitg.ac.in)", let's just use it, or clean it up
                displayName = formData.resolved_owner_name.replace(/\s*\(.*\)$/, "");
            }

            return `
                    <tr>
                        <td>${displayName}</td>
                        <td>${finalComment}</td>
                        <td style="white-space:nowrap;">${time}</td>
                    </tr>`;
        })
        .join("");

    return `
<div class="section-heading" style="margin-top:8px;">Activity Log</div>
<table class="activity-table">
    <thead>
        <tr>
            <th>Approver</th>
            <th>Comment</th>
            <th>Time</th>
        </tr>
    </thead>
    <tbody>
        ${rows}
    </tbody>
</table>`;
}

// Builds activity HTML from get_document_activity entries (ActivityLogEntry format).
// Shows all entries (workflow, creation, comments) sorted by timestamp, with comment
// content displayed inline. Mirrors what the floating activity button shows.
function buildDocActivityLogHtml(entries: any[]): string {
    const toShow = (entries || []).filter(
        (e) => e.user !== "Administrator" && e.user_email !== "Administrator",
    );

    if (!toShow.length) {
        return `
<div class="section-heading" style="margin-top:8px;">Activity Log</div>
<table class="activity-table">
    <tbody>
        <tr><td colspan="3" style="text-align:center;color:#888;font-style:italic;">No activity recorded.</td></tr>
    </tbody>
</table>`;
    }

    const rows = [...toShow]
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .map((e) => {
            const dt = e.timestamp ? new Date(e.timestamp) : null;
            const dateStr = dt
                ? dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                : "";
            const timeStr = dt
                ? dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toLowerCase()
                : "";
            const displayName = e.user || e.user_email || "";
            let label = e.label || e.type || "";
            if (label === "Creation" || label === "created this") label = "Submitted";
            const plainContent = (e.content || "").replace(/<[^>]*>/g, "").trim();
            const finalComment = plainContent || label || "-";
            const time = dateStr ? `${dateStr}${timeStr ? ", " + timeStr : ""}` : "";
            
            return `
                    <tr>
                        <td>${displayName}</td>
                        <td>${finalComment}</td>
                        <td style="white-space:nowrap;">${time}</td>
                    </tr>`;
        })
        .join("");

    return `
<div class="section-heading" style="margin-top:8px;">Activity Log</div>
<table class="activity-table">
    <thead>
        <tr>
            <th>Approver</th>
            <th>Comment</th>
            <th>Time</th>
        </tr>
    </thead>
    <tbody>
        ${rows}
    </tbody>
</table>`;
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

type LinkOptionLike = { value: string; label: string };

// Department/Budget Head fields come back from the backend as raw Frappe doc
// names/ids (e.g. "otho2cn3vc"), not the human-readable label. The link_options
// loaded by the caller (keyed by fieldname, containing the full Department_prornd /
// Budget Head list) is used to translate every occurrence — including per-row
// department_section in the honorarium table — before rendering the print HTML.
export function resolveHonorariumPrintData(
    formData: Record<string, any>,
    linkOptions: Record<string, LinkOptionLike[] | undefined>,
): Record<string, any> {
    const findLabel = (keys: string[], value: any): string | undefined => {
        if (!value) return undefined;
        for (const key of keys) {
            const label = linkOptions?.[key]?.find((o) => o.value === value)?.label;
            if (label) return label;
        }
        return undefined;
    };

    const deptKeys = ["applicant_department", "department_for", "Department_prornd", "department"];

    const userKeys = ["web_mail_id", "User"];

    const resolvedRows = Array.isArray(formData.table_weoy)
        ? formData.table_weoy.map((row: any) => {
            // Resolve department label
            const resolvedDept =
                findLabel(deptKeys, row.department_section) || row.department_section;

            // Resolve full name — priority order:
            // 1. linkOptions lookup via web_mail_id (most reliable, strips email suffix)
            // 2. row.full_name (if backend returned it)
            // 3. row.name1 (may be truncated by Frappe's internal row naming)
            let resolvedName = "";
            if (row.web_mail_id) {
                const userLabel = findLabel(userKeys, row.web_mail_id);
                if (userLabel) {
                    // Strip trailing "(email@iitg.ac.in)" to get just the full name
                    resolvedName = userLabel.replace(/\s*\(.*\)$/, "").trim();
                }
            }
            // Fallback to explicit full_name field or name1 if lookup failed
            if (!resolvedName) {
                resolvedName = row.full_name || row.name1 || "";
            }

            return {
                ...row,
                department_section: resolvedDept,
                name1: resolvedName,
            };
        })
        : formData.table_weoy;

    return {
        ...formData,
        account_head:
            findLabel(["account_head", "Budget Head"], formData.account_head) ||
            formData.account_head,
        applicant_department:
            findLabel(deptKeys, formData.applicant_department) || formData.applicant_department,
        department_for: findLabel(deptKeys, formData.department_for) || formData.department_for,
        resolved_owner_name:
            findLabel(["User", "web_mail_id"], formData.owner) || formData.owner,
        table_weoy: resolvedRows,
    };
}

export function generateDisbursalOfHonorariumHtml(
    formData: Record<string, any>,
    activityItems: ActivityItem[] = [],
    docActivityEntries?: any[],
    activityEl?: HTMLElement | null
): string {
    const rows: any[] = Array.isArray(formData.table_weoy)
        ? formData.table_weoy
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

    const fDate = (d?: string) => {
        if (!d) return "";
        if (d.includes("-") && d.split("-")[0].length === 4) {
            return d.split("-").reverse().join("/");
        }
        return d;
    };

    const itemRows = rows
        .map(
            (row, i) => `
        <tr>
            <td class="center">${i + 1}</td>
            <td>${row.name1 || ""}</td>
            <td>${row.designation || ""}</td>
            <td>${[row.department_section, row.institute_name || row.institute || row.organization_name || row.organization].filter(Boolean).join("<br/>/<br/>") || ""}</td>
            <td class="center">${row.emp_id || (row.employee_id || "")}</td>
            <td style="text-align: left; line-height: 1.4;">${row.nature_of_work || ""}</td>
            <td class="center" style="white-space: nowrap;">${fDate(row.from)}</td>
            <td class="center" style="white-space: nowrap;">${fDate(row.to)}</td>
            <td style="line-height: 1.4;">${row.bank_account_number || ""}${row.ifsc_code ? `<br/>/<br/>${row.ifsc_code}` : ""}</td>
            <td class="right">${fmt(row.amount)}</td>
        </tr>`,
        )
        .join("");

    let beneficiarySection = "";
    if (formData.applying_for_self_or_other === "Other") {
        beneficiarySection = `
        <div class="section-heading">Beneficiary Details</div>
        <table class="info-table">
            <tr>
                <td class="label">Name</td>
                <td>${formData.name_of_applicant_for || "-"}</td>
                <td class="label">Designation</td>
                <td>${formData.designation_of_applicant_for || "-"}</td>
            </tr>
            <tr>
                <td class="label">Department</td>
                <td colspan="3">${formData.department_for || "-"}</td>
            </tr>
        </table>
        `;
    }

    let attachmentsSection = "";
    if (formData.attached_approvals || formData.additional_documents) {
        attachmentsSection = `
        ${formData.attached_approvals ? `
        <div class="print-hide" style="padding:30px 20px; text-align:center; border:2px dashed #cbd5e1; background:#f8fafc; border-radius:12px; margin-top: 30px;">
            <div style="font-size:32px; margin-bottom:12px;">📄</div>
            <div style="font-size:14pt; font-weight:bold; color:#334155; margin-bottom:8px;">PDF Attachment (Merged Approvals): ${formData.attached_approvals.split('/').pop()}</div>
            <div style="font-size:11pt; color:#64748b; margin-bottom:16px;">This document has multiple pages. Please print it separately.</div>
            <a href="${getFileUrl(formData.attached_approvals)}" target="_blank" style="display:inline-block; padding:10px 24px; background:#2563eb; color:white; text-decoration:none; border-radius:6px; font-weight:bold; font-family:sans-serif;">Print Attached File</a>
        </div>
        ` : ''}

        ${formData.additional_documents ? `
        <div class="print-hide" style="padding:30px 20px; text-align:center; border:2px dashed #cbd5e1; background:#f8fafc; border-radius:12px; margin-top: 30px;">
            <div style="font-size:32px; margin-bottom:12px;">📄</div>
            <div style="font-size:14pt; font-weight:bold; color:#334155; margin-bottom:8px;">PDF Attachment (Additional Documents): ${formData.additional_documents.split('/').pop()}</div>
            <div style="font-size:11pt; color:#64748b; margin-bottom:16px;">This document has multiple pages. Please print it separately.</div>
            <a href="${getFileUrl(formData.additional_documents)}" target="_blank" style="display:inline-block; padding:10px 24px; background:#2563eb; color:white; text-decoration:none; border-radius:6px; font-weight:bold; font-family:sans-serif;">Print Attached File</a>
        </div>
        ` : ''}
        `;
    }

    return dohTemplate
        .replace(/http:\/\/172\.16\.117\.39:8000/g, `http://${ASSET_HOST}:${ASSET_PORT}`)
        .replace("{{DOC_REF}}", formData.name || "")
        .replace("{{WORKFLOW_STATE}}", formData.workflow_state || "Draft")
        .replace("{{DATE}}", creation)
        .replace("{{APPLICANT_NAME}}", formData.name_of_applicant || "")
        .replace("{{APPLICANT_DESIGNATION}}", formData.designation_of_applicant || "-")
        .replace("{{APPLICANT_DEPARTMENT}}", formData.applicant_department || "-")
        .replace("{{APPLICANT_EMAIL}}", formData.owner || formData.applicant_email || "-")
        .replace("{{APPLYING_FOR}}", formData.applying_for_self_or_other || "-")
        .replace("{{PROJECT_NO}}", formData.project_no || "")
        .replace("{{ACCOUNT_HEAD}}", formData.account_head || "-")
        .replace("{{PROJECT_NAME}}", formData.project_name || "-")
        .replace("{{BENEFICIARY_SECTION}}", beneficiarySection)
        .replace("{{ITEM_ROWS}}", itemRows)
        .replace("{{TOTAL_AMOUNT}}", fmt(formData.total_amount))
        .replace("{{APPROVAL_COMP_AUTHORITY}}", formData.approval_comp_authority || "-")
        .replace("{{ATTACHMENTS_SECTION}}", attachmentsSection)
        .replace(
            "{{ACTIVITY_LOG_SECTION}}",
            (() => {
                if (activityEl) {
                    const allItems = Array.from(activityEl.querySelectorAll(".flex.items-start"));
                    const items = allItems.filter(item => item.querySelector(".text-xs.font-semibold"));
                    
                    if (items.length > 0) {
                        const activityRows = items
                            .map((item) => {
                                const nameEl   = item.querySelector(".text-xs.font-semibold");
                                let name     = nameEl?.textContent?.trim() || "Unknown";
                                
                                // If the UI fell back to an email and we have the resolved name, map it!
                                if (name === formData.owner && formData.resolved_owner_name) {
                                    name = formData.resolved_owner_name.replace(/\s*\(.*\)$/, "");
                                }
                                
                                const desigEl  = item.querySelector(".designation-text");
                                const designation = desigEl?.textContent?.trim() || "";

                                const actionEls = item.querySelectorAll<HTMLElement>(".text-xs.text-zinc-500, .text-xs.text-zinc-400");
                                let action = "";
                                actionEls.forEach((el) => {
                                    const t = el.textContent?.trim() || "";
                                    if (t && !t.match(/^\d/) && !t.includes("ago") && t !== "•" && !el.classList.contains("ml-auto")) {
                                        action = t;
                                    }
                                });

                                const timeEl   = item.querySelector<HTMLElement>("p[title], p.text-\\[11px\\], .text-xs.text-zinc-400");
                                const titleTime = timeEl?.getAttribute("title") || "";
                                const relativeTime = timeEl?.textContent?.trim() || "";
                                const time = titleTime || relativeTime;
                                
                                const commentEl = item.querySelector<HTMLElement>(".prose");
                                const comment = commentEl?.textContent?.trim() || "";

                                const label = action === "created this" ? "Submitted" : action;
                                const finalComment = comment || label || "-";

                                const nameCell = designation
                                    ? `${name}<span class="designation" style="display:block;font-size:9pt;color:#666;font-weight:normal;">${designation}</span>`
                                    : name;

                                return `
                                <tr>
                                    <td>${nameCell}</td>
                                    <td>${finalComment}</td>
                                    <td style="white-space:nowrap;">${time}</td>
                                </tr>`;
                            })
                            .join("");
                        
                        return `
                        <div style="page-break-inside: avoid; break-inside: avoid;">
                            <div class="section-heading" style="margin-top:8px;">Activity Log</div>
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
                            </table>
                        </div>`;
                    }
                }

                if (docActivityEntries && docActivityEntries.length > 0) {
                    return buildDocActivityLogHtml(docActivityEntries);
                }
                // Inject creation entry from formData if not already present
                const allItems = [...activityItems];
                const hasCreation = allItems.some((i) => i.comment_type === "Creation");
                if (!hasCreation && formData.creation && formData.owner) {
                    allItems.push({
                        owner: formData.owner,
                        creation: formData.creation,
                        content: "",
                        comment_type: "Creation",
                    });
                }
                return buildActivityLogHtml(allItems, formData);
            })(),
        );
}