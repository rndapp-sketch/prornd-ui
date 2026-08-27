import poTemplate from "@/pages/printformat/dp_po_format.html?raw";
import { ToWords } from "to-words";

// The .html?raw template is static text pulled in at build time, so it can't
// reference import.meta.env itself; substitute the asset host here instead.
const ASSET_HOST = import.meta.env.VITE_ASSET_HOST || "172.16.117.39";
const ASSET_PORT = import.meta.env.VITE_ASSET_PORT || "8000";

const toWords = new ToWords({ localeCode: "en-IN", converterOptions: { ignoreDecimal: true } });

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
<li><strong>Reference for Correspondence:</strong> Our P.O. No. indicated above must be mentioned invariably in all future Correspondences such as Order Acknowledgement, Bank Guarantee, Proforma Invoice, Challan, Final Bill, Money receipt, Packages, etc. relating to this Order.</li>
<li><strong>Vendor Profile:</strong> The vendor is requested to fill in form VP (1), enclosed herewith, and submit the same along with the bills/invoice. This is mandatory as payment will be made by ECS only.</li>
<li><strong>Price:</strong> Price inclusive of all duties and taxes and F.O.R., {{PI_DEPARTMENT}} [Attn: {{PI_NAME}}{{PI_CONTACT}}], IIT Guwahati.</li>
<li><strong>Delivery:</strong>
  <ol>
    <li><strong>Time Limit:</strong> Maximum within 16-18 weeks from the date of receipt of this Purchase Order.</li>
    <li><strong>Safe Delivery responsibility of supplier:</strong> All aspects of safe delivery shall be the exclusive responsibility of the vendor. At the destination site, the package will be opened only in the presence of IITG user/representative and vendor's representative. The intact condition of the package and the seal/indicators for not being tampered with shall form the basis for certifying the receipt in good condition.</li>
    <li><strong>Insurance:</strong> The supplier is to establish &lsquo;All Risk Transit Insurance&rsquo; coverage till door delivery at IIT Guwahati.</li>
    <li><strong>Part Delivery:</strong> Part delivery is not allowed.</li>
  </ol>
</li>
<li><strong>Penalty for Delayed Delivery:</strong> The date of delivery shall be strictly adhered to, except in cases of Force Majeure or extension of the delivery date duly approved by IIT Guwahati. In the event of delayed delivery and acceptance by the end user, the vendor shall be liable for a penalty deduction at the rate of 0.5% per week or part thereof of the value of the entire consignment, subject to a maximum of 10% (ten percent).<br /><br />For the purpose of this clause, part of a week shall be treated as a full week. In case of delayed delivery, IIT Guwahati reserves the right not to accept the consignment.</li>
<li><strong>Payment:</strong> 100% payment against delivery, installation, and acceptance of ordered goods in good condition at IIT Guwahati.</li>
<li><strong>Warranty:</strong> 01 year from the date of delivery, installation, and acceptance of ordered goods in good condition at IIT Guwahati. Warranty certificate will have to be enclosed with the equipment.</li>
<li><strong>GST Deduction:</strong> GST Deduction at source as per Order/notification of the Govt. of India will be applicable.</li>
<li><strong>Bank Charges:</strong> All Bank and other charges to the supplier&rsquo;s account.</li>
<li><strong>Performance Bank Guarantee:</strong> The supplier shall furnish an unconditional Performance Bank Guarantee (PBG) in the form of a Fixed Deposit or Bank Guarantee (including e-Bank Guarantee) as per the format enclosed at ANNEXURE&ndash;II issued by any Commercial Bank of India, as per the prescribed slab indicated below. In case of foreign procurement, submission of the PBG by the local agent shall be mandatory. Where the PBG is issued by a foreign bank, the same shall be duly endorsed by its corresponding bank in India.<br /><br />
The validity of the PBG shall cover the entire warranty period plus an additional period of two (02) months from the date of installation/commissioning of the equipment.<br /><br />
In the event of failure to submit the PBG within the stipulated timeframe, IIT Guwahati reserves the right to withhold or deduct an amount equivalent to the PBG value from the payment due to the supplier, without requiring further consent. Such amount shall be retained until submission of the requisite PBG.<br /><br />
<table style="width: 100%; border-collapse: collapse; margin: 10px 0; border: 1px solid #000; font-size: 12px;">
  <thead>
    <tr style="background-color: #f0f0f0;">
      <th style="padding: 5px 6px; border: 1px solid #000; text-align: center; font-weight: bold;">Slab</th>
      <th style="padding: 5px 6px; border: 1px solid #000; text-align: center; font-weight: bold;">PO/ Contract Value</th>
      <th style="padding: 5px 6px; border: 1px solid #000; text-align: center; font-weight: bold;">PBG Rate</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding: 5px 6px; border: 1px solid #000; text-align: center;">1</td>
      <td style="padding: 5px 6px; border: 1px solid #000; text-align: center;">&#8377; 5,00,000/- to &#8377; 15,00,000/-</td>
      <td style="padding: 5px 6px; border: 1px solid #000; text-align: center;">3%</td>
    </tr>
    <tr>
      <td style="padding: 5px 6px; border: 1px solid #000; text-align: center;">2</td>
      <td style="padding: 5px 6px; border: 1px solid #000; text-align: center;">&#8377; 15,00,000/- to &#8377; 25,00,000/-</td>
      <td style="padding: 5px 6px; border: 1px solid #000; text-align: center;">4%</td>
    </tr>
    <tr>
      <td style="padding: 5px 6px; border: 1px solid #000; text-align: center;">3</td>
      <td style="padding: 5px 6px; border: 1px solid #000; text-align: center;">Above &#8377; 25,00,000/-</td>
      <td style="padding: 5px 6px; border: 1px solid #000; text-align: center;">5%</td>
    </tr>
  </tbody>
