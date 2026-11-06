import travelDirectorTemplateRaw from "@/pages/printformat/travel_director_review_format.html?raw";
import { withFrappeBase } from "@/utils/frappeUrl";
const travelDirectorTemplate = withFrappeBase(travelDirectorTemplateRaw);


const fmtDate = (val: any): string => {
    if (!val) return "-";
    try {
        return new Date(val).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    } catch {
        return String(val);
    }
};

const fmtAmount = (val: any): string => {
    const n = Number(val) || 0;
    return `₹ ${n.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};

const esc = (val: any): string => {
    if (val === null || val === undefined || val === "") return "-";
    return String(val);
};

const yesNo = (val: any): string => (val ? "Yes" : "No");

// Attach fields store a file URL when present — show the filename (or a
// generic "Attached" note) rather than the raw URL, and "Not attached"
// otherwise.
const attachmentLabel = (val: any): string => {
    if (!val || typeof val !== "string") return "Not attached";
    const name = val.split("/").pop();
    return name || "Attached";
};

function buildEstimateAttachmentsHtml(data: Record<string, any>): string {
    const items = [
        { label: "Travel", value: data.est_travel_file },
        { label: "Registration", value: data.est_reg_file },
        { label: "Accommodation", value: data.est_accom_file },
    ]
        .filter((i) => i.value)
        .map((i) => `${i.label}: ${attachmentLabel(i.value)}`);
    return items.length ? items.join(" · ") : "Not attached";
}

export interface SclBalanceData {
    is_eligible?: boolean;
    available_balance?: number;
    total_credited?: number;
    utilized_balance?: number;
    year?: number | string;
}

/**
 * Compact single-row summary of the applicant's real SCL balance (computed
 * server-side by get_travel_fields for the traveler, not the viewer) — a
 * plain table row that fits inside the existing "Special Casual Leave &
 * Leave Period" info-table, instead of the large standalone styled card
 * used on the applicant's live form.
 */
export function buildSclBalanceRow(sclBalance?: SclBalanceData | null): string {
    if (!sclBalance) return "";
    if (!sclBalance.is_eligible) {
        return `<tr>
            <td class="label">SCL Balance</td>
            <td colspan="3">Not eligible for Special Casual Leave.</td>
        </tr>`;
    }
    const year = sclBalance.year ? ` (${esc(sclBalance.year)})` : "";
    return `<tr>
        <td class="label">SCL Balance${year}</td>
        <td colspan="3">Available: <strong>${esc(sclBalance.available_balance)}</strong> &nbsp;|&nbsp; Credited: ${esc(sclBalance.total_credited)} &nbsp;|&nbsp; Utilized: ${esc(sclBalance.utilized_balance)}</td>
    </tr>`;
}

const isEmptyPrintValue = (text: string): boolean => {
    const t = text.trim();
    // zero amounts are blank estimate lines
    return t === "" || t === "-" || t === "Not attached" || /^₹\s*0\.00$/.test(t);
};

/**
 * Drops every label/value pair whose value is empty, then any row, table and
 * section heading left with nothing under it (and empty remarks blocks), so
 * the plain print only shows fields the applicant actually filled in.
 */
function pruneEmptyFields(html: string): string {
    const doc = new DOMParser().parseFromString(html, "text/html");

    // the workflow state is internal status, not part of the plain print
    // (remove its wrapper too, so the Date moves to the right edge)
    doc.querySelectorAll(".status-badge").forEach((el) => (el.parentElement ?? el).remove());
    // the plain print has no signature boxes
    doc.querySelectorAll(".signature-row").forEach((el) => el.remove());

    doc.querySelectorAll("table.info-table").forEach((table) => {
        table.querySelectorAll("tr").forEach((tr) => {
            const cells = Array.from(tr.children) as HTMLElement[];
            for (let i = 0; i + 1 < cells.length; i += 2) {
                const label = cells[i];
                const value = cells[i + 1];
                if (!label.classList.contains("label")) continue;
                if (isEmptyPrintValue(value.textContent || "")) {
                    label.remove();
                    value.remove();
                }
            }
            const left = Array.from(tr.children) as HTMLElement[];
            if (left.length === 0) {
                tr.remove();
            } else if (left.length === 2) {
                // a lone pair should span the full row width
                left[1].setAttribute("colspan", "3");
            }
        });
        if (!table.querySelector("tr")) {
            const prev = table.previousElementSibling;
            if (prev?.classList.contains("section-title")) prev.remove();
            table.remove();
        }
    });

    doc.querySelectorAll(".remarks").forEach((el) => {
        if (isEmptyPrintValue(el.textContent || "")) {
            const prev = el.previousElementSibling;
            if (prev?.classList.contains("section-title")) prev.remove();
            el.remove();
        }
    });

    return "<!DOCTYPE html>\n" + doc.documentElement.outerHTML;
}

/**
 * Builds the printable "review for Director approval" HTML for a Travel
 * application — a full review of every field on the applicant's form, which
 * the Dean prints and physically forwards to the Director for sign-off.
 * See docs/travel-director-approval-implementation.md.
 */
export function generateTravelDirectorReviewHtml(
    data: Record<string, any>,
    resolvedAccountHead = "",
    resolvedDepartment = "",
    declarationsHtml = "",
    activityLogHtml = "",
    sclBalanceRow = "",
    resolvedProjectTitle = "",
    variant: "director" | "general" = "director",
): string {
    const isDirector = variant === "director";
    const docTitle = isDirector
        ? "Travel Application — Review for Director Approval"
        : "Travel Application";
    const signatureBoxes = isDirector
        ? `<div class="signature-box">Dean, R&amp;D</div>
                <div class="signature-box">Director<span class="sig-note">(Signature &amp; Seal)</span></div>`
        : "";
    const html = travelDirectorTemplate
        .replace(/\{\{DOC_TITLE\}\}/g, docTitle)
        .replace("{{SIGNATURE_BOXES}}", () => signatureBoxes)
        // Function replacer — all raw HTML fetched/built from elsewhere (doctype
        // HTML-fieldtype content / activity log comments / SCL balance row) and
        // may contain "$" characters, which String.replace would otherwise
        // interpret as a pattern token.
        .replace("{{DECLARATIONS_HTML}}", () => declarationsHtml || "")
        .replace("{{ACTIVITY_LOG_SECTION}}", () => activityLogHtml || "")
        .replace("{{SCL_BALANCE_ROW}}", () => sclBalanceRow || "")
        .replace("{{DOC_REF}}", esc(data.name))
        .replace("{{DATE}}", fmtDate(new Date()))
        .replace("{{WORKFLOW_STATE}}", esc(data.workflow_state || "Pending Dean Approval"))
        .replace("{{APPLICANT_NAME}}", esc(data.applicant_name_travel))
        .replace("{{APPLICANT_WEBMAIL}}", esc(data.webmail_id_travel))
        .replace("{{APPLICANT_DEPARTMENT}}", esc(resolvedDepartment || data.department_travel))
        .replace("{{APPLICANT_DESIGNATION}}", esc(data.designation_travel))
        // travel_project_title is a Link to Project Registration (stores its
        // docname, e.g. "110001") — not free text, so print the resolved
        // project_title fetched from that linked document instead of the raw value.
        .replace("{{PROJECT_TITLE}}", esc(resolvedProjectTitle || data.travel_project_title))
        .replace("{{PROJECT_NUMBER}}", esc(data.travel_project_number))
        .replace("{{IF_TRAVELER}}", esc(data.if_traveler))
        .replace("{{TRAVELER_WEBMAIL}}", esc(data.traveler_webmail_id))
        .replace("{{OTHER_TRAVELER}}", esc(data.other_traveler))
        .replace("{{OTHER_TRAVELER_ADDRESS}}", esc(data.other_traveler_address))
        .replace("{{NATURE_OF_TRAVEL}}", esc(data.nature_of_travel))
        .replace("{{VISIT_TYPE}}", esc(data.visit_type_travel))
        .replace("{{SPECIFY_TYPE_OF_VISIT}}", esc(data.specify_type_of_visit))
        .replace("{{VENUE_ADDRESS}}", esc(data.venue_address))
        .replace("{{ORGANIZING_AUTHORITY}}", esc(data.organizing_authority))
        .replace("{{FROM_DATE}}", fmtDate(data.from_date))
        .replace("{{TO_DATE}}", fmtDate(data.to_date))
        .replace("{{PURPOSE_OF_VISIT}}", esc(data.purpose_of_visit))
        .replace("{{FINANCIAL_ASSISTANCE}}", esc(data.travel_financial_assistance))
        .replace("{{NEED_ADVANCE}}", esc(data.do_you_need_advance))
        .replace("{{ACCOUNT_HEAD}}", esc(resolvedAccountHead || data.account_head))
        .replace("{{BANK_ACCOUNT_HOLDER}}", esc(data.bank_account_holder))
        .replace("{{BANK_ACCOUNT_NUMBER}}", esc(data.bank_account_number))
        .replace("{{IFSC_CODE}}", esc(data.ifsc_code))
        .replace("{{MODE_OF_TRAVEL}}", esc(data.travel_mode_of_travel))
        .replace("{{EST_TRAVEL_AMT}}", fmtAmount(data.est_travel_amt))
        .replace("{{EST_REG_AMT}}", fmtAmount(data.est_reg_amt))
        .replace("{{EST_ACCOM_AMT}}", fmtAmount(data.est_accom_amt))
        .replace("{{EST_OTHER_AMT}}", fmtAmount(data.est_other_amt))
        .replace("{{EST_OTHER_DESC}}", esc(data.est_other_desc))
        .replace("{{TOTAL_ESTIMATE}}", fmtAmount(data.total_estimate))
        .replace("{{ESTIMATE_ATTACHMENTS}}", buildEstimateAttachmentsHtml(data))
        .replace("{{SPECIAL_CASUAL_LEAVE}}", esc(data.travel_special_casual_leave))
        .replace("{{LEAVE_FROM_DATE}}", fmtDate(data.travel_leave_from_date))
        .replace("{{LEAVE_TO_DATE}}", fmtDate(data.travel_leave_to_date))
        .replace("{{SUPPORTING_DOCUMENTS}}", attachmentLabel(data.travel_supporting_documents))
        .replace("{{STATION_LEAVE_REQUIRED}}", esc(data.station_leave_required))
        .replace("{{STATION_LEAVE_FROM_DATE}}", fmtDate(data.travel_station_leave_from_date))
        .replace("{{STATION_LEAVE_FROM_SESSION}}", esc(data.travel_station_leave_from_session))
        .replace("{{STATION_LEAVE_TO_DATE}}", fmtDate(data.travel_station_leave_to_date))
        .replace("{{STATION_LEAVE_TO_SESSION}}", esc(data.travel_station_leave_to_session))
        .replace("{{ADDITIONAL_RESPONSIBILITY}}", esc(data.travel_additional_responsibility))
        .replace("{{ADDITIONAL_RESPONSIBILITY_DETAILS}}", esc(data.travel_additional_responsibility_details))
        .replace("{{ARRANGEMENT_DONE}}", esc(data.selection_arrangement))
        .replace("{{CLASSES_ARRANGEMENT}}", esc(data.travel_classes_arrangement))
        .replace("{{ADDITIONAL_COMMENT}}", esc(data.travel_comment_if_any))
        .replace("{{DECLARATION_ACCEPTED}}", yesNo(data.travel_declaration_accepted));
    return isDirector ? html : pruneEmptyFields(html);
}
