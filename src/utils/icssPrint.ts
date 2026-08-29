import icssTemplate from "@/pages/printformat/icss_format.html?raw";
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
    "name", "creation", "modified", "modified_by", "owner", "docstatus",
    "idx", "doctype", "parent", "parenttype", "parentfield",
    "_user_tags", "_comments", "_assign", "_liked_by", "_seen",
    "table_qanf", "table_bttk",                      // shown separately
    "naming_series", "amended_from",                 // system
    "project_name", "project_no", "project_ref",     // shown in header
    "po_number", "po_date",                          // purchase order fields
    "dec_1", "dec_2", "dec_3", "dec_4",              // declarations
    "sp_dec_1", "sp_dec_2", "sp_dec_3", "sp_dec_4",
    "dp_dec_1", "dp_dec_2", "dp_dec_3", "dp_dec_4",
    "pp_dec_1", "pp_dec_2", "pp_dec_3", "pp_dec_4",
    "rr_dec_1", "rr_dec_2", "rr_dec_3", "rr_dec_4",
    "amc_dec_1", "amc_dec_2", "amc_dec_3", "amc_dec_4",
    "workflow_state", "send_to_director", "director_approval_required", "child_document",
    "sub_doctype_reference", "child_doctype",
    "sp_applicant_name", "sp_webmail_id", "sp_department", "sp_designation",
    "sp_applying_for", "sp_indent_type", "sp_account_head", 
    "sp_indent_cum_sanction_sheet_id", "sp_self_other",
    "dp_applicant_name", "dp_webmail_id", "dp_department", "dp_designation",
    "dp_applying_for", "dp_indent_type", "dp_account_head", 
    "dp_indent_cum_sanction_sheet_id", "dp_self_other",
    "pp_applicant_name", "pp_webmail_id", "pp_department", "pp_designation",
    "pp_applying_for", "pp_indent_type", "pp_account_head", 
    "pp_indent_cum_sanction_sheet_id", "pp_self_other",
    "indent_cum_sanction_sheet_id", "self_other", "department", "applicant_name", "webmail_id", "applying_for", "indent_type", "account_head", "designation",
]);

const FIELD_LABELS: Record<string, string> = {
    icss_applicant_name: "Applicant Name",
    icss_applicant_webmail_id: "Webmail ID",
    icss_applicant_department__centre__section: "Applicant Department / Centre / Section",
    icss_applicant_designation: "Designation",
    icss_indent_type: "Indent Type",
    icss_account_head: "Account Head",
    icss_applying_for: "Applying For",
    project_ref: "Project Reference",
    total_estimate: "Total Estimate (₹)",
    principal_supplier: "Principal Supplier",
    icss_principal_supplier: "Principal Supplier",
    pp_estimated_basic_value: "Total Estimated Basic Value",
    pp_grand_total: "Grand Total",
    pp_mode_of_payment: "Mode Of Payment",
    pp_delivery_period: "Delivery Period",
    pp_warranty: "Warranty",
    pp_supplier_details: "Supplier Name & Address",
    pp_supplier_email: "Supplier Email Id",
    pp_indenter_contact_number: "Indenter Contact Number",
    pp_sanctioned_by_funding_agency: "Were The Above Items Sanctioned By The Funding Agency?",
};

const BOOL_FIELDS = new Set([
    "is_foreign", "is_sanctioned", "dec_1", "dec_2", "dec_3", "dec_4"
]);

const AMOUNT_FIELDS = new Set([
    "total_estimate", "estimated_amount_total_price_in_rs",
    "estimatedprice", "item_unit_price", "dp_total_price",
    "total_estimated_amount_in_rs",
]);

const isFilePath = (val: any): boolean => {
    if (typeof val !== "string") return false;
    const isUrl = val.startsWith("http://") || val.startsWith("https://") || val.startsWith("/");
    return isUrl && /\.(pdf|jpg|jpeg|png|gif|webp)$/i.test(val);
};

// Preferred display order for info rows
const ORDERED_FIELDS = [
    "icss_applicant_name", "icss_applicant_webmail_id", "icss_applicant_department__centre__section", "icss_applicant_designation",
    "icss_applying_for", "icss_indent_type", "icss_account_head", "total_estimate"
];

