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

const normalizeIndentType = (value: any) =>
  String(value || "")
    .trim()
    .toLowerCase();

export const isAnnualMaintenanceContractIndent = (indentType: any) => {
  const normalized = normalizeIndentType(indentType);
  return (
    normalized.includes("annual maintenance contract") || normalized === "amc"
  );
};

export const getPoIndentTypeDisplayName = (indentType: any) => {
  const normalized = normalizeIndentType(indentType);

  if (normalized.includes("proprietary")) {
    return "Proprietary Purchase with Proprietary Certificate from the OEM";
  }

  if (
    normalized.includes("standardized") ||
    normalized.includes("standerdized") ||
    normalized.includes("emergent")
  ) {
    return "Standardized / Emergent Purchase";
  }

  if (
    normalized.includes("repair") ||
    normalized.includes("replacement") ||
    normalized.includes("repleacement")
  ) {
    return "Repair / Replacement";
  }

  if (isAnnualMaintenanceContractIndent(indentType)) {
    return "Annual Maintenance Contract";
  }

  if (normalized.includes("rate contract")) {
    return "Rate Contract Purchase";
  }

  return String(indentType || "Indent Cum Sanction Sheet").trim();
};

export const getPoTableConfig = (indentType: any) => {
  const normalized = normalizeIndentType(indentType);

  if (isAnnualMaintenanceContractIndent(indentType)) {
    return {
      title: "Details of AMC Services",
      columns: [
        { key: "serial", label: "Sl No", align: "center" },
        { key: "item_details", label: "Details of AMC Services" },
        { key: "item_quantity", label: "Qty", align: "center" },
        { key: "dp_total_price", label: "Amount", align: "right" },
      ],
    };
  }

  if (normalized.includes("rate contract")) {
    return {
      title: "Details of Items to be Purchased",
      columns: [
        { key: "serial", label: "Sl No", align: "center" },
        { key: "item_description", label: "Item Description" },
        { key: "item_cat_no", label: "Cat No." },
        { key: "item_page_no", label: "Page No." },
        { key: "item_unit_price", label: "Unit Rate", align: "right" },
        { key: "item_quantity", label: "Quantity", align: "center" },
        { key: "item_discount_percent", label: "Discount (%)", align: "right" },
        { key: "item_gst_percent", label: "GST (%)", align: "right" },
        { key: "dp_total_price", label: "Amount", align: "right" },
      ],
    };
  }

  return {
    title: "Details of Items to be Purchased",
    columns: [
      { key: "serial", label: "Sl No", align: "center" },
      { key: "item_name", label: "Item Name" },
      { key: "item_description", label: "Item Description" },
      { key: "item_justification", label: "Justification" },
      { key: "item_quantity", label: "Quantity", align: "center" },
      {
        key: "item_unit_price",
        label: "Estimated Rate (₹/item)",
        align: "right",
      },
      { key: "item_discount_percent", label: "Discount (%)", align: "right" },
      { key: "item_gst_percent", label: "GST (%)", align: "right" },
      { key: "dp_total_price", label: "Estimated Amount (₹)", align: "right" },
    ],
  };
};

