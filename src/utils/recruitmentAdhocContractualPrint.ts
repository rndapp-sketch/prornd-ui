import racTemplate from "@/pages/printformat/recruitment_adhoc_contractual_format.html?raw";
import { getFileUrl } from "@/utils/fileUtils";

interface ChildFieldMeta {
    fieldname: string;
    label?: string | null;
    fieldtype?: string;
}

interface FormFieldMeta {
    fieldname: string;
    label?: string | null;
    fieldtype?: string;
    child_fields?: ChildFieldMeta[];
}

const fmtNum = (val: any): string => {
    const n = Number(val) || 0;
    return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtDate = (val: string | undefined): string => {
    if (!val) return "—";
    return new Date(val).toLocaleDateString("en-IN", {
        day: "2-digit", month: "long", year: "numeric",
    });
};

const esc = (s: any): string =>
    String(s ?? "—")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

const isFilePath = (val: any): boolean => {
    if (typeof val !== "string") return false;
    const isUrl = val.startsWith("http://") || val.startsWith("https://") || val.startsWith("/");
    return isUrl && /\.(pdf|jpg|jpeg|png|gif|webp)$/i.test(val);
};

// System / already-shown-in-header fields, excluded from the generic info table.
const SKIP_FIELDS = new Set([
    "name", "creation", "modified", "modified_by", "owner", "docstatus", "idx",
    "doctype", "parent", "parenttype", "parentfield", "naming_series", "amended_from",
    "workflow_state", "_user_tags", "_comments", "_assign", "_liked_by", "_seen",
    "upfa_project_title", "project_title", "upfa_project_code", "project_code",
]);

const FIELD_LABELS: Record<string, string> = {
    upfa_department: "Department",
    implementation_department: "Department",
    department: "Department",
    upfa_project_duration: "Project Duration",
    project_duration: "Project Duration",
    webmail_id: "Applicant Webmail ID",
    head: "Head Approver",
    chairperson_webmail_id: "Chairperson Webmail ID",
    chairperson_name: "Chairperson Name",
    designation_type: "Designation Type",
};

const fmtLabel = (key: string): string =>
    FIELD_LABELS[key] ||
    key.replace(/^upfa_/, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const fmtValue = (key: string, val: any, linkOpts: Record<string, any[]> = {}): string => {
    const opts = linkOpts[key];
    if (opts) {
        const match = opts.find((o: any) => String(o.value) === String(val));
        if (match?.label && match.label !== String(val)) return esc(match.label);
    }
    return esc(val);
};

function buildInfoRows(data: Record<string, any>, linkOptions: Record<string, any[]>): string {
    const seen = new Set<string>();
    const entries = Object.keys(data).filter((k) => {
        if (seen.has(k)) return false;
        seen.add(k);
        if (SKIP_FIELDS.has(k)) return false;
        if (k.startsWith("_")) return false;
        const v = data[k];
        if (Array.isArray(v) || (v && typeof v === "object")) return false;
        if (v === null || v === undefined || v === "") return false;
        if (isFilePath(v)) return false;
        return true;
    });

    if (!entries.length) {
        return `<tr><td colspan="4" style="text-align:center;color:#888;">No additional details</td></tr>`;
    }

    let rows = "";
    for (let i = 0; i < entries.length; i += 2) {
        const k1 = entries[i];
        const k2 = entries[i + 1];
        rows += `<tr>
            <td class="label">${esc(fmtLabel(k1))}</td>
            <td>${fmtValue(k1, data[k1], linkOptions)}</td>
            ${k2 ? `<td class="label">${esc(fmtLabel(k2))}</td><td>${fmtValue(k2, data[k2], linkOptions)}</td>` : `<td></td><td></td>`}
        </tr>`;
    }
    return rows;
}

const CHILD_SKIP_KEYS = new Set([
    "name", "owner", "creation", "modified", "modified_by", "parent", "parentfield",
    "parenttype", "idx", "docstatus", "doctype",
]);

function buildChildTable(title: string, rows: any[], meta?: FormFieldMeta): string {
    if (!rows || rows.length === 0) return "";

    let columns: { fieldname: string; label: string }[];
    if (meta?.child_fields?.length) {
        columns = meta.child_fields
            .filter((cf) => !["Section Break", "Column Break", "HTML"].includes(cf.fieldtype || "") && !CHILD_SKIP_KEYS.has(cf.fieldname))
            .map((cf) => ({ fieldname: cf.fieldname, label: cf.label || fmtLabel(cf.fieldname) }));
    } else {
        const keys = Object.keys(rows[0]).filter((k) => !CHILD_SKIP_KEYS.has(k) && !k.startsWith("_"));
        columns = keys.map((k) => ({ fieldname: k, label: fmtLabel(k) }));
    }
    if (columns.length === 0) return "";

    const headerCells = columns.map((c) => `<th>${esc(c.label)}</th>`).join("");
    const bodyRows = rows.map((row, i) => {
        const cells = columns.map((c) => {
            const v = row[c.fieldname];
            if (v === null || v === undefined || v === "") return `<td>—</td>`;
            if (typeof v === "number") return `<td class="right">${fmtNum(v)}</td>`;
            return `<td>${esc(v)}</td>`;
        }).join("");
        return `<tr><td class="center">${i + 1}</td>${cells}</tr>`;
    }).join("");

    return `
        <div class="section-heading">${esc(title)}</div>
        <table class="item-table">
            <thead><tr><th style="width:5%;">#</th>${headerCells}</tr></thead>
            <tbody>${bodyRows}</tbody>
        </table>`;
}

function buildActivityLogHtml(activityEl: HTMLElement | null): string {
    let activityRows = "<tr><td colspan='3' style='text-align:center;color:#888;font-style:italic;'>No activity recorded.</td></tr>";

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
        }
    }

    return `
        <div class="section-heading">Activity Log</div>
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

function buildAttachmentsHtml(data: Record<string, any>): string {
    const attachments = Object.entries(data).filter(
        ([k, v]) => isFilePath(v) && !k.startsWith("_"),
    );
    if (!attachments.length) return "";

    const rows = attachments.map(([k, v]) => {
        const url = v as string;
        const fileName = url.split("/").pop() || fmtLabel(k);
        return `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px; font-weight:bold; font-family:sans-serif; color:#333; font-size: 13px;">${esc(fmtLabel(k))} — ${esc(fileName)}</td>
              <td style="padding: 12px; text-align:right;">
                <a href="${getFileUrl(url)}" target="_blank"
                   style="display:inline-block; padding:10px 24px; background:#2563eb; color:white; text-decoration:none; border-radius:6px; font-weight:bold; font-family:sans-serif; font-size: 13px;">
                  Print Attached File
                </a>
              </td>
            </tr>`;
    }).join("");

    return `
        <div class="hide-on-print" style="margin-top: 30px; page-break-inside: avoid;">
            <div class="section-heading" style="margin-top:8px;">Attachments</div>
            <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border: 1px solid #e2e8f0;">
                <tbody>
                    ${rows}
                </tbody>
            </table>
        </div>`;
}

export function generateRecruitmentAdhocContractualHtml(
    data: Record<string, any>,
    fields: FormFieldMeta[] = [],
    linkOptions: Record<string, any[]> = {},
    activityEl: HTMLElement | null = null,
): string {
    const infoRows = buildInfoRows(data, linkOptions);

    const tableFields = fields.filter((f) => f.fieldtype === "Table" && Array.isArray(data[f.fieldname]) && data[f.fieldname].length > 0);
    let childTablesHtml = tableFields
        .map((f) => buildChildTable(f.label || fmtLabel(f.fieldname), data[f.fieldname], f))
        .join("");

    // Fallback: fields metadata unavailable (e.g. print requested before schema loaded) —
    // still render any array-of-objects fields found directly on the data.
    if (!tableFields.length) {
        childTablesHtml = Object.keys(data)
            .filter((k) => Array.isArray(data[k]) && data[k].length > 0 && typeof data[k][0] === "object")
            .map((k) => buildChildTable(fmtLabel(k), data[k]))
            .join("");
    }

    const activityHtml = buildActivityLogHtml(activityEl);
    const attachmentsHtml = buildAttachmentsHtml(data);

    return racTemplate
        .replace("{{DOC_REF}}", esc(data.name))
        .replace("{{WORKFLOW_STATE}}", esc(data.workflow_state))
        .replace("{{DATE}}", fmtDate(data.creation))
        .replace("{{PROJECT_NO}}", esc(data.upfa_project_code || data.project_code))
        .replace("{{INFO_ROWS}}", infoRows)
        .replace("{{CHILD_TABLES_SECTION}}", childTablesHtml)
        .replace("{{ACTIVITY_LOG_SECTION}}", activityHtml)
        .replace("{{ATTACHMENTS_SECTION}}", attachmentsHtml);
}
