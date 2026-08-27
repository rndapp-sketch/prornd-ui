import dpTemplate from "@/pages/printformat/dp_format.html?raw";
import { getFileUrl } from "./fileUtils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtNum = (val: any): string => {
    const n = Number(val) || 0;
    return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const yesNo = (val: any): string =>
    val === 1 || val === true || val === "1" ? "Yes" : "No";

const fmtDate = (val: string | undefined): string => {
    if (!val) return "—";
    return new Date(val).toLocaleDateString("en-IN", {
        day: "2-digit", month: "long", year: "numeric",
    });
};

// Fields to skip entirely (system fields, child tables, etc.)
const SKIP_FIELDS = new Set([
    "name", "creation", "modified", "modified_by", "docstatus",
    "idx", "doctype", "parent", "parenttype", "parentfield",
    "_user_tags", "_comments", "_assign", "_liked_by", "_seen",
    "table_gdxp", "table_teqd",                      // shown separately
    "naming_series", "amended_from",                 // system
    "project_name", "project_no",                    // shown in header (Project No: line)
    "dec_1", "dec_2",                                // shown as checkbox declaration block
    // Frappe _name shadow fields (display values shown via their base field)
    "applicant_department_name", "account_head_name",
    "register_for_name", "applying_for_name_display",
    "workflow_state_name",
]);

// Human-readable labels for known field names
const FIELD_LABELS: Record<string, string> = {
    owner:                 "Applicant Webmail",
    applicant_name:        "Applicant Name",
    applicant_designation: "Applicant Designation",
    applicant_department:  "Applicant Department",
    register_for:          "Register For",
    applying_for_name:     "Applying For",
    project_name:          "Project Number",
    project_no:            "Project Number",
    account_head:          "Account Head",
    total_estimate:        "Total Estimate (₹)",
    is_foreign:            "Is Foreign Purchase",
    is_sanctioned:         "Is Sanctioned",
    dec_1:                 "Declaration 1",
    dec_2:                 "Declaration 2",
    comments_if_any:       "Comments (If Any)",
    workflow_state:        "Workflow Status",
};

// Fields treated as boolean checkboxes
const BOOL_FIELDS = new Set([
    "is_foreign", "is_sanctioned", "dec_1", "dec_2",
]);

// Fields treated as currency amounts
const AMOUNT_FIELDS = new Set([
    "total_estimate", "estimated_amount_total_price_in_rs",
    "estimatedprice", "item_unit_price", "dp_total_price",
]);

// Helper to detect file URLs
const isFilePath = (val: any): boolean => {
    if (typeof val !== "string") return false;
    const isUrl = val.startsWith("http://") || val.startsWith("https://");
    const isFrappeFile = val.startsWith("/private/files/") || val.startsWith("/files/");
    const isAppwriteFile = val.startsWith("/appwrite/");
    
    // Only treat as a file if it has a valid file path structure AND ends with a file extension
    return (isUrl || isFrappeFile || isAppwriteFile) && /\.(pdf|jpg|jpeg|png|gif|webp)$/i.test(val);
};

// Preferred display order for info rows
const ORDERED_FIELDS = [
    "applicant_name", "applicant_designation", "applicant_department", "owner",
    "register_for", "applying_for_name",
    "account_head", "total_estimate", "is_foreign", "is_sanctioned",
    "comments_if_any", "workflow_state",
];

const fmtLabel = (key: string): string =>
    FIELD_LABELS[key] ||
    key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const fmtValue = (key: string, val: any, data: Record<string, any> = {}, domMap: Record<string, string> = {}): string => {
    if (BOOL_FIELDS.has(key)) return yesNo(val);
    if (AMOUNT_FIELDS.has(key) && !isNaN(Number(val)))
        return "₹ " + fmtNum(val);
    // 1. Use value from rendered DOM card (most accurate — bypasses raw link IDs)
    const label = fmtLabel(key).toLowerCase();
    if (domMap[label]) return domMap[label];
    // 2. Frappe _name companion field fallback
    const nameField = data[key + "_name"];
    if (nameField && typeof nameField === "string" && nameField.trim() !== "")
        return nameField;
    return String(val ?? "—");
};