export const DEFAULT_TERMS = `<ol>
<li><strong>Reference for Correspondence:</strong> Our P.O. No. indicated above must be mentioned invariably in all future correspondences such as Order Acknowledgement, Bank Guarantee, Proforma Invoice, Challan, Final Bill, Money Receipt, Packages, etc. relating to this order.</li>
<li><strong>Vendor Profile:</strong> The vendor is requested to fill in Form VP(1), enclosed herewith, and submit the same along with the bills/invoice. This is mandatory as payment will be made by ECS only.</li>
<li><strong>Price:</strong> Price inclusive of all duties and taxes and F.O.R. IIT Guwahati.</li>
<li><strong>Vendor Email ID:</strong> To be provided by the supplier in the order documentation.</li>
<li><strong>Delivery:</strong>
  <ol>
    <li><strong>Time Limit:</strong> Maximum within 4 to 6 weeks from the date of receipt of this Purchase Order.</li>
    <li><strong>Safe Delivery Responsibility of Supplier:</strong> All aspects of safe delivery shall be the exclusive responsibility of the vendor. At the destination site, the package will be opened only in the presence of IITG user/representative and vendor's representative. The intact condition of the package and the seal/indicators for not being tampered with shall form the basis for certifying the receipt in good condition.</li>
    <li><strong>Insurance:</strong> The supplier is to establish "All Risk Transit Insurance" coverage till door delivery at IIT Guwahati.</li>
    <li><strong>Part Delivery:</strong> Part delivery is not allowed.</li>
  </ol>
</li>
<li><strong>Payment:</strong> 100% payment against delivery, installation, and acceptance of ordered goods in good condition at IIT Guwahati.</li>
<li><strong>Warranty:</strong> One year against any manufacturing defects.</li>
<li><strong>GST Deduction:</strong>
  <ol>
    <li>GST Deduction at source as per order/notification of the Government.</li>
    <li>Supplier must issue B2B bills/invoices in favour of IIT Guwahati and mention the same in the billing address. Additionally, all bills/invoices must be promptly reported in the GST portal against IITG's GST number, failing which the bill may be withheld or the payment may be released without the GST amount.</li>
  </ol>
</li>
<li><strong>Road Permit / Form 62:</strong> If road permit is required, please send the Proforma Invoice along with your Order Acknowledgement. The Proforma Invoice is to bear the final value of ordered goods and complete address from which the goods are to be consigned. Once issued by the Sales Tax Authority, a road permit is valid for 60 days.</li>
<li><strong>Bank Charges:</strong> All bank and other charges shall be to the supplier's account.</li>
<li><strong>Termination for Default:</strong> Default is said to have occurred if the supplier fails to deliver within the specified time, fails to perform any other contractual obligation, or if the equipment/components are found to have poor workmanship, faulty design, poor performance, or bad quality of materials used. Under such circumstances, the Competent Authority, IITG may terminate the contract/purchase order in whole or in part and forfeit the EMD/PBG as applicable or impose any other penalty deemed fit. IITG may also procure similar goods/services elsewhere and recover the additional expenditure from the defaulting supplier.</li>
<li><strong>Applicable Law:</strong>
  <ol>
    <li>The contract shall be governed by the laws and procedures established by the Government of India and shall be subject to the exclusive jurisdiction of the competent court and forum in Guwahati only.</li>
    <li>Any dispute arising out of this purchase shall be referred to the Director, IIT Guwahati, and if either party is dissatisfied with the decision, the dispute shall be referred to an Arbitrator acceptable to both parties, to be appointed by the Director of IITG. The decision of such Arbitrator shall be final and binding on both parties.</li>
  </ol>
</li>
<li><strong>Performance Bank Guarantee (Above INR 5 Lakhs):</strong> You are to furnish an unconditional Performance Bank Guarantee (PBG) in the form of Fixed Deposit or Bank Guarantee as per the attached format, valid till 60 days after the warranty period from any commercial bank for 5% of the basic value of the item/work within 21 days of placement of this order, failing which the contract shall be deemed terminated. Validity of the PBG, effective from the date mentioned therein, shall be at least 14 months. In exceptional cases or on the request of the indenting officer, the competent authority may allow the PBG period to start from the date of installation, in which case submission of a PBG valid for 14 months may be made within 21 days from the date of installation.
  <ol>
    <li>By submitting the PBG, the vendor is understood to have guaranteed that:
      <ol>
        <li>The Purchase Order shall be executed as per the terms and conditions mentioned therein.</li>
        <li>The equipment shall function satisfactorily for a period up to 60 days after the warranty period.</li>
        <li>The equipment is free from poor workmanship, bad quality, and faulty design.</li>
        <li>The vendor shall at their own cost rectify/replace the defects, if any, during the guarantee period.</li>
        <li>The guarantee is to the extent of 5% of the basic value of the item/work.</li>
      </ol>
    </li>
    <li><strong>Condition for Invoking PBG:</strong> In case of failure to comply with the guarantees above, IITG may terminate the contract/purchase order in whole or in part and forfeit the PBG. In addition, IITG may procure similar goods/items elsewhere and the defaulting supplier/vendor shall be liable to compensate IITG for any extra expenditure involved.</li>
    <li><strong>Consumables:</strong> In case of consumables, PBG is not applicable.</li>
  </ol>
</li>
</ol>`;

