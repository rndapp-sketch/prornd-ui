import racTemplate from "@/pages/printformat/recruitment_adhoc_contractual_format.html?raw";
import { getFileUrl } from "@/utils/fileUtils";

interface ChildFieldMeta {
    fieldname: string;
    label?: string | null;
    fieldtype?: string;
    options?: string | null;
}

interface FormFieldMeta {
    fieldname: string;
    label?: string | null;
    fieldtype?: string;
    options?: string | null;
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

const fmtDateShort = (val: string | undefined): string => {
    if (!val) return "—";
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
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

const isTruthy = (val: any): boolean =>
    val === 1 || val === "1" || val === true || String(val).toLowerCase() === "yes";

// Fieldtypes that never belong in the generic info table (structural, or handled elsewhere).
const NON_RENDERABLE_TYPES = new Set([
    "Section Break", "Column Break", "HTML", "Table", "Table MultiSelect",
    "Attach", "Attach Image", "Password", "Signature", "Button", "Heading",
]);

// System / already-shown-in-header fields.
const SKIP_FIELDNAMES = new Set([
    "name", "creation", "modified", "modified_by", "owner", "docstatus", "idx",
    "doctype", "parent", "parenttype", "parentfield", "naming_series", "amended_from",
    "workflow_state", "_user_tags", "_comments", "_assign", "_liked_by", "_seen",
    "upfa_project_title", "project_title", "upfa_project_code", "project_code",
]);

const fmtLabelFallback = (key: string): string =>
    key.replace(/^upfa_/, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function resolveLinkLabel(
    field: FormFieldMeta,
    rawVal: any,
    data: Record<string, any>,
    linkOptions: Record<string, any[]>,
): string {
    const frappeDisplayName = data[`${field.fieldname}_name`];
    if (frappeDisplayName) return esc(frappeDisplayName);

    const byDoctype = (field.options && linkOptions[field.options]) || [];
    const byFieldname = linkOptions[field.fieldname] || [];
    const map = new Map<string, any>();
    byDoctype.forEach((o: any) => map.set(String(o.value), o));
    byFieldname.forEach((o: any) => {
        const existing = map.get(String(o.value));
        if (!existing || (o.label !== o.value && existing.label === existing.value)) {
            map.set(String(o.value), o);
        }
    });
    const match = map.get(String(rawVal));
    if (match?.label && match.label !== String(rawVal)) return esc(match.label);
    return esc(rawVal);
}

function fmtFieldValue(field: FormFieldMeta, rawVal: any, data: Record<string, any>, linkOptions: Record<string, any[]>): string {
    switch (field.fieldtype) {
        case "Check":
            return isTruthy(rawVal) ? "Yes" : "No";
        case "Currency":
            return `₹ ${fmtNum(rawVal)}`;
        case "Float":
        case "Int":
            return isNaN(Number(rawVal)) ? esc(rawVal) : fmtNum(rawVal);
        case "Date":
            return fmtDateShort(rawVal);
        case "Datetime":
            return rawVal ? fmtDateShort(String(rawVal).split(" ")[0]) : "—";
        default:
            // Attempt link-style resolution for every remaining field, not just ones
            // schema-tagged as "Link"/"Select" — some Department/Account Head-style
            // fields carry a linked doctype's raw id while being exposed as a plain
            // Data/Select fieldtype, and only resolve via the same options merge.
            return resolveLinkLabel(field, rawVal, data, linkOptions);
    }
}

const CHILD_SKIP_KEYS = new Set([
    "name", "owner", "creation", "modified", "modified_by", "parent", "parentfield",
    "parenttype", "idx", "docstatus", "doctype",
]);

const LONG_TEXT_FIELDTYPES = new Set(["Text", "Small Text", "Text Editor", "Long Text", "Code", "Markdown Editor", "HTML Editor"]);
const LONG_TEXT_NAME_HINT = /description|justification|qualification|remarks|notes|comment/i;
const CHECKBOX_NAME_HINT = /^is_|^has_|required|medical/i;

function buildChildTable(title: string, rows: any[], meta?: FormFieldMeta): string {
    if (!rows || rows.length === 0) return "";

    let allColumns: { fieldname: string; label: string; fieldtype?: string }[];
    if (meta?.child_fields?.length) {
        allColumns = meta.child_fields
            .filter((cf) => !["Section Break", "Column Break", "HTML"].includes(cf.fieldtype || "") && !CHILD_SKIP_KEYS.has(cf.fieldname))
            .map((cf) => ({ fieldname: cf.fieldname, label: cf.label || fmtLabelFallback(cf.fieldname), fieldtype: cf.fieldtype }));
    } else {
        const keys = Object.keys(rows[0]).filter((k) => !CHILD_SKIP_KEYS.has(k) && !k.startsWith("_"));
        allColumns = keys.map((k) => ({ fieldname: k, label: fmtLabelFallback(k) }));
    }
    if (allColumns.length === 0) return "";

    // Long free-text columns (qualification, justification, description...) wreck a
    // tabular layout when squeezed into narrow columns — pull them out into a note
    // block under each row instead, the same way icssPrint.ts handles item descriptions.
    const isLongText = (c: { fieldname: string; fieldtype?: string }) =>
        (c.fieldtype && LONG_TEXT_FIELDTYPES.has(c.fieldtype)) || LONG_TEXT_NAME_HINT.test(c.fieldname);

    const columns = allColumns.filter((c) => !isLongText(c));
    const noteColumns = allColumns.filter(isLongText);

    if (columns.length === 0) return "";

    const headerCells = columns.map((c) => `<th>${esc(c.label)}</th>`).join("");
    const bodyRows = rows.map((row, i) => {
        const cells = columns.map((c) => {
            const v = row[c.fieldname];
            if (v === null || v === undefined || v === "") return `<td>—</td>`;
            if (c.fieldtype === "Check" || v === true || v === false) {
                return `<td class="center">${(v === true || v === 1 || v === "1") ? "Yes" : "No"}</td>`;
            }
            if ((v === 0 || v === 1) && CHECKBOX_NAME_HINT.test(c.fieldname)) {
                return `<td class="center">${v ? "Yes" : "No"}</td>`;
            }
            if (typeof v === "number") {
                if (c.fieldtype === "Int") return `<td class="right">${v}</td>`;
                return `<td class="right">${fmtNum(v)}</td>`;
            }
            return `<td>${esc(v)}</td>`;
        }).join("");

        let noteRow = "";
        if (noteColumns.length) {
            const notes = noteColumns
                .map((c) => ({ c, v: row[c.fieldname] }))
                .filter(({ v }) => v !== null && v !== undefined && String(v).trim() !== "")
                .map(({ c, v }) => `<div style="margin-top:3px;"><b>${esc(c.label)}:</b> ${esc(v).replace(/\n/g, "<br>")}</div>`)
                .join("");
            if (notes) {
                noteRow = `<tr><td></td><td colspan="${columns.length}" style="font-size:8.5pt;color:#333;background:#fafafa;">${notes}</td></tr>`;
            }
        }

        return `<tr><td class="center">${i + 1}</td>${cells}</tr>${noteRow}`;
    }).join("");

    return `
        <div class="section-heading">${esc(title)}</div>
        <table class="item-table">
            <thead><tr><th style="width:4%;">#</th>${headerCells}</tr></thead>
            <tbody>${bodyRows}</tbody>
        </table>`;
}

function buildDeclarationsBlock(fields: FormFieldMeta[], data: Record<string, any>): string {
    if (!fields.length) return "";
    const items = fields.map((f) => {
        const checked = isTruthy(data[f.fieldname]);
        const label = f.label || fmtLabelFallback(f.fieldname);
        const chk = checked
            ? `<span style="font-size:12pt;line-height:1;">&#9745;</span>`
            : `<span style="font-size:12pt;line-height:1;">&#9744;</span>`;
        return `<div style="display:flex;align-items:flex-start;gap:8px;margin:4px 0;font-size:9pt;">
            <span style="flex-shrink:0;margin-top:1px;">${chk}</span>
            <span>${esc(label.trim())}</span>
        </div>`;
    }).join("");

    // No heading here — the caller (buildSectionsHtml) already renders the section's
    // own heading (its real title, e.g. "Declaration") right before this block.
    return `
        <div style="border:1px solid #ddd;border-radius:3px;padding:8px 10px;background:#fafafa;page-break-inside:avoid;">
            ${items}
        </div>`;
}

function buildInfoTable(fields: FormFieldMeta[], data: Record<string, any>, linkOptions: Record<string, any[]>): string {
    if (!fields.length) return "";
    let rows = "";
    for (let i = 0; i < fields.length; i += 2) {
        const f1 = fields[i];
        const f2 = fields[i + 1];
        const label1 = esc((f1.label || fmtLabelFallback(f1.fieldname)).trim());
        const val1 = fmtFieldValue(f1, data[f1.fieldname], data, linkOptions);
        if (f2) {
            const label2 = esc((f2.label || fmtLabelFallback(f2.fieldname)).trim());
            const val2 = fmtFieldValue(f2, data[f2.fieldname], data, linkOptions);
            rows += `<tr>
                <td class="label">${label1}</td><td>${val1}</td>
                <td class="label">${label2}</td><td>${val2}</td>
            </tr>`;
        } else {
            rows += `<tr>
                <td class="label">${label1}</td><td colspan="3">${val1}</td>
            </tr>`;
        }
    }
    return `<table class="info-table"><tbody>${rows}</tbody></table>`;
}

function hasValue(v: any): boolean {
    if (v === null || v === undefined || v === "") return false;
    if (isFilePath(v)) return false;
    return true;
}

/**
 * Walks the schema in its natural (backend) order, grouping fields under the
 * Section Break headings that already drive the on-screen form layout — so
 * the print mirrors "Appointment Details" / "Project Details" / etc. instead
 * of dumping every field into one flat, unordered table.
 */
function buildSectionsHtml(fields: FormFieldMeta[], data: Record<string, any>, linkOptions: Record<string, any[]>): string {
    type Section = { title: string; scalar: FormFieldMeta[]; checks: FormFieldMeta[]; tables: FormFieldMeta[] };
    const sections: Section[] = [];
    let current: Section = { title: "Application Details", scalar: [], checks: [], tables: [] };

    const pushCurrent = () => {
        if (current.scalar.length || current.checks.length || current.tables.length) {
            sections.push(current);
        }
    };

    for (const f of fields) {
        if (f.fieldtype === "Section Break") {
            // An unlabeled break is a pure layout hint (e.g. separating a bare
            // grid of fields that isn't wrapped in its own card on screen) —
            // starting a new section for it would produce a spurious repeated
            // "Details" heading, so fields just keep accumulating into the
            // current section instead.
            if (f.label) {
                pushCurrent();
                current = { title: f.label, scalar: [], checks: [], tables: [] };
            }
            continue;
        }
        if (f.fieldtype === "Column Break") continue;
        if (SKIP_FIELDNAMES.has(f.fieldname) || f.fieldname.startsWith("_")) continue;

        if (f.fieldtype === "Table") {
            if (Array.isArray(data[f.fieldname]) && data[f.fieldname].length > 0) {
                current.tables.push(f);
            }
            continue;
        }

        if (NON_RENDERABLE_TYPES.has(f.fieldtype || "")) continue;
        if (!hasValue(data[f.fieldname])) continue;

        if (f.fieldtype === "Check") {
            current.checks.push(f);
        } else {
            current.scalar.push(f);
        }
    }
    pushCurrent();

    return sections.map((s) => {
        const parts: string[] = [];
        // Tables render their own heading (from the field's own label); a generic
        // section heading is only needed when there's non-table content too.
        if (s.scalar.length || s.checks.length) {
            parts.push(`<div class="section-heading">${esc(s.title)}</div>`);
        }
        if (s.scalar.length) parts.push(buildInfoTable(s.scalar, data, linkOptions));
        for (const t of s.tables) {
            parts.push(buildChildTable(t.label || s.title || fmtLabelFallback(t.fieldname), data[t.fieldname], t));
        }
        if (s.checks.length) parts.push(buildDeclarationsBlock(s.checks, data));
        return parts.join("\n");
    }).join("\n");
}

function buildActivityLogHtml(activity: HTMLElement | string | null): string {
    // Pages without a live, always-mounted <ActivityLog> element to scrape (e.g. the
    // approval/review view in PendingTaskDetails.tsx) pre-fetch the activity log
    // straight from the backend instead and pass the finished HTML in as a string.
    if (typeof activity === "string") {
        return activity || `
        <div class="section-heading">Activity Log</div>
        <table class="activity-table">
            <thead><tr><th>Approver</th><th>Comment</th><th>Time</th></tr></thead>
            <tbody><tr><td colspan="3" style="text-align:center;color:#888;font-style:italic;">No activity recorded.</td></tr></tbody>
        </table>`;
    }

    const activityEl = activity;
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
        const fileName = url.split("/").pop() || fmtLabelFallback(k);
        return `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px; font-weight:bold; font-family:sans-serif; color:#333; font-size: 13px;">${esc(fmtLabelFallback(k))} — ${esc(fileName)}</td>
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
    activity: HTMLElement | string | null = null,
): string {
    let sectionsHtml = buildSectionsHtml(fields, data, linkOptions);

    // Fallback: schema not loaded yet — still show whatever data we have as one flat table.
    if (!fields.length) {
        const keys = Object.keys(data).filter((k) => !SKIP_FIELDNAMES.has(k) && !k.startsWith("_") && hasValue(data[k]) && !Array.isArray(data[k]));
        const asFields: FormFieldMeta[] = keys.map((k) => ({ fieldname: k, label: fmtLabelFallback(k), fieldtype: "Data" }));
        sectionsHtml = `<div class="section-heading">Application Details</div>${buildInfoTable(asFields, data, linkOptions)}`;

        const arrayTables = Object.keys(data)
            .filter((k) => Array.isArray(data[k]) && data[k].length > 0 && typeof data[k][0] === "object")
            .map((k) => buildChildTable(fmtLabelFallback(k), data[k]))
            .join("");
        sectionsHtml += arrayTables;
    }

    const activityHtml = buildActivityLogHtml(activity);
    const attachmentsHtml = buildAttachmentsHtml(data);

    return racTemplate
        .replace("{{DOC_REF}}", esc(data.name))
        .replace("{{WORKFLOW_STATE}}", esc(data.workflow_state))
        .replace("{{DATE}}", fmtDate(data.creation))
        .replace("{{PROJECT_NO}}", esc(data.upfa_project_code || data.project_code))
        .replace("{{SECTIONS}}", sectionsHtml)
        .replace("{{ACTIVITY_LOG_SECTION}}", activityHtml)
        .replace("{{ATTACHMENTS_SECTION}}", attachmentsHtml);
}
