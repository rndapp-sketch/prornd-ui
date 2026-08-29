import tufTemplate from "@/pages/printformat/top_up_fellowship_format.html?raw";
import { getFileUrl } from "@/utils/fileUtils";

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
<div style="page-break-inside: avoid; break-inside: avoid;">
    <div class="section-heading" style="margin-top:8px;">Activity Log</div>
    <table class="activity-table">
        <tbody>
            <tr><td colspan="3" style="text-align:center;color:#888;font-style:italic;">No activity recorded.</td></tr>
        </tbody>
    </table>
</div>`;
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
                // Usually linkOptions resolves to "Full Name (email)". Let's strip the email if it's there.
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
            ${rows}
        </tbody>
    </table>
</div>`;
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
<div style="page-break-inside: avoid; break-inside: avoid;">
    <div class="section-heading" style="margin-top:8px;">Activity Log</div>
    <table class="activity-table">
        <tbody>
            <tr><td colspan="3" style="text-align:center;color:#888;font-style:italic;">No activity recorded.</td></tr>
        </tbody>
    </table>
</div>`;
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
            ${rows}
        </tbody>
    </table>
</div>`;
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
export function resolveTopUpFellowshipPrintData(
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

    const deptKeys = ["dept_centre", "department", "Department_prornd"];

    const resolvedRows = Array.isArray(formData.students)
        ? formData.students.map((row: any) => ({
            ...row,
            dept_centre: findLabel(deptKeys, row.dept_centre) || row.dept_centre,
        }))
        : formData.students;

    return {
        ...formData,
        account_head:
            findLabel(["account_head", "Budget Head"], formData.account_head) ||
            formData.account_head,
        department:
            findLabel(deptKeys, formData.department) || formData.department,
        dept_centre:
            findLabel(deptKeys, formData.dept_centre) || formData.dept_centre,
        resolved_owner_name:
            findLabel(["User", "web_mail_id"], formData.owner) || formData.owner,
        students: resolvedRows,
    };
}

export function generateTopUpFellowshipHtml(
    formData: Record<string, any>,
    activityItems: ActivityItem[] = [],
    docActivityEntries?: any[],
    activityEl?: HTMLElement | null
): string {
    const rows: any[] = Array.isArray(formData.students)
        ? formData.students
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

    let itemRows = rows
        .map(
            (row, i) => {
                const name = row.name_of_the_student || row.email_of_student || "-";
                const roll = row.roll_number || "-";
                const dept = row.dept_centre || "-";
                const periodFrom = row.period_from
                    ? new Date(row.period_from).toLocaleDateString("en-IN")
                    : "-";
                const periodTo = row.period_to
                    ? new Date(row.period_to).toLocaleDateString("en-IN")
                    : "-";
                const rateHr = row.rate_per_hour || "-";
                const hrsMo = row.hours_per_month || "-";
                const totalMo = row.total_amount_per_month || "-";
                const stipend = row.stipend_or_scholarship || "-";
                const bank = [row.account_number, row.ifsc]
                    .filter(Boolean)
                    .join(" / ") || "-";

                return `
                <table class="info-table" style="page-break-inside: avoid; margin-bottom: 20px;">
                    <tbody>
                        <tr>
                            <td colspan="4" style="background-color: #e2e8f0; font-weight: bold; font-size: 14px; text-transform: uppercase;">
                                Student #${i + 1}: ${name}
                            </td>
                        </tr>
                        <tr>
                            <td class="label">Roll Number</td>
                            <td>${roll}</td>
                            <td class="label">Programme</td>
                            <td>${row.programme || "-"}</td>
                        </tr>
                        <tr>
                            <td class="label">Department / Centre</td>
                            <td>${dept}</td>
                            <td class="label">Email</td>
                            <td>${row.email_of_student || "-"}</td>
                        </tr>
                        <tr>
                            <td class="label">Contact Number</td>
                            <td>${row.contact_number || "-"}</td>
                            <td class="label">Engagement Period</td>
                            <td>${periodFrom} &ndash; ${periodTo}</td>
                        </tr>
                        <tr>
                            <td class="label">Rate / Hour</td>
                            <td>₹${rateHr}</td>
                            <td class="label">Hours / Month</td>
                            <td>${hrsMo}</td>
                        </tr>
                        <tr>
                            <td class="label">Stipend or Scholarship?</td>
                            <td>${stipend}</td>
                            <td class="label">Total Amount</td>
                            <td style="font-weight: bold; color: #000;">₹${totalMo}</td>
                        </tr>
                        <tr>
                            <td colspan="4" style="background-color: #f1f5f9; font-weight: bold; font-size: 13px; text-transform: uppercase;">
                                Bank Details
                            </td>
                        </tr>
                        <tr>
                            <td class="label">Account Holder</td>
                            <td>${row.account_holder_name || "-"}</td>
                            <td class="label">Bank Name</td>
                            <td>${row.bank_name || "-"}</td>
                        </tr>
                        <tr>
                            <td class="label">Account Number</td>
                            <td>${row.account_number || "-"}</td>
                            <td class="label">IFSC Code</td>
                            <td>${row.ifsc || "-"}</td>
                        </tr>
                        <tr>
                            <td class="label">Branch Code</td>
                            <td colspan="3">${row.branch_code || "-"}</td>
                        </tr>
                    </tbody>
                </table>`;
            }
        )
        .join("");
    
    if (!itemRows) {
        itemRows = `<tr><td colspan="9" class="center">No fellowship details found.</td></tr>`;
    }

    let attachmentsSection = "";
    if (formData.faculty_admission_pdf) {
        const fileUrl = getFileUrl(formData.faculty_admission_pdf);
        const absoluteFileUrl = fileUrl.startsWith("http") ? fileUrl : `${window.location.origin}${fileUrl}`;
        
        attachmentsSection = `
        <div class="print-hide" style="padding:30px 20px; text-align:center; border:2px dashed #cbd5e1; background:#f8fafc; border-radius:12px; margin-top: 30px;">
            <div style="font-size:32px; margin-bottom:12px;">📄</div>
            <div style="font-size:14pt; font-weight:bold; color:#334155; margin-bottom:8px;">Faculty Admission PDF: ${formData.faculty_admission_pdf.split('/').pop()}</div>
            <div style="font-size:11pt; color:#64748b; margin-bottom:16px;">This document is attached to the workflow.</div>
            <a href="${absoluteFileUrl}" target="_blank" style="display:inline-block; padding:10px 24px; background:#2563eb; color:white; text-decoration:none; border-radius:6px; font-weight:bold; font-family:sans-serif;">Print Attached File</a>
        </div>
        `;
    }

    const grandTotal = rows.reduce((sum, r) => sum + (Number(r.total_amount_per_month) || 0), 0);

    return tufTemplate
        .replace("{{DOC_REF}}", formData.name || "")
        .replace("{{WORKFLOW_STATE}}", formData.workflow_state || "Draft")
        .replace("{{DATE}}", creation)
        .replace("{{SUPERVISOR_WEBMAIL}}", formData.pi_webmail || "-")
        .replace("{{PI_WEBMAIL}}", formData.coordinating_pi_webmail || "-")
        .replace("{{PROJECT_NO}}", formData.project_number || formData.project_no || formData.project_code || "-")
        .replace("{{ACCOUNT_HEAD}}", formData.account_head || "-")
        .replace("{{PROJECT_NAME}}", formData.project_name || formData.project_title || "-")
        .replace("{{ITEM_ROWS}}", itemRows)
        .replace("{{TOTAL_AMOUNT}}", grandTotal ? grandTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }) : "-")
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