export const AMC_TERMS = `<ol>
<li>Our Purchase Order Number (P.O. No.) with date must be invariably mentioned in all future correspondence on the subject.</li>
<li><strong>Period:</strong> This maintenance contract is valid for 1 year (01-04-2025 to 31-03-2026) as mentioned above.</li>
<li><strong>Payment:</strong> Half-yearly (50% every 6 months for the mentioned year), payable directly to the service provider on submission of Proforma Invoice.</li>
<li><strong>Coverage:</strong> The AMC will cover the servicing of the equipment/system mentioned in the order. The service provider will undertake all repair/replace/calibration work wherever required/applicable during this period.</li>
<li><strong>AMC Visits:</strong> 2 Preventive Maintenance and 1 Breakdown/Emergency visit is to be made by the authorized personnel of the service provider during the AMC period. Working hours of IIT Guwahati are 9:00 AM to 5:30 PM on all working days.</li>
<li><strong>Call Register:</strong> IIT Guwahati will register service calls only at the local level by telephone or email. The service provider should provide contact details with contact escalation matrix. Under no circumstances will calls be logged or registered to any call center by IITG.</li>
<li><strong>Response Time:</strong> The response time for attending any call is 24 working hours if the service provider is located at Guwahati or 7 days if from outside Guwahati. All complaints are to be attended on an emergency basis.</li>
<li><strong>Replacement of Spare:</strong> The service provider will charge IITG for any spare that does not come under AMC. Any such spare required will be supplied against a separate Purchase Order from IIT against additional charges. Replacement of spares is not covered in this contract.</li>
<li><strong>Termination of Contract:</strong> The AMC contract will be terminated if the service provider fails to provide or perform any of the terms as mentioned above.</li>
</ol>`;

