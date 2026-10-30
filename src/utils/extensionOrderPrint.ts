// Print formats for the office order issued once a Project Staff Extension is approved:
// an "Extension" order, or a "Re-engagement" order when the months completed before the
// new term is a multiple of 11 (decided by the backend — get_extension_order).
// Pure HTML/CSS so it can be written into a print window / iframe without React.

export interface ExtensionOrderData {
  ref: string;
  issueDate: string; // YYYY-MM-DD
  staffName: string;
  designation: string;
  projectTitle: string;
  piName: string;
  department: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string; // YYYY-MM-DD
  increment: string | number;
}

export type ExtensionOrderType = "Extension" | "Re-engagement";

/** Shape returned by the backend's get_extension_order().context */
export interface ExtensionOrderContext {
  order_type: ExtensionOrderType;
  total_months_completed: number;
  ref: string;
  staff_name: string;
  emp_id: string;
  gender: string;
  designation: string;
  project_no: string;
  project_title: string;
  pi_name: string;
  department: string;
  from_date: string; // YYYY-MM-DD
  to_date: string; // YYYY-MM-DD
  basic: number;
  increment: number;
  hra: string;
  medical: string;
}

const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

/** YYYY-MM-DD -> DD-MM-YYYY */
export const fmtOrderDate = (d?: string | null) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || "");
  return m ? `${m[3]}-${m[2]}-${m[1]}` : d || "";
};

const ORDER_CSS = `
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { color: #111; font-family: "Times New Roman", "Noto Serif", Georgia, serif; font-size: 14.5px; line-height: 1.75; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 14mm 20mm 16mm; display: flex; flex-direction: column; }
  .head { display: grid; grid-template-columns: 26mm 1fr 48mm; align-items: center; column-gap: 10px; padding-bottom: 10px; border-bottom: 3px double #1a2b5f; }
  .head img { width: 24mm; height: 24mm; object-fit: contain; }
  .inst { text-align: center; color: #1a2b5f; }
  .inst .hi { font-family: "Noto Serif Devanagari", "Mangal", serif; font-size: 19px; font-weight: bold; line-height: 1.3; }
  .inst .en { font-size: 18px; font-weight: bold; line-height: 1.3; white-space: nowrap; }
  .inst .tag { font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 3px; color: #444; }
  .contact { font-size: 11.5px; line-height: 1.5; border-left: 1.5px solid #1a2b5f; padding-left: 10px; color: #222; }
  .contact table { border-collapse: collapse; }
  .contact td { padding: 0; vertical-align: top; }
  .contact td:first-child { padding-right: 5px; white-space: nowrap; }
  .office { margin-top: 12px; font-weight: bold; font-size: 14.5px; }
  .refrow { display: flex; justify-content: space-between; margin-top: 6px; padding: 5px 0; border-top: 1px solid #999; border-bottom: 1px solid #999; font-size: 13.5px; }
  .refrow b { color: #1a2b5f; }
  h1 { text-align: center; font-size: 17px; letter-spacing: 2px; margin: 38px 0 26px; }
  h1 span { display: inline-block; padding: 0 6px 3px; border-bottom: 2px solid #111; }
  p { text-align: justify; text-justify: inter-word; margin: 0 0 16px; text-indent: 14mm; hyphens: auto; }
  .sign { margin-top: auto; padding-top: 80px; text-align: right; }
  .sign .line { display: inline-block; min-width: 55mm; border-top: 1px solid #111; padding-top: 4px; text-align: center; font-weight: bold; }
  .foot { margin-top: 28px; padding-top: 6px; border-top: 1px solid #bbb; font-size: 10.5px; color: #666; text-align: center; }
  @media screen { body { background: #e5e7eb; } .page { background: #fff; margin: 16px auto; box-shadow: 0 2px 12px rgba(0,0,0,.2); } }
`;

const orderHeaderHtml = (ref: string, issueDate: string) => {
  const logo = `${window.location.origin}${import.meta.env.BASE_URL || "/"}iitg_logos/iitg-logo.svg`.replace(/([^:])\/\/+/g, "$1/");
  return `
  <div class="head">
    <img src="${esc(logo)}" alt="IIT Guwahati" />
    <div class="inst">
      <div class="hi">भारतीय प्रौद्योगिकी संस्थान गुवाहाटी</div>
      <div class="en">Indian Institute of Technology Guwahati</div>
      <div class="tag">Research &amp; Development Section</div>
    </div>
    <div class="contact">
      <table>
        <tr><td colspan="2"><b>Guwahati-781039</b></td></tr>
        <tr><td>Phone :</td><td>+91-361-2582132<br />+91-361-2582324</td></tr>
        <tr><td>Email :</td><td>adornd@iitg.ac.in</td></tr>
      </table>
    </div>
  </div>
  <div class="office">Associate Dean, Research &amp; Development</div>
  <div class="refrow"><span><b>Ref:</b> ${esc(ref)}</span><span><b>Date:</b> ${esc(fmtOrderDate(issueDate))}</span></div>`;
};

const orderFooterHtml = `
  <div class="sign"><span class="line">Assoc. Dean, R&amp;D</span></div>
  <div class="foot">This is a system-generated order from the ProRnD portal, IIT Guwahati.</div>`;

