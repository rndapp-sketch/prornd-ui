import docTemplate from "@/pages/printformat/disbursal_of_consultancy_format.html?raw";
import { getFileUrl } from "@/utils/fileUtils";

import type { ActivityItem } from "@/utils/disbursalOfHonorariumPrint";

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

            let displayName = c.owner;
            if (formData && c.owner === formData.owner && formData.pi_name) {
                displayName = formData.pi_name;
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
                <th>Approver (Name &amp; Designation)</th>
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
    docActivityEntries?: any[],
    activityEl?: HTMLElement | null
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
            <td>${row.name1 || row.full_name || row.name_of_the_person || ""}</td>
            <td class="center">${row.disbursal_employee_student || row.employee_student || row.employee_or_student || row.type || ""}</td>
            <td>${row.designation || ""}</td>
            <td>${row.emp_id || row.employee_id || ""}</td>
            <td>${row.disbursal_pdf_no_or_bank_account_no || row.pdf_no_or_bank_account_no || row.bank_account_number || ""}</td>
            <td class="right">${fmt(row.disbursal_amount ?? row.amount_to_be_disbursed ?? row.amount)}</td>
            <td class="right">${fmt(row.disbursal_personal_share ?? row.personal_share)}</td>
            <td class="right">${fmt(row.disbursal_institute_share ?? row.institute_share ?? row.inst_share)}</td>
        </tr>`,
        )
        .join("");

    const projectNo = formData.disbursal_project_number || formData.project_number || formData.project_no || "-";
    
    let dept = formData.department || formData.department_name || "";
    if (!dept && projectNo !== "-") {
        const parts = projectNo.split("-");
        if (parts.length >= 3) {
            const thirdPart = parts[2];
            const deptMap: Record<string, string> = {
                "CSE": "Computer Science and Engineering",
                "EEE": "Electronics and Electrical Engineering",
                "MEC": "Mechanical Engineering",
                "CE": "Civil Engineering",
                "DD": "Design",
                "BSBE": "Biosciences and Bioengineering",
                "CHE": "Chemical Engineering",
                "CH": "Chemistry",
                "PH": "Physics",
                "MA": "Mathematics",
                "HSS": "Humanities and Social Sciences",
                "RT": "Rural Technology",
                "AI": "Data Science and Artificial Intelligence",
                "NT": "Nanotechnology",
                "ENC": "Energy",
                "CIE": "Centre for Intelligent Cyber Physical Systems"
            };
            
            let foundCode = "";
            for (const d of Object.keys(deptMap)) {
                if (thirdPart.startsWith(d)) {
                    foundCode = d;
                    break;
                }
            }
            
            if (foundCode) {
                dept = deptMap[foundCode];
            } else {
                const codeMatch = thirdPart.match(/^([A-Z]+)\d/);
                if (codeMatch) {
                    let code = codeMatch[1];
                    if (code.length > 2 && (code.endsWith('N') || code.endsWith('O'))) {
                        code = code.slice(0, -1);
                    }
                    dept = deptMap[code] || code;
                }
            }
        }
    }

    let attachmentsSection = "";
    if (formData.please_attach_a_copy_of_completion_report || formData.disbursal_additional_documents) {
        attachmentsSection = `
        ${formData.please_attach_a_copy_of_completion_report ? `
        <div class="print-hide" style="padding:30px 20px; text-align:center; border:2px dashed #cbd5e1; background:#f8fafc; border-radius:12px; margin-top: 30px;">
            <div style="font-size:32px; margin-bottom:12px;">📄</div>
            <div style="font-size:14pt; font-weight:bold; color:#334155; margin-bottom:8px;">PDF Attachment (Completion Report): ${formData.please_attach_a_copy_of_completion_report.split('/').pop()}</div>
            <div style="font-size:11pt; color:#64748b; margin-bottom:16px;">This document has multiple pages. Please print it separately.</div>
            <a href="${getFileUrl(formData.please_attach_a_copy_of_completion_report)}" target="_blank" style="display:inline-block; padding:10px 24px; background:#2563eb; color:white; text-decoration:none; border-radius:6px; font-weight:bold; font-family:sans-serif;">Print Attached File</a>
        </div>
        ` : ''}

        ${formData.disbursal_additional_documents ? `
        <div class="print-hide" style="padding:30px 20px; text-align:center; border:2px dashed #cbd5e1; background:#f8fafc; border-radius:12px; margin-top: 30px;">
            <div style="font-size:32px; margin-bottom:12px;">📄</div>
            <div style="font-size:14pt; font-weight:bold; color:#334155; margin-bottom:8px;">PDF Attachment (Additional Documents): ${formData.disbursal_additional_documents.split('/').pop()}</div>
            <div style="font-size:11pt; color:#64748b; margin-bottom:16px;">This document has multiple pages. Please print it separately.</div>
            <a href="${getFileUrl(formData.disbursal_additional_documents)}" target="_blank" style="display:inline-block; padding:10px 24px; background:#2563eb; color:white; text-decoration:none; border-radius:6px; font-weight:bold; font-family:sans-serif;">Print Attached File</a>
        </div>
        ` : ''}
        `;
    }

    return docTemplate
        .replace("{{DOC_REF}}", formData.name || "")
        .replace("{{WORKFLOW_STATE}}", formData.workflow_state || "Draft")
        .replace("{{DATE}}", creation)
        .replace("{{PI_NAME}}", formData.pi_name || "")
        .replace("{{PI_WEBMAIL}}", formData.webmail_id || formData.owner || "-")
        .replace("{{DEPARTMENT}}", dept || "-")
        .replace("{{EMPLOYEE_ID}}", formData.employee_id || "-")
        .replace("{{PROJECT_NO}}", projectNo)
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
                                if (name === formData.owner && formData.pi_name) {
                                    name = formData.pi_name;
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
                            .filter((row, index, self) => self.indexOf(row) === index)
                            .join("");
                        
                        return `
                        <div style="page-break-inside: avoid; break-inside: avoid;">
                            <div class="section-heading" style="margin-top:8px;">Activity Log</div>
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
                            </table>
                        </div>`;
                    }
                }

                if (docActivityEntries && docActivityEntries.length > 0) {
                    // Fallback to legacy string build if no DOM (not implemented here since we didn't bring in buildDocActivityLogHtml, we just fallback to basic string if DOM fails)
                }
                
                // Final fallback using the original string builder logic if everything else fails
                const allItems = [...activityItems];
                const hasCreation = allItems.some((i) => i.comment_type === "Creation");
                if (!hasCreation && formData.creation && formData.owner) {
                    allItems.push({
                        owner: formData.owner,
                        creation: formData.creation,
                        content: "",
                        comment_type: "Creation",
                    } as any);
                }
                return buildActivityLogHtml(allItems, formData);
            })(),
        );
}