export const RATE_CONTRACT_TERMS = `<ol>
<li><strong>Reference for Correspondence:</strong> Our P.O. No. indicated above must be mentioned invariably in all future correspondences such as Order Acknowledgement, Bank Guarantee, Proforma Invoice, Challan, Final Bill, Money Receipt, Packages, etc. relating to this order.</li>
<li><strong>Vendor Profile:</strong> The vendor is requested to fill in Form VP(1), enclosed herewith, and submit the same along with the bills/invoice. This is mandatory as payment will be made by ECS only.</li>
<li><strong>Price:</strong> Price inclusive of all duties and taxes and F.O.R. IIT Guwahati.</li>
<li><strong>Vendor Email ID:</strong> To be provided by the supplier in the order documentation.</li>
<li><strong>Delivery:</strong>
  <ol>
    <li><strong>Time Limit:</strong> Maximum within 30 days from the date of receipt of this Purchase Order.</li>
    <li><strong>Safe Delivery Responsibility of Supplier:</strong> All aspects of safe delivery shall be the exclusive responsibility of the vendor. At the destination site, the package will be opened only in the presence of IITG user/representative and vendor's representative. The intact condition of the package and the seal/indicators for not being tampered with shall form the basis for certifying the receipt in good condition.</li>
    <li><strong>Insurance:</strong> The supplier is to establish "All Risk Transit Insurance" coverage till door delivery at IIT Guwahati.</li>
    <li><strong>Part Delivery:</strong> Part delivery is not allowed.</li>
  </ol>
</li>
<li><strong>Payment:</strong> 100% payment against delivery, installation, and acceptance of ordered goods in good condition at IIT Guwahati OR, if advance payment is applicable, it will be processed on receipt of Proforma Invoice or Order Acknowledgement.</li>
<li><strong>GST Deduction:</strong>
  <ol>
    <li>GST Deduction at source as per order/notification of the Government.</li>
    <li>Supplier must issue B2B bills/invoices in favour of IIT Guwahati and mention the same in the billing address. Additionally, all bills/invoices must be promptly reported in the GST portal against IITG's GST number, failing which the bill may be withheld or the payment may be released without the GST amount.</li>
  </ol>
</li>
<li><strong>Road Permit / Form 62:</strong> If road permit is required, please send the Proforma Invoice along with your Order Acknowledgement. The Proforma Invoice is to bear the final value of ordered goods and complete address from which the goods are to be consigned.</li>
<li><strong>Bank Charges:</strong> All bank and other charges shall be to the supplier's account.</li>
<li><strong>Termination for Default:</strong> Default is said to have occurred if the supplier fails to deliver within the specified time, fails to perform any other contractual obligation, or if the equipment/components are found to have poor workmanship, faulty design, poor performance, or bad quality of materials used. Under such circumstances, the Competent Authority, IITG may terminate the contract/purchase order in whole or in part and forfeit the EMD/PBG as applicable or impose any other penalty deemed fit. IITG may also procure similar goods/items elsewhere and recover the additional expenditure from the defaulting supplier.</li>
<li><strong>Applicable Law:</strong>
  <ol>
    <li>The contract shall be governed by the laws and procedures established by the Government of India and shall be subject to the exclusive jurisdiction of the competent court and forum in Guwahati only.</li>
    <li>Any dispute arising out of this purchase shall be referred to the Director, IIT Guwahati, and if either party is dissatisfied with the decision, the dispute shall be referred to an Arbitrator acceptable to both parties, to be appointed by the Director of IITG. The decision of such Arbitrator shall be final and binding on both parties.</li>
  </ol>
</li>
<li><strong>Performance Bank Guarantee (Above INR 5 Lakhs):</strong> You are to furnish an unconditional Performance Bank Guarantee (PBG) in the form of Fixed Deposit or Bank Guarantee as per the attached format, valid till 60 days after the warranty period from any commercial bank for 3% of the Purchase Order value within 21 days of placement of this order, failing which the contract shall be deemed terminated. Validity of the PBG, effective from the date mentioned therein, shall be at least 14 months.
  <ol>
    <li>By submitting the PBG, the vendor is understood to have guaranteed that:
      <ol>
        <li>The Purchase Order shall be executed as per the terms and conditions mentioned therein.</li>
        <li>The equipment shall function satisfactorily for a period up to 60 days after the warranty period.</li>
        <li>The equipment is free from poor workmanship, bad quality, and faulty design.</li>
        <li>The vendor shall at their own cost rectify/replace the defects, if any, during the guarantee period.</li>
        <li>The guarantee is to the extent of 10% of the order value.</li>
      </ol>
    </li>
    <li><strong>Condition for Invoking PBG:</strong> In case of failure to comply with the guarantees above, IITG may terminate the contract/purchase order in whole or in part and forfeit the PBG. In addition, IITG may procure similar goods/items elsewhere and the defaulting supplier/vendor shall be liable to compensate IITG for any extra expenditure involved.</li>
    <li><strong>Consumables:</strong> In case of consumables, PBG is not applicable.</li>
  </ol>
</li>
</ol>`;

export const getDefaultTermsForIndentType = (indentType: any) => {
  const normalized = normalizeIndentType(indentType);

  if (isAnnualMaintenanceContractIndent(indentType)) {
    return AMC_TERMS;
  }

  if (normalized.includes("rate contract")) {
    return RATE_CONTRACT_TERMS;
  }

  return DEFAULT_TERMS;
};

