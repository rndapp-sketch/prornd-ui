import ssTemplate from "@/pages/printformat/sanction_sheet_format.html?raw";

// The .html?raw template is static text pulled in at build time, so it can't
// reference import.meta.env itself; substitute the asset host here instead.
const ASSET_HOST = import.meta.env.VITE_ASSET_HOST || "172.16.117.39";
const ASSET_PORT = import.meta.env.VITE_ASSET_PORT || "8000";

const fmt = (val: any) => {
    const n = Number(val);
    if (!val && val !== 0) return "";
    if (isNaN(n)) return String(val);
    return n.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

export function generateSanctionSheetHtml(
    formData: Record<string, any>,
): string {
    const rows: any[] = Array.isArray(formData.table_bttk)
        ? formData.table_bttk
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
            <td>${row.item_name || ""}</td>
            <td>${row.item_make || ""}</td>
            <td>${row.item_model || ""}</td>
            <td>${row.item_description || ""}</td>
            <td class="center">${row.item_quantity ?? ""}</td>
            <td class="right">${fmt(row.item_unit_price)}</td>
            <td class="right">${fmt(row.item_discount)}</td>
            <td class="right">${fmt(row.item_gst)}</td>
            <td class="right">${fmt(row.dp_total_price)}</td>
        </tr>`,
        )
        .join("");

    const summaryRows = [
        formData.ss_total_es_basic_value
            ? `<tr><td colspan="9">Total Estimated Basic Value:</td><td class="right">${fmt(formData.ss_total_es_basic_value)}</td></tr>`
            : "",
        formData.ss_pack_forward
            ? `<tr><td colspan="9">Packing &amp; Forwarding:</td><td class="right">${fmt(formData.ss_pack_forward)}</td></tr>`
            : "",
        formData.ss_freight
            ? `<tr><td colspan="9">Freight:</td><td class="right">${fmt(formData.ss_freight)}</td></tr>`
            : "",
        formData.ss_other_charges
            ? `<tr><td colspan="9">Other Charges:</td><td class="right">${fmt(formData.ss_other_charges)}</td></tr>`
            : "",
        formData.ss_grand_total
            ? `<tr><td colspan="9"><strong>Grand Total:</strong></td><td class="right"><strong>${fmt(formData.ss_grand_total)}</strong></td></tr>`
            : "",
    ].join("");

    const additionalTermsVal =
        formData.additional_terms_and_conditions_if_any ||
        formData.additional_terms_conditions ||
        formData.additional_terms ||
        "";
    const additionalTermsRow = additionalTermsVal
        ? `<tr><td class="label">Additional Terms &amp; Conditions</td><td colspan="3">${additionalTermsVal}</td></tr>`
        : "";

    const remarksVal = formData.small_text_adcz || formData.remarks || formData.ss_remarks || "";
    const remarksRow = remarksVal
        ? `<div class="remarks"><strong>Remarks:</strong> ${remarksVal}</div>`
        : "";

    return ssTemplate
        .replace(/http:\/\/172\.16\.117\.39:8000/g, `http://${ASSET_HOST}:${ASSET_PORT}`)
        .replace("{{FILE_NUMBER}}", formData.ss_file_number || "")
        .replace(
            "{{PROJECT_NO}}",
            formData.project_no || formData.project || formData.project_name || "",
        )
        .replace("{{DOC_REF}}", formData.name || "")
        .replace(
            "{{DIRECT_PURCHASE_REF}}",
            formData.direct_purchase || formData.app_id || "",
        )
        .replace("{{DATE}}", creation)
        .replace("{{SS_APPLICANT_NAME}}", formData.ss_applicant_name || "")
        .replace(
            "{{SS_YEAR_PERIOD}}",
            formData.ss_year_period_of_sanction || "",
        )
        .replace("{{SS_DEPARTMENT}}", formData.ss_department_for_purchase || "")
        .replace("{{SS_FUNDING_AGENCY}}", formData.ss_funding_agency || "")
        .replace("{{SS_ACCOUNT_HEAD}}", formData.ss_account_head || "")
        .replace("{{SS_FUNDS_ALLOCATED}}", fmt(formData.ss_funds_allocated))
        .replace("{{SS_BALANCE_AVAILABLE}}", fmt(formData.ss_balance_available))
        .replace(
            "{{SS_ACTUAL_EXPENDITURE}}",
            fmt(formData.ss_actual_expenditure),
        )
        .replace("{{SS_NAME_OF_FIRMS}}", formData.ss_name_of_firms || "")
        .replace("{{ITEM_ROWS}}", itemRows)
        .replace("{{SUMMARY_ROWS}}", summaryRows)
        .replace("{{SS_WARRANTY}}", formData.ss_warranty || "")
        .replace("{{SS_DELIVERY}}", formData.ss_delivery || "")
        .replace("{{SS_PAYMENT}}", formData.ss_payment || "")
        .replace("{{ADDITIONAL_TERMS_ROW}}", additionalTermsRow)
        .replace("{{REMARKS_ROW}}", remarksRow)
        .replace(
            "{{SS_DECLARATION}}",
            formData.html_dqce ||
                "Purchase made under direct procurement of the purchase committee up to 10 lakhs by submission of quotation(s).",
        );
}