</table>
<ol style="list-style-type: lower-roman; padding-left: 20px; margin-top: 10px;">
  <li>By submitting the PBG, the vendor is understood to have guaranteed that,
    <ol style="list-style-type: lower-alpha; padding-left: 20px; margin-top: 5px;">
      <li>The Purchase Order (PO) shall be executed as per the terms and conditions mentioned therein.</li>
      <li>The equipment shall function satisfactorily for a period up to 60 days after the warranty period.</li>
      <li>The equipment and components are free from poor workmanship, bad quality, and faulty designs.</li>
      <li>The vendor shall at his/their own cost rectify/replace the defects, if any, during the guarantee period.</li>
      <li>The guarantee is to the extent as per the slabs mentioned in the pre-page.</li>
    </ol>
  </li>
  <li style="margin-top: 10px;"><strong>Condition for invoking PBG:</strong> In case of failure to comply with the guarantees above, IITG may terminate the contract/purchase order in whole or in part and forfeit the PBG. In addition, IITG may, at its discretion, procure upon such terms and in such manner as it deems appropriate, goods similar to the undelivered items/products, and the defaulting supplier/vendor shall be liable to compensate IITG for any extra expenditure involved.</li>
</ol>
</li>
<li><strong>Termination for Default:</strong> Default is said to have occurred if the supplier fails to deliver within the specified time, fails to perform any other contractual obligation, or if the equipment/components are found to have poor workmanship, faulty design, poor performance, or bad quality of materials used. Under such circumstances, the Competent Authority, IITG may terminate the contract/purchase order in whole or in part and forfeit the EMD/PBG as applicable or impose any other penalty deemed fit. IITG may also procure similar goods/items elsewhere and recover the additional expenditure from the defaulting supplier.</li>
<li><strong>Applicable Law:</strong>
  <ol>
    <li>The contract shall be governed by the laws and procedures established by Govt. of India and subject to exclusive jurisdiction of Competent Court and Forum in Guwahati only.</li>
    <li>Any dispute arising out of this purchase shall be referred to the Director, IIT Guwahati. If either of the parties is dissatisfied with the decision, the dispute shall be referred to the decision of an Arbitrator, who should be acceptable to both the parties, and shall be appointed by the Director of IITG. The decision of such Arbitrator shall be final and binding on both the parties.</li>
  </ol>
</li>
</ol>`;

export const getFormattedTerms = (termsHtml: string, poData: Record<string, any>) => {
    if (!termsHtml) return "";
    const contactNo = poData.pi_phone || poData.applicant_phone || poData.applicant_mobile || poData.cell_phone_number || poData.phone_number || poData.contact_number || poData.mobile_no || poData.ss_applicant_phone || poData.ss_phone || "";
    const contactStr = contactNo ? `, Contact No. ${contactNo}` : "";
    return termsHtml
        .replace(/\{\{PI_DEPARTMENT\}\}/g, poData.ss_department_for_purchase || "Department of Physics")
        .replace(/\{\{PI_NAME\}\}/g, poData.ss_applicant_name || "Prof. Pravat Kumar Giri")
        .replace(/\{\{PI_CONTACT\}\}/g, contactStr)
        .replace(/\{\{PI_EMAIL\}\}/g, poData.owner || "giri@iitg.ac.in");
};

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

    // Build Account Head with IV (Indent Value) and SV (Sanction Value)
    // IV = Total Estimated Basic Value from sanction sheet (ss_total_es_basic_value)
    // SV = Grand Total from sanction sheet (ss_grand_total)
    const ivRaw = poData.dp_indent_value || poData.ss_total_es_basic_value;
    const ivStr = ivRaw !== undefined && ivRaw !== "" && Number(ivRaw) !== 0
        ? `IV: ₹${fmt(ivRaw)}`
        : "";
    const svStr = poData.ss_grand_total !== undefined && poData.ss_grand_total !== "" && Number(poData.ss_grand_total) !== 0
        ? `SV: ₹${fmt(poData.ss_grand_total)}`
        : "";
    const ivSvPart = [ivStr, svStr].filter(Boolean).join(", ");
    const accountHeadStr = poData.ss_account_head
        ? `${poData.ss_account_head}${ivSvPart ? ` (${ivSvPart})` : ""}`
        : "";

    return poTemplate
        .replace(/http:\/\/172\.16\.117\.39:8000/g, `http://${ASSET_HOST}:${ASSET_PORT}`)
        .replace("{{VENDOR_ADDRESS}}", poData.vendor_address || poData.ss_name_of_firms || "")
        .replace("{{PO_NUMBER}}", poData.po_number || poData.name || "")
        .replace("{{PO_DATE}}", poData.po_date || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }))
        .replace("{{QUOTATION_NO}}", poData.quotation_no || "")
        .replace("{{ITEM_ROWS}}", itemRows)
        .replace("{{SUMMARY_ROWS}}", summaryRows)
        .replace("{{AMOUNT_IN_WORDS}}", poData.amount_in_words || (poData.ss_grand_total ? toWords.convert(Number(poData.ss_grand_total)) : ""))
        .replace("{{ACCOUNT_HEAD}}", accountHeadStr)
        .replace("{{FILE_NUMBER}}", poData.ss_file_number || "")
        .replace("{{PO_CREATED_BY}}", poData.owner || "")
        .replace("{{SIGNEE_NAME}}", poData.signee_name || "")
        .replace("{{SIGNEE_DESIGNATION}}", poData.signee_designation || "")
        .replace("{{TERMS_AND_CONDITIONS}}", getFormattedTerms(poData.terms_and_conditions || DEFAULT_TERMS, poData));
}