export const getPoVariantCopy = (indentType: any) => {
  const normalized = normalizeIndentType(indentType);
  const indentTypeDisplayName = getPoIndentTypeDisplayName(indentType);

  if (isAnnualMaintenanceContractIndent(indentType)) {
    return {
      headerNote: indentTypeDisplayName,
      introParagraph:
        "Dear Sir,<br />With reference to above, it is to inform you that your proposal for AMC pertaining to ________________________ in our Institute has been approved by the competent authority. Details of the Equipment and terms &amp; conditions are as given below: -",
      terms: AMC_TERMS,
    };
  }

  if (normalized.includes("rate contract")) {
    return {
      headerNote: indentTypeDisplayName,
      introParagraph:
        "With reference to the above, please arrange to supply the following items/services under the approved rate contract:",
      terms: RATE_CONTRACT_TERMS,
    };
  }

  return {
    headerNote: indentTypeDisplayName,
    introParagraph:
      "With reference to the above, please arrange to supply the following:",
    terms: DEFAULT_TERMS,
  };
};

const getSummaryRowsHtml = (
  poData: Record<string, any>,
  columnCount: number,
) => {
  const labelColspan = Math.max(columnCount - 1, 1);
  const chargeSummary = Array.isArray(poData.po_charge_summary)
    ? poData.po_charge_summary
    : [];

  if (chargeSummary.length > 0) {
    return chargeSummary
      .map((row) => {
        const label = row?.label || "";
        const value = row?.value;
        const isStrong = row?.emphasis === "strong";
        return `<tr><td colspan="${labelColspan}"${isStrong ? "><strong>" : ">"}${label}${isStrong ? "</strong>" : ""}</td><td class="right"${isStrong ? "><strong>" : ">"}${fmt(value)}${isStrong ? "</strong>" : ""}</td></tr>`;
      })
      .join("");
  }

  return [
    poData.ss_total_es_basic_value
      ? `<tr><td colspan="${labelColspan}">Total Estimated Basic Value:</td><td class="right">${fmt(poData.ss_total_es_basic_value)}</td></tr>`
      : "",
    poData.ss_pack_forward
      ? `<tr><td colspan="${labelColspan}">Packing &amp; Forwarding:</td><td class="right">${fmt(poData.ss_pack_forward)}</td></tr>`
      : "",
    poData.ss_freight
      ? `<tr><td colspan="${labelColspan}">Freight:</td><td class="right">${fmt(poData.ss_freight)}</td></tr>`
      : "",
    poData.ss_other_charges
      ? `<tr><td colspan="${labelColspan}">Other Charges:</td><td class="right">${fmt(poData.ss_other_charges)}</td></tr>`
      : "",
    poData.ss_grand_total
      ? `<tr><td colspan="${labelColspan}"><strong>Grand Total:</strong></td><td class="right"><strong>${fmt(poData.ss_grand_total)}</strong></td></tr>`
      : "",
  ].join("");
};

export const getAmcPoTotal = (poData: Record<string, any>) => {
  const rows = Array.isArray(poData.amc_po_table) ? poData.amc_po_table : [];
  return rows.reduce((sum, row) => sum + (Number(row?.amc_amount) || 0), 0);
};

export const getAmcPoGstAmount = (poData: Record<string, any>) => {
  const total = getAmcPoTotal(poData);
  const gstPercent = Number(poData.add_of_gst_) || 0;
  return Math.round(((total * gstPercent) / 100 + Number.EPSILON) * 100) / 100;
};

export const getAmcPoGrandTotal = (poData: Record<string, any>) => {
  const total = getAmcPoTotal(poData);
  return (
    Math.round((total + getAmcPoGstAmount(poData) + Number.EPSILON) * 100) / 100
  );
};

