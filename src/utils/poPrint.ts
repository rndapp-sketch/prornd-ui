import poTemplate from "@/pages/printformat/po_format.html?raw";

const fmt = (val: any) => {
    const n = Number(val);
    if (!val && val !== 0) return "";
    if (isNaN(n)) return String(val);
    return n.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

export const DEFAULT_TERMS = `<ol>
<li><strong>Reference for Correspondence:</strong> The Purchase Order (P.O.) Number indicated above must be mentioned in all future correspondence related to this order, including: Order Acknowledgement, Bank Guarantee, Proforma Invoice, Challan, Final Bill, Money Receipt, Packages, etc.</li>
<li><strong>Vendor Profile:</strong> The vendor is required to fill in Form VP(1) (enclosed herewith) and submit the same along with the bills/invoice. <em>Note: Submission of this form is mandatory as payment will be made through ECS only.</em></li>
<li><strong>Price:</strong> Price inclusive of all duties and taxes and on F.O.R. basis to IIT Guwahati.</li>
<li><strong>Delivery:</strong>
  <ul>
    <li>Time Limit: Maximum within the stipulated period from the date of receipt of this Purchase Order.</li>
    <li>Safe Delivery Responsibility of Supplier: All aspects of safe delivery shall be the exclusive responsibility of the vendor.</li>
    <li>Insurance: The supplier must establish "All Risk Transit Insurance" coverage till door delivery at IIT Guwahati.</li>
    <li>Part Delivery: Part delivery is not allowed.</li>
  </ul>
</li>
<li><strong>Payment:</strong> 100% payment against delivery, installation, and acceptance of ordered goods in good condition at IIT Guwahati.</li>
<li><strong>Warranty:</strong> 01 year from the date of delivery, installation, and acceptance of ordered goods in good condition at IIT Guwahati. Warranty certificate must be enclosed along with the equipment.</li>
</ol>`;

export function generatePOHtml(poData: Record<string, any>): string {
    const rows: any[] = Array.isArray(poData.table_bttk)
        ? poData.table_bttk
        : [];

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
        poData.ss_total_es_basic_value
            ? `<tr><td colspan="9">Total Estimated Basic Value:</td><td class="right">${fmt(poData.ss_total_es_basic_value)}</td></tr>`
            : "",
        poData.ss_pack_forward
            ? `<tr><td colspan="9">Packing &amp; Forwarding:</td><td class="right">${fmt(poData.ss_pack_forward)}</td></tr>`
            : "",
        poData.ss_freight
            ? `<tr><td colspan="9">Freight:</td><td class="right">${fmt(poData.ss_freight)}</td></tr>`
            : "",
        poData.ss_other_charges
            ? `<tr><td colspan="9">Other Charges:</td><td class="right">${fmt(poData.ss_other_charges)}</td></tr>`
            : "",
        poData.ss_grand_total
            ? `<tr><td colspan="9"><strong>Grand Total:</strong></td><td class="right"><strong>${fmt(poData.ss_grand_total)}</strong></td></tr>`
            : "",
    ].join("");

    return poTemplate
        .replace("{{VENDOR_ADDRESS}}", poData.vendor_address || poData.ss_name_of_firms || "")
        .replace("{{PO_NUMBER}}", poData.po_number || poData.name || "")
        .replace("{{PO_DATE}}", poData.po_date || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }))
        .replace("{{QUOTATION_NO}}", poData.quotation_no || "")
        .replace("{{ITEM_ROWS}}", itemRows)
        .replace("{{SUMMARY_ROWS}}", summaryRows)
        .replace("{{AMOUNT_IN_WORDS}}", poData.amount_in_words || "")
        .replace("{{ACCOUNT_HEAD}}", poData.ss_account_head || "")
        .replace("{{PROJECT_NO}}", poData.project_no || "")
        .replace("{{FILE_NUMBER}}", poData.ss_file_number || "")
        .replace("{{SIGNEE_NAME}}", poData.signee_name || "")
        .replace("{{SIGNEE_DESIGNATION}}", poData.signee_designation || "")
        .replace("{{TERMS_AND_CONDITIONS}}", poData.terms_and_conditions || DEFAULT_TERMS);
}