// ─── Main Generator ───────────────────────────────────────────────────────────

export function generateDpHtml(
    data: Record<string, any>,
    activityEl: HTMLElement | null,
    detailsEl: HTMLElement | null = null
): string {

    // ── BUILD DOM DISPLAY MAP from rendered UI cards ───────────────────────
    // Cards have label in .truncate span and value in the <p> / <span> below
    const domDisplayMap: Record<string, string> = {};
    if (detailsEl) {
        detailsEl.querySelectorAll(".truncate").forEach((labelEl) => {
            const card = labelEl.closest(".flex-col, .flex"); // find closest container
            if (!card) return;
            const valueEl = card.querySelector("p, .text-\\[13px\\]");
            if (labelEl && valueEl) {
                const labelKey = labelEl.textContent?.trim().toLowerCase() || "";
                const value    = valueEl.textContent?.trim() || "";
                if (labelKey && value) domDisplayMap[labelKey] = value;
            }
        });
    }

    // ── INFO ROWS (all scalar fields, ordered + any extras) ───────────────────
    const seen = new Set<string>();

    // Build ordered list: priority fields first, then any remaining scalar fields
    const allScalarKeys = [
        ...ORDERED_FIELDS,
        ...Object.keys(data).filter(
            (k) =>
                !ORDERED_FIELDS.includes(k) &&
                !SKIP_FIELDS.has(k) &&
                !k.startsWith("_") &&
                !Array.isArray(data[k]) &&
                data[k] !== null &&
                data[k] !== undefined &&
                data[k] !== "" &&
                !isFilePath(data[k]) // exclude attachments from the info table
        ),
    ];

    // Pair into rows of 2 cells (label | value | label | value)
    const infoEntries: [string, any][] = allScalarKeys
        .filter((k) => {
            if (seen.has(k)) return false;
            seen.add(k);
            if (SKIP_FIELDS.has(k)) return false;
            if (k.startsWith("_")) return false;
            // Skip Frappe _name shadow fields whose base field is present (e.g. account_head_name when account_head exists)
            if (k.endsWith("_name") && data[k.slice(0, -5)] !== undefined) return false;
            const v = data[k];
            if (Array.isArray(v) || v === null || v === undefined || v === "") return false;
            return true;
        })
        .map((k) => [k, data[k]]);


    let infoRows = "";
    for (let i = 0; i < infoEntries.length; i += 2) {
        const [k1, v1] = infoEntries[i];
        const pair = infoEntries[i + 1];
        infoRows += `<tr>
            <td class="lbl">${fmtLabel(k1)}</td>
            <td class="val">${fmtValue(k1, v1, data, domDisplayMap)}</td>
            ${pair
                ? `<td class="lbl">${fmtLabel(pair[0])}</td><td class="val">${fmtValue(pair[0], pair[1], data, domDisplayMap)}</td>`
                : `<td></td><td></td>`
            }
        </tr>\n`;

        // Inject Purchase Committee row immediately after the row containing workflow_state
        const justPrinted = [k1, pair?.[0]].filter(Boolean);
        if (justPrinted.includes("workflow_state")) {
            const teqdRows: any[] = Array.isArray(data.table_teqd) ? data.table_teqd : [];
            if (teqdRows.length > 0) {
                const namesList = teqdRows
                    .map((m, idx) => `(${idx + 1}) ${m.pc_name || m.webmail_id || "—"}`)
                    .join("<br>");
                infoRows += `<tr>
                    <td class="lbl" colspan="1">Purchase Committee Members</td>
                    <td colspan="3"><label>${namesList}</label></td>
                </tr>\n`;
            }
        }
    }

    // ── ITEMS TABLE (table_gdxp) ──────────────────────────────────────────────
    const gdxpRows: any[] = Array.isArray(data.table_gdxp) ? data.table_gdxp : [];

    const itemRows = gdxpRows
        .map(
            (row, i) => `
        <tr>
            <td class="c">${i + 1}</td>
            <td>${row.itemname || row.item_name || "—"}</td>
            <td>${row.itemdesciption || row.item_description || "—"}</td>
            <td>${row.justification || "—"}</td>
            <td class="c">${row.quantity ?? row.item_quantity ?? 0}</td>
            <td class="r">${fmtNum(row.estimatedprice ?? row.item_unit_price)}</td>
            <td class="r">${fmtNum(row.estimated_amount_total_price_in_rs ?? row.dp_total_price)}</td>
        </tr>`
        )
        .join("");

    const totalEstimate = Number(data.total_estimate) || 0;

    // ── DECLARATIONS (checkbox style — shown above Activity Log) ──────────────
    const isChecked = (val: any) =>
        val === 1 || val === true || val === "1";

    const chk = (val: any) =>
        isChecked(val)
            ? `<span style="font-size:12pt;line-height:1;">&#9745;</span>`   // ☑
            : `<span style="font-size:12pt;line-height:1;">&#9744;</span>`;  // ☐

    const DEC_TEXTS = [
        { key: "dec_1", text: "For non sanctioned item, the PI will be responsible for any financial obligations that may arise." },
        { key: "dec_2", text: "All prices / amounts mentioned in the form are in India Rupee (INR)." },
    ];

    const declarationItems = DEC_TEXTS
        .map(
            (d) =>
                `<div style="display:flex;align-items:flex-start;gap:8px;margin:4px 0;font-size:9pt;">
                    <span style="flex-shrink:0;margin-top:1px;">${chk(data[d.key])}</span>
                    <span>${d.text}</span>
                 </div>`
        )
        .join("");

    const declarationsHtml =
        `<div class="declaration" style="margin-top:8px; page-break-inside: avoid; break-inside: avoid;">
            <div style="font-size:9pt;font-weight:bold;background:#c8c8c8;padding:3px 6px;
                        border:1px solid #999;margin-bottom:4px;">Declaration</div>
            <div style="border:1px solid #ddd;border-radius:3px;padding:6px 10px;background:#fafafa;">
                ${declarationItems}
            </div>
         </div>`;

    // ── ACTIVITY LOG (read from live DOM) ─────────────────────────────────────
    let activityRows = "<tr><td colspan='3' style='text-align:center;color:#888;font-style:italic;'>No activity recorded.</td></tr>";
    let countBadgeHtml = `<div class="section-heading" style="margin-top:8px;">Activity Log</div>`;

    if (activityEl) {
        // Look for activity items (looser selector in case classes change)
        const allItems = Array.from(activityEl.querySelectorAll(".flex.items-start"));
        const items = allItems.filter(item => item.querySelector(".text-xs.font-semibold"));
        
        if (items.length > 0) {
            activityRows = items
                .map((item) => {
                    const nameEl   = item.querySelector(".text-xs.font-semibold");
                    const name     = nameEl?.textContent?.trim() || "Unknown";
                    
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
                        ? `${name}<span class="designation">${designation}</span>`
                        : name;

                    return `
                    <tr>
                        <td>${nameCell}</td>
                        <td>${finalComment}</td>
                        <td style="white-space:nowrap;">${time}</td>
                    </tr>`;
                })
                .join("");
                
            // Update the template to include the activity count badge
            countBadgeHtml = `<div class="section-heading" style="margin-top:8px; display:flex; align-items:center;">Activity Log <span style="background:#f4f4f5; color:#52525b; padding:2px 8px; border-radius:12px; font-size:8pt; font-weight:bold; margin-left:8px; line-height:1;">${items.length}</span></div>`;
        }
    }

    // ── ATTACHMENTS (Images / PDFs printed on new pages) ──────────────────────
    const attachments = Object.entries(data)
        .filter(([k, v]) => isFilePath(v) && !SKIP_FIELDS.has(k) && !k.startsWith("_"))
        .map(([k, v]) => ({ key: k, url: v as string }));

    let attachmentsHtml = "";
    if (attachments.length > 0) {
        attachmentsHtml = attachments.map((att, idx) => {
            const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(att.url);
            const isPdf = /\.pdf$/i.test(att.url);
            const fileName = att.url.split('/').pop() || "Document";
            // Ensure absolute URL if not present, though browsers often resolve root-relative paths in print frames automatically
            let safeUrl = encodeURI(att.url);
            
            // Map any /files/... custom document paths directly to the MinIO proxy
            safeUrl = safeUrl.replace(/^\/files\/(standerdized_purchase|direct_purchase|indent_cum_sanction_sheet)/, "/prod-rnd-files/$1");

            // For raw relative paths like standerdized_purchase/..., prepend /prod-rnd-files/
            if (!safeUrl.startsWith("http") && !safeUrl.startsWith("/files") && !safeUrl.startsWith("/private") && !safeUrl.startsWith("/prod-rnd-files") && !safeUrl.startsWith("/appwrite")) {
                safeUrl = "/prod-rnd-files" + (safeUrl.startsWith("/") ? "" : "/") + safeUrl;
            }

            const src = getFileUrl(decodeURI(safeUrl));

            let content = "";
            if (isImg) {
                content = `
                <div style="page-break-before: always; padding-top: 20px; font-family: sans-serif;">
                    <div style="text-align:center;">
                        <img src="${src}" style="max-width:100%; max-height:90vh; object-fit:contain; border:1px solid #e4e4e7; border-radius:8px;" />
                    </div>
                </div>`;
            } else if (isPdf) {
                content = `
                <div class="print-hide" style="padding:30px 20px; text-align:center; border:2px dashed #cbd5e1; background:#f8fafc; border-radius:12px; margin-top: 30px;">
                    <div style="font-size:32px; margin-bottom:12px;">📄</div>
                    <div style="font-size:14pt; font-weight:bold; color:#334155; margin-bottom:8px;">PDF Attachment: ${fileName}</div>
                    <div style="font-size:11pt; color:#64748b; margin-bottom:16px;">This document has multiple pages. Please print it separately.</div>
                    <a href="${src}" target="_blank" style="display:inline-block; padding:10px 24px; background:#2563eb; color:white; text-decoration:none; border-radius:6px; font-weight:bold; font-family:sans-serif;">Print Attached File</a>
                </div>`;
            } else {
                content = `
                <div class="print-hide" style="padding:20px; text-align:center; border:1px solid #e4e4e7; background:#fafaf9; border-radius:8px; margin-top: 30px;">
                     <strong>Attachment:</strong> <a href="${src}" target="_blank" style="color:#2563eb;">${fileName}</a>
                </div>`;
            }

            return content;
        }).join("\n");
    }

    // ── Timestamp ─────────────────────────────────────────────────────────────
    const currentTime = new Date().toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
    });

    // ── Fill template ─────────────────────────────────────────────────────────
    return dpTemplate
        .replace('<div class="section-heading" style="margin-top:8px;">Activity Log</div>', countBadgeHtml)
        .replace("{{DOC_REF}}",           data.name            || "")
        .replace("{{WORKFLOW_STATE}}",    data.workflow_state  || "")
        .replace("{{DATE}}",              fmtDate(data.creation))
        .replace("{{CURRENT_TIME}}",      currentTime)
        .replace("{{PROJECT_NUMBER}}",    data.project_no || data.project_name || "—")
        .replace("{{DECLARATIONS}}",      declarationsHtml)
        .replace("{{INFO_ROWS}}",         infoRows)
        .replace("{{ITEM_ROWS}}",         itemRows)
        .replace("{{TOTAL_ESTIMATE}}",    fmtNum(totalEstimate))
        .replace("{{ACTIVITY_ROWS}}",     activityRows)
        .replace("{{ATTACHMENTS}}",       attachmentsHtml);
}