const getAmcPoTableHtml = (poData: Record<string, any>) => {
  const sourceIndentType =
    poData.po_source_indent_type ||
    poData.icss_indent_type ||
    poData.indent_type;
  const rows = Array.isArray(poData.amc_po_table) ? poData.amc_po_table : [];

  if (
    !isAnnualMaintenanceContractIndent(sourceIndentType) ||
    rows.length === 0
  ) {
    return "";
  }

  const rowHtml = rows
    .map(
      (row, index) => `
            <tr>
                <td class="center">${row.sl_no || index + 1}</td>
                <td>${row.description_of_items || ""}</td>
                <td>${row.end_user || ""}</td>
                <td class="center">${row.year || ""}</td>
                <td class="center">${row.amc_from || ""}</td>
                <td class="center">${row.amc_to || ""}</td>
                <td class="right">${fmt(row.amc_amount)}</td>
            </tr>`,
    )
    .join("");

  return `
        <div class="section-title">Details of AMC Services</div>
        <table class="item-table">
            <thead>
                <tr>
                    <th>SL No.</th>
                    <th>Description of items</th>
                    <th>End-user &amp; Location of the item at IIT Guwahati</th>
                    <th>Year</th>
                    <th>From</th>
                    <th>To</th>
                    <th>AMC Amount (in INR)</th>
                </tr>
            </thead>
            <tbody>
                ${rowHtml}
                <tr>
                    <td colspan="6" class="right"><strong>Total AMC Amount</strong></td>
                    <td class="right"><strong>${fmt(getAmcPoTotal(poData))}</strong></td>
                </tr>
                <tr>
                    <td colspan="6" class="right">Add: GST @ ${poData.add_of_gst_ || 0}%</td>
                    <td class="right">${fmt(poData.gst_amount ?? getAmcPoGstAmount(poData))}</td>
                </tr>
                <tr>
                    <td colspan="6" class="right"><strong>Grand Total</strong></td>
                    <td class="right"><strong>${fmt(poData.grand_total ?? getAmcPoGrandTotal(poData))}</strong></td>
                </tr>
            </tbody>
        </table>`;
};