/** Wraps the inner HTML of the A4 `.page` into a complete printable document. */
export function buildOrderDocument(pageHtml: string, title: string, extraCss = "", extraBodyHtml = ""): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" />
<title>${esc(title)}</title>
<style>${ORDER_CSS}${extraCss}</style></head>
<body>${extraBodyHtml}<div class="page">${pageHtml}</div></body></html>`;
}

const salutation = (gender: string) => {
  const g = gender.trim().toLowerCase();
  if (g === "female" || g === "f") return "Ms.";
  if (g === "male" || g === "m") return "Mr.";
  return "Mr./Ms.";
};

/** "+ 20% HRA + Medical Facility" from the staff record's HRA % and medical amount. */
const allowancesText = (hra: string, medical: string) => {
  let out = "";
  const hraNum = Number.parseFloat(hra);
  if (hraNum > 0) out += ` + ${esc(hra.includes("%") ? hra.trim() : `${hraNum}%`)} HRA`;
  if (Number.parseFloat(medical) > 0) out += " + Medical Facility";
  return out;
};

/** Inner HTML of the `.page` for the generated Extension / Re-engagement order. */
export function buildExtensionOrderPage(ctx: ExtensionOrderContext, issueDate: string): string {
  const who =
    `<b>${salutation(ctx.gender)} ${esc(ctx.staff_name)}${ctx.emp_id ? ` (${esc(ctx.emp_id)})` : ""}, ${esc(ctx.designation)}</b>`;
  const under =
    `in the Project titled "<b>${esc(ctx.project_title)}</b>" under Principal Investigator ` +
    `<b>Dr. ${esc(ctx.pi_name)}, Dept. of ${esc(ctx.department)}, IIT Guwahati</b>`;
  const pay = `a Basic Pay of Rs ${esc(ctx.basic)}/- PM${allowancesText(ctx.hra, ctx.medical)}`;
  const from = `<b>${esc(fmtOrderDate(ctx.from_date))}</b>`;
  const to = `<b>${esc(fmtOrderDate(ctx.to_date))}</b>`;

  const body =
    ctx.order_type === "Re-engagement"
      ? `<h1><span>RE-ENGAGEMENT OFFICE ORDER</span></h1>
  <p>This is for information of all concerned that ${who}, ${under}, has rejoined the project w.e.f. forenoon ${from} with ${pay}.</p>
  <p>The Re-engagement is on <b>contractual</b> basis, till ${to} or <b>co-terminus with the project, whichever is earlier</b>. The appointment will be terminated at the end of the period unless notified otherwise.</p>`
      : `<h1><span>EXTENSION OFFICE ORDER</span></h1>
  <p>This is for information of all concerned that the tenure of appointment of ${who}, ${under}, has been extended w.e.f. forenoon ${from} till ${to} with ${pay}.</p>
  <p>The other terms and conditions of the appointment will remain same.</p>`;

  return `${orderHeaderHtml(ctx.ref, issueDate)}
  ${body}
  ${orderFooterHtml}`;
}

/** Legacy one-shot order used by the extension form's own "Print Order" button. */
export function buildExtensionOrderHtml(d: ExtensionOrderData): string {
  const inc = Number(d.increment) || 0;
  const page = `${orderHeaderHtml(d.ref, d.issueDate)}
  <h1><span>EXTENSION OFFICE ORDER</span></h1>
  <p>This is for information of all concerned that the tenure of appointment of Mr./Ms./Dr. <b>${esc(d.staffName)}</b>, ${esc(d.designation)}, in the R&amp;D Project "<b>${esc(d.projectTitle)}</b>" under the supervision of Dr./Prof. <b>${esc(d.piName)}</b>, Dept. of ${esc(d.department)}, has been extended/renewed w.e.f. <b>${esc(fmtOrderDate(d.fromDate))}</b> to <b>${esc(fmtOrderDate(d.toDate))}</b> with an increment of Rs ${esc(inc)} PM.</p>
  <p>The other terms and conditions of the appointment will remain same.</p>
  ${orderFooterHtml}`;
  const toolbarCss = `
  .toolbar { position: sticky; top: 0; z-index: 10; display: flex; justify-content: flex-end; gap: 10px; padding: 10px 20px; background: #1a2b5f; font-family: Arial, sans-serif; }
  .toolbar button { cursor: pointer; border: 0; border-radius: 6px; padding: 8px 18px; font-size: 14px; font-weight: 600; }
  .toolbar .print { background: #fff; color: #1a2b5f; }
  .toolbar .close { background: transparent; color: #fff; border: 1px solid #fff; }
  @media print { .toolbar { display: none !important; } }`;
  const toolbar = `<div class="toolbar"><button class="print" onclick="window.print()">Print</button><button class="close" onclick="window.close()">Close</button></div>`;
  return buildOrderDocument(page, `Extension Office Order - ${d.staffName}`, toolbarCss, toolbar);
}

export function printExtensionOrder(d: ExtensionOrderData) {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.open();
  w.document.write(buildExtensionOrderHtml(d));
  w.document.close();
  return true;
}
