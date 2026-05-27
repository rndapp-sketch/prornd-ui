// -=========================v3

import p11Template from "@/pages/printformat/p_11_format.html?raw";

const fmtNum = (val: any) => {
  const n = Number(val) || 0;
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export function generateP11Html(formData: Record<string, any>): string {
  // ── DEBUG: log all array-valued keys so we can find the right child table name ──
  console.group("[p11Print] formData array keys:");
  for (const key in formData) {
    if (Array.isArray(formData[key])) {
      console.log(
        `  ${key} (${formData[key].length} rows):`,
        formData[key][0] ?? "(empty)",
      );
    }
  }
  console.groupEnd();

  // ── Item rows (table_hsrb) ────────────────────────────────────────────────
  const rows: any[] = Array.isArray(formData.table_hsrb)
    ? formData.table_hsrb
    : [];

  let pcMembers: Array<{
    webmail_id?: string;
    pc_name?: string;
    designation?: string;
  }> = [];

  // Try known field name first
  if (Array.isArray(formData.table_teqd) && formData.table_teqd.length > 0) {
    pcMembers = formData.table_teqd;
  } else {
    // Fallback: scan ALL arrays in formData for one with pc_name or webmail_id
    for (const key in formData) {
      const val = formData[key];
      if (Array.isArray(val) && val.length > 0) {
        const first = val[0];
        if ("pc_name" in first || "webmail_id" in first) {
          console.log(`[p11Print] Found PC members in field: "${key}"`, val);
          pcMembers = val;
          break;
        }
      }
    }
    if (pcMembers.length === 0) {
      console.warn(
        "[p11Print] table_teqd not found. Keys available:",
        Object.keys(formData),
      );
    }
  }

  // ── Date ──────────────────────────────────────────────────────────────────
  const creation = formData.creation
    ? new Date(formData.creation).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  // ── Indenter name: match owner email against PC table to get full name ───
  const ownerEmail = formData.owner || "";
  const matchedIndenter = pcMembers.find(
    (m) =>
      (m.webmail_id || "").toLowerCase().trim() ===
      ownerEmail.toLowerCase().trim(),
  );

  // Fallback: Try to clean the email to make it look like a name if all else fails
  const emailToName = ownerEmail
    ? ownerEmail
        .split("@")[0]
        .split(".")
        .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(" ")
    : "";

  // Final resolution chain
  const indenterName =
    formData.applicant_name ||
    matchedIndenter?.pc_name ||
    pcMembers[0]?.pc_name ||
    emailToName;

  // ── Item rows HTML ────────────────────────────────────────────────────────
  const itemRows = rows
    .map((row, i) => {
      const lines: string[] = [];
      if (row.item_name)
        lines.push(`<strong>Item Name:</strong> ${row.item_name}`);
      if (row.item_make) lines.push(`<strong>Make:</strong> ${row.item_make}`);
      if (row.item_model)
        lines.push(`<strong>Model:</strong> ${row.item_model}`);
      if (row.item_description)
        lines.push(`<strong>Description:</strong> ${row.item_description}`);

      return `<tr>
            <td class="c">${i + 1}</td>
            <td>${lines.join("<br>")}</td>
            <td class="c">${row.item_quantity ?? 0}</td>
            <td class="r">${fmtNum(row.item_unit_price)}</td>
            <td class="r">${fmtNum(row.dp_total_price)}</td>
        </tr>`;
    })
    .join("");

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalExWorks = Number(formData.total_basic_value) || 0;
  const totalDiscount = rows.reduce(
    (s, r) => s + (Number(r.item_discount) || 0),
    0,
  );
  const netTotalExWorks = totalExWorks - totalDiscount;
  const packingFwd = Number(formData.packing_and_forwarding) || 0;
  const freight = Number(formData.freight) || 0;
  const gst = rows.reduce((s, r) => s + (Number(r.item_gst) || 0), 0);
  const otherCharges = Number(formData.other_charges) || 0;
  const grandTotal = Number(formData.grand_total) || 0;

  // ── Item category ─────────────────────────────────────────────────────────
  const itemCategory =
    formData.item_category || (rows.length > 0 ? rows[0].item_name || "" : "");

  // ── Signature blocks ──────────────────────────────────────────────────────
  // Loops over every row in table_teqd automatically.
  // With 3 rows → 3 blocks. With 5 rows → 5 blocks. No manual changes needed.
  // Falls back to indenter only if table_teqd is completely empty.
  const sigSource =
    pcMembers.length > 0
      ? pcMembers
      : [
          {
            pc_name: indenterName,
            webmail_id: formData.owner || "",
            designation: "",
          },
        ];

  const sigBlockStyle = [
    "display:inline-block",
    "text-align:center",
    "box-sizing:border-box",
    "width:31%",
    "margin:0 1% 20px 1%",
    "vertical-align:top",
    "padding:6px 4px 8px 4px",
  ].join(";");

  const lineStyle = [
    "border-bottom:1px solid #444",
    "width:80%",
    "margin:0 auto 10px auto",
    "padding-bottom:2px",
    "margin-top:30px",
  ].join(";");

  const nameStyle = [
    "font-size:9pt",
    "font-weight:bold",
    "margin-top:4px",
  ].join(";");

  const signatureBlocks =
    `<div style="width:100%;font-size:0;">` +
    sigSource
      .map(
        (m) =>
          `<div style="${sigBlockStyle}">` +
          `<div style="${lineStyle}"></div>` +
          `<div style="${nameStyle}">${m.pc_name || ""}</div>` +
          `</div>`,
      )
      .join("") +
    `</div>`;

  const currentTime = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  // ── Assemble final HTML ───────────────────────────────────────────────────
  return p11Template
    .replace("{{DOC_REF}}", formData.name || "")
    .replace("{{CURRENT_TIME}}", currentTime)
    .replace("{{DATE}}", creation)
    .replace("{{INDENTER_NAME}}", indenterName)
    .replace("{{ITEM_CATEGORY}}", itemCategory)
    .replace(
      "{{RECOMMENDATION_FROM}}",
      formData.the_purchase_committe_recommends_purchase_of_the_items_from_ms ||
        "",
    )
    .replace("{{ITEM_ROWS}}", itemRows)
    .replace("{{TOTAL_EX_WORKS}}", fmtNum(totalExWorks))
    .replace("{{TOTAL_DISCOUNT}}", fmtNum(totalDiscount))
    .replace("{{NET_TOTAL_EX_WORKS}}", fmtNum(netTotalExWorks))
    .replace("{{PACKING_FORWARDING}}", fmtNum(packingFwd))
    .replace("{{FREIGHT}}", fmtNum(freight))
    .replace("{{GST}}", fmtNum(gst))
    .replace("{{OTHER_CHARGES}}", fmtNum(otherCharges))
    .replace("{{GRAND_TOTAL}}", fmtNum(grandTotal))
    .replace("{{SIGNATURE_BLOCKS}}", signatureBlocks);
}