export function generatePOHtml(poData: Record<string, any>): string {
  const sourceIndentType =
    poData.po_source_indent_type ||
    poData.icss_indent_type ||
    poData.indent_type;
  const variantCopy = getPoVariantCopy(sourceIndentType);
  const tableConfig = getPoTableConfig(sourceIndentType);
  const poHeaderNote = getPoIndentTypeDisplayName(sourceIndentType);
  const rows: any[] = Array.isArray(poData.table_bttk) ? poData.table_bttk : [];

  const itemRows = rows
    .map((row, i) => {
      const cellValues: Record<string, string> = {
        serial: String(i + 1),
        item_name: row.item_name || "",
        item_description: row.item_description || "",
        item_cat_no: row.item_cat_no || row.cat_no || "",
        item_page_no: row.item_page_no || row.page_no || "",
        item_justification: row.item_justification || "",
        item_make: row.item_make || "",
        item_model: row.item_model || "",
        item_quantity: row.item_quantity ?? "",
        item_unit_price: fmt(row.item_unit_price),
        item_discount_percent: row.item_discount_percent ?? "",
        item_gst_percent: row.item_gst_percent ?? "",
        item_discount: fmt(row.item_discount),
        item_gst: fmt(row.item_gst),
        dp_total_price: fmt(row.dp_total_price),
      };

      const cells = tableConfig.columns
        .map((column) => {
          const alignClass =
            column.align === "right"
              ? "right"
              : column.align === "center"
                ? "center"
                : "";
          return `<td class="${alignClass}">${cellValues[column.key] || ""}</td>`;
        })
        .join("");

      return `
        <tr>
            ${cells}
        </tr>`;
    })
    .join("");
  const tableHeaderHtml = tableConfig.columns
    .map((column) => `<th>${column.label}</th>`)
    .join("");
  const columnCount = tableConfig.columns.length;
  const summaryRows = getSummaryRowsHtml(poData, columnCount);
  const amcPoTableHtml = getAmcPoTableHtml(poData);
  const isAmcPo = isAnnualMaintenanceContractIndent(sourceIndentType);
  const itemTableBlock = isAmcPo
    ? ""
    : `
                <div class="section-title">${tableConfig.title}</div>
                <table class="item-table">
                    <thead>
                        <tr>
                            ${tableHeaderHtml}
                        </tr>
                    </thead>
                    <tbody>
                        ${itemRows}
                        ${summaryRows}
                    </tbody>
                </table>`;
  const amcSubject = poData.amc_subject || poData.amc_equipment_subject || "";
  const amcIntroParagraph =
    poData.amc_intro_paragraph ||
    `Dear Sir,<br />With reference to above, it is to inform you that your proposal for AMC pertaining to ${amcSubject || "________________________"} in our Institute has been approved by the competent authority. Details of the Equipment and terms &amp; conditions are as given below: -`;
  const amountForWords =
    isAmcPo && getAmcPoTotal(poData) > 0
      ? poData.grand_total || getAmcPoGrandTotal(poData)
      : poData.ss_grand_total;

  return poTemplate
    .replace(
      "{{VENDOR_ADDRESS}}",
      poData.vendor_address || poData.ss_name_of_firms || "",
    )
    .replace(
      "{{PO_NUMBER_LINE}}",
      isAmcPo
        ? ""
        : `<br /><br /><strong>P.O. No:</strong> ${poData.po_number || poData.name || ""}`,
    )
    .replace("{{PO_NUMBER}}", poData.po_number || poData.name || "")
    .replace(
      "{{PO_DATE}}",
      poData.po_date ||
        new Date().toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
    )
    .replace("{{QUOTATION_NO}}", poData.quotation_no || "")
    .replace(
      "{{AMC_JOB_ORDER_LINE}}",
      isAmcPo
        ? `<div class="ref-line"><strong>AMC Job Order No.:</strong> ${poData.po_number || "________________"}</div>`
        : "",
    )
    .replace(
      "{{AMC_SUBJECT_LINE}}",
      isAmcPo
        ? `<div class="ref-line"><strong>Sub: -</strong> AMC of ${amcSubject || "________________"}</div>`
        : "",
    )
    .replace(
      "{{LETTERHEAD_USER_EMAIL}}",
      poData.letterhead_user_email ||
        poData.po_staff_email ||
        poData.staff_email ||
        "",
    )
    .replace("{{PO_HEADER_NOTE}}", poHeaderNote || variantCopy.headerNote)
    .replace(
      "{{INTRO_PARAGRAPH}}",
      isAmcPo
        ? amcIntroParagraph
        : poData.po_intro_paragraph || variantCopy.introParagraph,
    )
    .replace("{{ITEM_TABLE_BLOCK}}", itemTableBlock)
    .replace("{{AMC_PO_TABLE}}", amcPoTableHtml)
    .replace(
      "{{AMOUNT_IN_WORDS}}",
      poData.amount_in_words || (amountForWords ? fmt(amountForWords) : ""),
    )
    .replace(
      "{{ACCOUNT_HEAD}}",
      poData.ss_account_head_label || poData.ss_account_head || "",
    )
    .replace("{{PROJECT_NO}}", poData.project_no || "")
    .replace(
      "{{CHECKED_BY_NAME}}",
      poData.checked_by_name || poData.po_staff_name || "",
    )
    .replace(
      "{{CHECKED_BY_DESIGNATION}}",
      poData.checked_by_designation || poData.po_staff_designation || "",
    )
    .replace("{{SIGNEE_NAME}}", poData.signee_name || "")
    .replace("{{SIGNEE_DESIGNATION}}", poData.signee_designation || "")
    .replace(
      "{{TERMS_AND_CONDITIONS}}",
      poData.terms_and_conditions || variantCopy.terms,
    );
}