// Real on-screen label for a field, scraped straight from its <label for="fieldname">
// element (see extractLabelMap below) — this is what the user actually sees on the
// form, so it always wins over the guessed fallback ("Value Type" for amc_value_type
// instead of the real "Value Of The AMC Is In").
const fmtLabel = (key: string, domLabelMap: Record<string, string> = {}): string =>
    domLabelMap[key] ||
    FIELD_LABELS[key] ||
    key.replace(/^(sp_|icss_|dp_|pp_|rr_|amc_|rate_contract_)/, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const fmtValue = (key: string, val: any, data: Record<string, any> = {}, domMap: Record<string, string> = {}, linkOpts: Record<string, any[]> = {}, domLabelMap: Record<string, string> = {}): string => {
    if (BOOL_FIELDS.has(key)) return yesNo(val);
    if (AMOUNT_FIELDS.has(key) && !isNaN(Number(val)))
        return "₹ " + fmtNum(val);

    if (linkOpts[key]) {
        const match = linkOpts[key].find((o: any) => o.value === String(val));
        if (match && match.label && match.label !== String(val)) return match.label;
    }
    if (key === "department" && linkOpts["Department_prornd"]) {
        const match = linkOpts["Department_prornd"].find((o: any) => o.value === String(val));
        if (match && match.label && match.label !== String(val)) return match.label;
    }

    const label = fmtLabel(key, domLabelMap).toLowerCase();
    if (domMap[label] && domMap[label] !== String(val)) return domMap[label];
    if (key === "department" && domMap["applicant department / centre / section"] && domMap["applicant department / centre / section"] !== String(val)) {
        return domMap["applicant department / centre / section"];
    }
    
    const nameField = data[key + "_name"];
    if (nameField && typeof nameField === "string" && nameField.trim() !== "")
        return nameField;
        
    return String(val ?? "—");
};

// ─── Main Generator ───────────────────────────────────────────────────────────

export function generateIcssHtml(
    data: Record<string, any>,
    activityEl: HTMLElement | null = null,
    detailsEl: HTMLElement | null = null,
    subDetailsEl: HTMLElement | null = null,
    workflowEl: HTMLElement | null = null,
    linkOptions: Record<string, any[]> = {}
): string {

    const domDisplayMap: Record<string, string> = {};

    const extractFromEl = (el: HTMLElement | null) => {
        if (!el) return;
        el.querySelectorAll(".truncate, label span, .text-\\[10px\\] span").forEach((labelEl) => {
            const card = labelEl.closest(".flex-col, .flex, .min-w-0");
            if (!card) return;
            const valueEl = card.querySelector("p, .text-\\[13px\\], .flex.min-h-10, input, textarea, select");
            if (labelEl && valueEl) {
                const labelKey = labelEl.textContent?.trim().toLowerCase() || "";
                let value = valueEl.textContent?.trim() || "";
                if (valueEl.tagName === "INPUT" || valueEl.tagName === "TEXTAREA" || valueEl.tagName === "SELECT") {
                    value = (valueEl as HTMLInputElement).value?.trim() || value;
                }
                if (labelKey && value) domDisplayMap[labelKey] = value;
            }
        });
    };

    extractFromEl(detailsEl);
    extractFromEl(subDetailsEl);

    // Real field labels, keyed by fieldname via each field's own <label for="fieldname">
    // element — lets the print show "Value Of The AMC Is In" instead of a guessed
    // "Value Type", and (below) lets us tell which data keys the on-screen form
    // actually renders a field for at all, vs. hidden backend-only companion values.
    const extractLabelMap = (el: HTMLElement | null): Record<string, string> => {
        const map: Record<string, string> = {};
        if (!el) return map;
        el.querySelectorAll("label[for]").forEach((labelEl) => {
            const forAttr = labelEl.getAttribute("for");
            if (!forAttr) return;
            const clone = labelEl.cloneNode(true) as HTMLElement;
            clone.querySelectorAll(".text-red-500, .ml-1").forEach((n) => n.remove());
            const text = clone.textContent?.trim();
            if (text) map[forAttr] = text;
        });
        return map;
    };
    const domLabelMap: Record<string, string> = {
        ...extractLabelMap(detailsEl),
        ...extractLabelMap(subDetailsEl),
    };

    const seen = new Set<string>();

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
                !isFilePath(data[k])
        ),
    ];

    const infoEntries: [string, any][] = allScalarKeys
        .filter((k) => {
            if (seen.has(k)) return false;
            seen.add(k);
            if (SKIP_FIELDS.has(k)) return false;
            if (k.startsWith("_")) return false;
            if (k.endsWith("_name") && data[k.slice(0, -5)] !== undefined) return false;
            if (k.includes("declaration") || k.includes("checkbox") || k.includes("accept") || k.startsWith("certify_") || k === "rate_contract_packing" || /dec_\d$/.test(k)) return false;
            // AMC's "value or percentage" toggle — only the mode actually chosen is
            // meaningful; the other one sits at 0 and shouldn't print as real data.
            if (k === "amc_value_percentage" && data.amc_value_type === "Value") return false;
            if (k === "amc_value" && data.amc_value_type === "Percentage") return false;
            const v = data[k];
            if (Array.isArray(v) || typeof v === "object" || v === null || v === undefined || v === "") return false;
            return true;
        })
        .map((k) => [k, data[k]]);


    // A label this long (a full question, e.g. "Whether The Services Rendered During
    // The Previous Year Have Been Satisfactory Or Not") wraps across many lines when
    // squeezed into the 20%-wide label column, making that one row tall enough that
    // page-break-inside:avoid pushes it whole onto the next page — leaving a large
    // blank gap at the bottom of the previous one. Long-label fields get their own
    // full-width row (label above value) instead of being paired into two columns.
    const LONG_LABEL_THRESHOLD = 60;
    const isLongLabelField = (k: string): boolean => fmtLabel(k, domLabelMap).length > LONG_LABEL_THRESHOLD;

    let infoRows = "";
    let i = 0;
    while (i < infoEntries.length) {
        const [k1, v1] = infoEntries[i];
        if (isLongLabelField(k1)) {
            infoRows += `<tr>
                <td class="lbl" colspan="4">
                    <div>${fmtLabel(k1, domLabelMap)}</div>
                    <div style="font-weight:normal;margin-top:3px;">${fmtValue(k1, v1, data, domDisplayMap, linkOptions, domLabelMap)}</div>
                </td>
            </tr>\n`;
            i += 1;
            continue;
        }

        const pair = infoEntries[i + 1] && !isLongLabelField(infoEntries[i + 1][0]) ? infoEntries[i + 1] : null;
        infoRows += `<tr>
            <td class="lbl">${fmtLabel(k1, domLabelMap)}</td>
            <td class="val">${fmtValue(k1, v1, data, domDisplayMap, linkOptions, domLabelMap)}</td>
            ${pair
                ? `<td class="lbl">${fmtLabel(pair[0], domLabelMap)}</td><td class="val">${fmtValue(pair[0], pair[1], data, domDisplayMap, linkOptions, domLabelMap)}</td>`
                : `<td></td><td></td>`
            }
        </tr>\n`;
        i += pair ? 2 : 1;
    }

    const itemsTableField = Object.keys(data).find(k => Array.isArray(data[k]) && data[k].length > 0 && typeof data[k][0] === "object" && (k.startsWith("table_") || ["details_of_items_to_be_purchased", "items", "icss_items", "rate_contract_items"].includes(k)));
    const qanfRows: any[] = itemsTableField ? data[itemsTableField] : (Array.isArray(data.table_qanf) ? data.table_qanf : []);
    
    const EXCLUDE_ITEM_KEYS = new Set([
        "name", "owner", "creation", "modified", "modified_by", "parent", "parentfield", "parenttype", "idx", "docstatus",
        "item_name", "item_description", "description", "icss_item_name", "icss_item_description",
        "quantity", "qty", "quantity_no", "icss_qty",
        "unit_price", "estimated_price", "item_unit_price", "unit_rate", "icss_rate",
        "amount", "estimated_amount_total_price_in_rs", "dp_total_price", "total_price", "icss_amount",
        "_user_tags", "_comments", "_assign", "_liked_by", "_seen", "doctype",
        "icss_discount_percent", "icss_gst_percent", "justification", "icss_justification"
    ]);

    const itemRows = qanfRows
        .map(
            (row, i) => {
                let itemName = row.icss_item_name || row.item_name || row.item_description || row.description || "—";
                
                const extraProps: string[] = [];
                for (const key of Object.keys(row)) {
                    if (!EXCLUDE_ITEM_KEYS.has(key) && typeof row[key] !== "object" && row[key] !== null && row[key] !== "") {
                        const label = key.replace(/^(sp_|icss_|dp_)/, "").split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                        extraProps.push(`<b>${label}:</b> ${row[key]}`);
                    }
                }
                
                let extraHtml = "";
                let itemDesc = row.icss_item_description || row.item_description || row.description || "";
                if (itemDesc && itemDesc !== itemName) {
                    extraHtml += `<div style="font-size: 8.5pt; color: #444; margin-top: 4px;">${itemDesc}</div>`;
                }
                let justification = row.icss_justification || row.justification || "";
                if (justification) {
                    extraHtml += `<div style="font-size: 8.5pt; color: #444; margin-top: 4px;"><b>Justification:</b> ${justification}</div>`;
                }
                if (extraProps.length > 0) {
                    extraHtml += `<div style="font-size: 8pt; color: #555; margin-top: 4px;">${extraProps.join(" | ")}</div>`;
                }

                return `
        <tr>
            <td class="c">${i + 1}</td>
            <td>${itemName}${extraHtml}</td>
            <td class="c">${row.icss_qty ?? row.quantity ?? row.qty ?? row.quantity_no ?? 0}</td>
            <td class="r">${fmtNum(row.icss_rate ?? row.unit_price ?? row.estimated_price ?? row.item_unit_price ?? row.unit_rate ?? 0)}</td>
            <td class="r">${fmtNum(row.icss_amount ?? row.amount ?? row.estimated_amount_total_price_in_rs ?? row.dp_total_price ?? row.total_price ?? 0)}</td>
        </tr>`;
            }
        )
        .join("");

    const totalEstimate = Number(
        data.pp_grand_total ||
        data.sp_grand_total ||
        data.rr_grand_total ||
        data.amc_grand_total ||
        data.icss_amc_grand_total ||
        data.rate_contract_grand_total ||
        data.grand_total ||
        data.total_estimate ||
        data.total_estimated_amount_in_rs ||
        data.rate_contract_total ||
        0
    );

    let declarationsHtml = "";
    const declWrappers = [detailsEl, subDetailsEl].filter(Boolean) as HTMLElement[];
    if (declWrappers.length > 0) {
        const checkboxLabels = declWrappers.flatMap(el => Array.from(el.querySelectorAll("label")).filter(l => l.querySelector('input[type="checkbox"]')));
        if (checkboxLabels.length > 0) {
            const declItems = checkboxLabels.map(label => {
                const input = label.querySelector('input[type="checkbox"]') as HTMLInputElement;
                const isChecked = input?.checked || false;
                const textSpan = Array.from(label.querySelectorAll("span")).find(s => s.textContent && s.textContent.length > 10);
                const text = textSpan?.textContent?.trim() || label.textContent?.trim() || "";
                
                const chk = isChecked
                    ? `<span style="font-size:12pt;line-height:1;">&#9745;</span>`
                    : `<span style="font-size:12pt;line-height:1;">&#9744;</span>`;
                    
                return `<div style="display:flex;align-items:flex-start;gap:8px;margin:4px 0;font-size:9pt;">
                    <span style="flex-shrink:0;margin-top:1px;">${chk}</span>
                    <span>${text}</span>
                 </div>`;
            }).join("");

            declarationsHtml = `
            <div class="declaration" style="margin-top:8px; page-break-inside: avoid; break-inside: avoid;">
                <div style="font-size:9pt;font-weight:bold;background:#c8c8c8;padding:3px 6px; border:1px solid #999;margin-bottom:4px;">Declaration</div>
                <div style="border:1px solid #ddd;border-radius:3px;padding:6px 10px;background:#fafafa;">
                    ${declItems}
                </div>
            </div>`;
        }
    }

    let activityRows = "<tr><td colspan='3' style='text-align:center;color:#888;font-style:italic;'>No activity recorded.</td></tr>";
    let countBadgeHtml = `<div class="section-heading" style="margin-top:8px;">Activity Log</div>`;

    if (activityEl) {
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
        }
    }

    const attachments = Object.entries(data)
        .filter(([k, v]) => isFilePath(v) && !SKIP_FIELDS.has(k) && !k.startsWith("_"))
        .map(([k, v]) => ({ key: k, url: v as string }));

    let attachmentsHtml = "";
    if (attachments.length > 0) {
        attachmentsHtml = attachments.map((att, idx) => {
            const isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(att.url);
            const isPdf = /\.pdf$/i.test(att.url);
            const fileName = att.url.split('/').pop() || "Document";
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
                // PDF attachments get a clean on-screen button to print separately, but completely hide on physical paper.
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

    const currentTime = new Date().toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
    });

    return icssTemplate
        .replace('<div class="section-heading" style="margin-top:8px;">Activity Log</div>', countBadgeHtml)
        .replace("{{DOC_REF}}",           data.name            || "")
        .replace("{{WORKFLOW_STATE}}",    data.workflow_state  || "")
        .replace("{{DATE}}",              fmtDate(data.creation))
        .replace("{{CURRENT_TIME}}",      currentTime)
        .replace("{{PROJECT_NUMBER}}",    data.project_no || data.project_ref || data.project_name || "—")
        .replace("{{INFO_ROWS}}",         infoRows)
        .replace("{{ITEM_ROWS}}",         itemRows)
        .replace("{{TOTAL_ESTIMATE}}",    fmtNum(totalEstimate))
        .replace("{{DECLARATIONS}}",      declarationsHtml)
        .replace("{{ACTIVITY_ROWS}}",     activityRows)
        .replace("{{ATTACHMENTS}}",       attachmentsHtml);
}
