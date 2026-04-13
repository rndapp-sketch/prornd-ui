import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Printer, Edit2, Check, PlusCircle } from 'lucide-react';
import { useFrappeGetDoc, useFrappeGetCall } from 'frappe-react-sdk';

// ─── Minimal QR for NIQ Number ───────────────────────────────────────────────
const QRCode = ({ value, size = 50 }: { value: string; size?: number }) => {
    const grid = useMemo(() => {
        if (!value) return null;
        const gridSize = 11;
        const cells: boolean[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(false));
        const addFP = (sx: number, sy: number) => {
            for (let y = 0; y < 3; y++)
                for (let x = 0; x < 3; x++) {
                    if (y === 1 && x === 1) cells[sy + y][sx + x] = true;
                    else if (y === 0 || y === 2 || x === 0 || x === 2) cells[sy + y][sx + x] = true;
                }
        };
        addFP(0, 0); addFP(gridSize - 3, 0); addFP(0, gridSize - 3);
        return cells;
    }, [value]);
    if (!grid) return null;
    const cs = size / grid.length;
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ border: '1px solid black', display: 'inline-block' }}>
            {grid.map((row, y) => row.map((cell, x) => cell && (
                <rect key={`${x}-${y}`} x={x * cs} y={y * cs} width={cs} height={cs} fill="black" />
            )))}
        </svg>
    );
};

// ─── Print Styles ─────────────────────────────────────────────────────────────
const PRINT_STYLES = `
@media print {
  /* Page setup — let browser handle margins */
  @page { size: A4 portrait; margin: 12mm 14mm; }

  /* Hide all app chrome */
  body * { visibility: hidden !important; }

  /* Reveal only the A4 paper */
  .niq-paper, .niq-paper * { visibility: visible !important; }

  /* Let the paper flow naturally across pages (no fixed/absolute!) */
  .niq-paper {
    position: static !important;
    display: block !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    box-shadow: none !important;
    border: none !important;
    background: white !important;
    overflow: visible !important;
    font-size: 12px !important;
    line-height: 1.5 !important;
  }

  /* Hide toolbar */
  .no-print { display: none !important; visibility: hidden !important; }
  .tc-editable-hint { display: none !important; }

  /* Inputs: strip styling so values show as plain text */
  .niq-input {
    border: none !important;
    outline: none !important;
    background: transparent !important;
    padding: 0 !important;
    color: black !important;
    -webkit-appearance: none !important;
    appearance: none !important;
    width: auto !important;
  }

  textarea.niq-input {
    resize: none !important;
    overflow: visible !important;
    height: auto !important;
    width: 100% !important;
  }

  [contenteditable] {
    outline: none !important;
    cursor: default !important;
    background: transparent !important;
  }

  a { color: black !important; text-decoration: none !important; }

  /* Allow page breaks between list items, avoid breaking inside one */
  .niq-li { page-break-inside: avoid; orphans: 3; widows: 3; }
  tr { page-break-inside: avoid; }
  table { page-break-inside: auto; }
}

/* ── Screen styles ─────────────────────────────────────────────────── */
.niq-ol { list-style-type: decimal; padding-left: 22px; margin: 8px 0 10px; }
.niq-ol-alpha { list-style-type: lower-alpha; padding-left: 20px; margin: 6px 0; }
.niq-ol-roman { list-style-type: lower-roman; padding-left: 20px; margin: 6px 0; }
.niq-ul { list-style-type: disc; padding-left: 20px; margin: 6px 0; }
.niq-li { margin-bottom: 7px; text-align: justify; line-height: 1.5; }
.niq-input {
  border-bottom: 1px solid #555;
  outline: none;
  background: #fffde7;
  padding: 1px 4px;
  font-family: inherit;
  font-size: inherit;
  color: #0000cc;
  min-width: 60px;
}
.niq-input:focus { background: #fff9c4; border-color: #1a56db; }
.niq-subheading { font-weight: bold; }
.niq-center-header { display: block; text-align: center; font-weight: bold; text-decoration: underline; margin: 14px 0 8px; }
.tc-editable [contenteditable]:focus { outline: 1px dashed #1a56db; outline-offset: 2px; background: #fffde7; }
.tc-editable [contenteditable] { cursor: text; }
.additional-tc-area { min-height: 80px; border: 1px dashed #aaa; padding: 8px; font-family: inherit; font-size: 13px; line-height: 1.55; }
.additional-tc-area:focus { outline: 1px dashed #1a56db; background: #fffde7; }
`;


// ─── Reusable inline input ────────────────────────────────────────────────────
const F = ({ value, onChange, size = 12, placeholder = '______' }: {
    value: string; onChange: (v: string) => void; size?: number; placeholder?: string;
}) => (
    <input
        className="niq-input"
        value={value}
        placeholder={placeholder}
        size={size}
        onChange={e => onChange(e.target.value)}
        style={{ width: `${Math.max(value.length + 2, size) * 7}px` }}
    />
);

// ─── Types ────────────────────────────────────────────────────────────────────
interface NIQFields {
    niqNumber: string;
    phone1: string;
    phone2: string;
    fax: string;
    email: string;
    indenterName: string;
    designation: string;
    address: string;
    itemName: string;
    deptName: string;
    projectNumber: string;
    lastDate: string;
    bidOpeningDate: string;
}

// ─── Static T&C (memoized to preserve contentEditable state across re-renders) ──
const CommonTnC = React.memo(function CommonTnC({ startIndex }: { startIndex: number }) {
    return (
        <>
            <li className="niq-li" value={startIndex} contentEditable suppressContentEditableWarning>
                <span>
                    <span className="niq-subheading">Rates: </span>
                    Rates quoted for indigenous items should be on FOR IIT Guwahati, on DOOR DELIVERY basis, with break-ups as per details below
                    (For import items please refer 'Additional Terms for imported goods' at clause No. 25 below). Break-ups of cost:
                    <ol className="niq-ol-alpha">
                        <li className="niq-li">Basic Price</li>
                        <li className="niq-li">(+) Central Excise Duty, if any</li>
                        <li className="niq-li">(+) VAT / Central Sales Tax (On Sub-Total Price, including Excise Duty, if any)</li>
                        <li className="niq-li">(+) Freight &amp; Insurance Charge, if any</li>
                        <li className="niq-li">(+) Installation &amp; Commissioning Charge, if any</li>
                        <li className="niq-li">Grand Total F.O.R. IIT Guwahati, Price</li>
                    </ol>
                    Note: Vague terms like "packing, forwarding, transportation etc. extra" without mentioning the specific amount will not be
                    accepted. Such offers shall be treated as incomplete and rejected. Bidders shall indicate their rates in clear/visible figures
                    as well as in words and shall not alter/overwrite/make cutting in the quotation. In case of a mismatch, the rates written in
                    words will prevail.
                </span>
            </li>
            <li className="niq-li" contentEditable suppressContentEditableWarning><span><span className="niq-subheading">Validity (Both foreign &amp; indigenous):</span> Quoted rates must be valid for 120 days.</span></li>
            <li className="niq-li" contentEditable suppressContentEditableWarning>
                <span>
                    <span className="niq-subheading">Performance Bank Guarantee (Both foreign &amp; indigenous):</span> The successful bidder shall
                    furnish an unconditional Performance Bank Guarantee valid till 60 days after the warranty period from a scheduled Bank for 10%
                    of the Purchase Order value within 21 days of placement of order failing which the contract shall be deemed as terminated
                    (APPLICABLE ONLY TO ORDERS COSTING MORE THAN INR 5,00,000.00). That:
                    <ol className="niq-ol-alpha">
                        <li className="niq-li">The Vendor shall provide a Certificate of Guarantee guaranteeing satisfactory operation of the components and against poor workmanship, bad quality of materials used, faulty designs and performance figures given by the Vendor.</li>
                        <li className="niq-li">This guarantee shall be operative for a period of 60 days after the warranty period. The performance guarantee would be to the extent of 10% of the order value.</li>
                        <li className="niq-li">The Vendor shall at his own cost rectify the defects/replace the items supplied, for defects identified during the period of guarantee.</li>
                        <li className="niq-li">While clauses 3(a), 3(b) and 3(c) are applicable to all orders worth Rs. 5 Lakhs or more, competent authority may take appropriate decisions on exceptional cases.</li>
                    </ol>
                </span>
            </li>
            <li className="niq-li" contentEditable suppressContentEditableWarning>
                <span>
                    <span className="niq-subheading">PENALTY for delayed delivery (for both foreign &amp; indigenous):</span> The date of delivery
                    shall be strictly adhered to, except in cases of Force Majeure or extension of the delivery date duly approved by IIT Guwahati.
                    In the event of delayed delivery and acceptance by the end user, the vendor shall be liable for a penalty deduction at the rate
                    of 0.5% per week or part thereof of the value of the entire consignment, subject to a maximum of 10% (ten percent).<br />
                    For the purpose of this clause, part of a week shall be treated as a full week. In case of delayed delivery, IIT Guwahati
                    reserves the right not to accept the consignment.
                </span>
            </li>
            <li className="niq-li" contentEditable suppressContentEditableWarning><span>In case of indigenous supplies, the goods should be insured against theft, loss or breakage during transit and insurance charges should not exceed 1% of the cost of material supplied, the rates of Sales Tax, Excise Duty etc. (as applicable) should be clearly indicated. Form C &amp; D is not applicable to us. However, we are exempted from payment of Excise Duty and certificate to this effect can be provided.</span></li>
            <li className="niq-li" contentEditable suppressContentEditableWarning><span>Penalty for delayed supply (Both foreign &amp; indigenous): In case of supply order for the SCIENTIFIC EQUIPMENTS/APPARATUS, the date of delivery should be strictly adhered to otherwise the Director, IITG reserves the right not to accept delivery in part or full and claim liquidated damages of 1% per week subject to maximum of 10% of the total value of supply.</span></li>
            <li className="niq-li" contentEditable suppressContentEditableWarning><span><span className="niq-subheading">Pre-installation requisites (Both foreign &amp; indigenous):</span> Pre-installation requisites (electrical/floor/space/air-conditioning etc.) if any should invariably be mentioned clearly. Installation/Training will be the full responsibility of the supplier/Indian Agent.</span></li>
            <li className="niq-li" contentEditable suppressContentEditableWarning><span><span className="niq-subheading">Short Shipment (Both foreign &amp; indigenous):</span> If any short-shipment etc. is noticed, the same will be arranged immediately with all charges to this effect to be borne by supplier/Indian agent.</span></li>
            <li className="niq-li" contentEditable suppressContentEditableWarning><span><span className="niq-subheading">Genuine Pricing (Both foreign &amp; indigenous):</span> Vendor is to ensure that quoted price is not more than the price offered to any other customer in India to whom this particular item has been sold, particularly to IIT/Institutes and other Government Organization. Copy of the latest price list for the quoted item, applicable in India, must be enclosed with your offer.</span></li>
            <li className="niq-li" contentEditable suppressContentEditableWarning><span><span className="niq-subheading">Excise Duty:</span> The Institute is exempted from payment of Central Excise Duty vide GOI Notification No. 10/97-Central Excise, dated 01.03.97 with Regn. No. TU/V/RG-CDE (351)/2011, dated 19.09.2011.</span></li>
            <li className="niq-li" contentEditable suppressContentEditableWarning><span><span className="niq-subheading">VAT:</span> For a vendor within the State of Assam, appropriate VAT (to be deducted at source) will be applicable. For exemption from Octroi, wherever required, the Institute will issue necessary certificates.</span></li>
            <li className="niq-li" contentEditable suppressContentEditableWarning><span><span className="niq-subheading">Entry Tax:</span> Assam Govt. Entry Tax – usually @4% [to be paid by IIT Guwahati, not by the vendor], wherever applicable, will be added while evaluating cost status of the concerned equipment to be supplied by vendors from outside the State of Assam.</span></li>
            <li className="niq-li" contentEditable suppressContentEditableWarning>
                <span>
                    <span className="niq-subheading">Delivery:</span>
                    <ol className="niq-ol-alpha">
                        <li className="niq-li">Delivery of goods at IIT Guwahati, will have to be maximum within 45 (Forty-five) days from the date of issue of the Purchase Order.</li>
                        <li className="niq-li">Safe delivery of goods: All aspects of safe delivery shall be the exclusive responsibility of the vendor. At the destination site, the cartons will be opened only in the presence of IIT user/representative and vendor's representative and the intact position of the seal for not being tampered with, shall form the basis for certifying the receipt in good condition.</li>
                        <li className="niq-li">No Part Delivery: part shipment will not be allowed.</li>
                    </ol>
                </span>
            </li>
            <li className="niq-li" contentEditable suppressContentEditableWarning>
                <span>
                    <span className="niq-subheading">Mode of Payment for Indigenous Purchase</span> (For import items please refer 'Additional Terms for imported goods' clause No. 28 below):
                    <ol className="niq-ol" style={{ listStyleType: 'decimal' }}>
                        <li className="niq-li">Payment for Indigenous Purchases will be maximum within 45 days from the date of successful delivery and installation of goods at IIT Guwahati, North-Guwahati, generally through A/c payee cheque. In case payment is to be made by DD, the Draft commission will be deducted from the bill amount. or</li>
                        <li className="niq-li">Payment through bank against proof of dispatch: 90% payment shall be released on receipt of proof of dispatch through State Bank Of India, IITG Branch, Guwahati-781039, Assam (Contact No. 0361-2582106). Balance 10% shall be released after installation/handing over of the equipment to the consignee(s).</li>
                    </ol>
                    Note: Please note as per Institute's norm advance payment is not allowed for indigenous purchase.
                </span>
            </li>
            <li className="niq-li" contentEditable suppressContentEditableWarning><span><span className="niq-subheading">Quotation by Fax/Mail not Acceptable (Both foreign &amp; indigenous):</span> The offers submitted by telex/telegram/fax/E-mail etc. shall not be considered. No correspondence will be entertained on this matter.</span></li>
            <li className="niq-li" contentEditable suppressContentEditableWarning><span><span className="niq-subheading">Late and delayed tender (Both foreign &amp; indigenous):</span> Late and delayed tender will not be considered. In case any unscheduled holiday occurs on prescribed closing/opening date the next working day shall be the prescribed date of closing/opening.</span></li>
            <li className="niq-li" contentEditable suppressContentEditableWarning><span><span className="niq-subheading">Conditional tenders not acceptable (Both foreign &amp; indigenous):</span> Conditional tenders shall not be accepted on any ground and shall be rejected straightway. In other words, printed conditions mentioned in the tender bids submitted by vendors will not be binding on IITG. All the terms and conditions for the supply, payment terms, penalty etc. will be as those mentioned herein and no change in the terms and conditions by the vendors will be acceptable.</span></li>
            <li className="niq-li" contentEditable suppressContentEditableWarning><span><span className="niq-subheading">Specifications are basic essence of the product (Both foreign &amp; indigenous):</span> It must be ensured that the offers are strictly as per our specifications. A quotation has to be supported with the printed technical leaflet/literature (wherever applicable) and the specifications mentioned in the quotation must be reflected/supported by such printed technical leaflet/literature. Model quoted/tendered specifications should invariably be highlighted in the leaflet/literature for easy reference.</span></li>
            <li className="niq-li" contentEditable suppressContentEditableWarning><span><span className="niq-subheading">Enquiry during the course of evaluation not allowed (Both foreign &amp; indigenous):</span> No enquiry shall be made by the bidder(s) during the course of evaluation of the tender till final decision is conveyed to the successful bidder(s). However, the Committee/its authorized representative and office of IIT GUWAHATI can make any enquiry/seek clarification from the bidders. The bidders can also be asked to arrange demo. of the offered items on short notice.</span></li>
            <li className="niq-li" contentEditable suppressContentEditableWarning><span>The acceptance of the quotation (Both foreign &amp; indigenous) will rest solely with the Director, IITG, who in the interest of the Institute is not bound to accept the lowest quotation and reserves the right to himself to reject or partially accept any or all the quotations received without assigning any reasons.</span></li>
            <li className="niq-li" contentEditable suppressContentEditableWarning>
                <span>
                    <span className="niq-subheading">Force Majeure (Both foreign &amp; indigenous):</span> If the performance of the obligation of either party is rendered commercially impossible by any of the events hereafter mentioned that party shall be under no obligation to perform the agreement under order after giving notice of 15 days from the date of such an event in writing to the other party, and the events referred to are as follows:
                    <ol className="niq-ol" style={{ listStyleType: 'upper-roman' }}>
                        <li className="niq-li">Any law, statute or ordinance, order, action or regulations of the Government of India.</li>
                        <li className="niq-li">Any kind of natural disaster, and</li>
                        <li className="niq-li">Strikes, acts of the Public enemy, war, insurrections, riots, lockouts, sabotage.</li>
                    </ol>
                </span>
            </li>
            <li className="niq-li" contentEditable suppressContentEditableWarning>
                <span>
                    <span className="niq-subheading">Termination for default (Both foreign &amp; indigenous):</span> Default is said to have occurred:
                    <ul className="niq-ul">
                        <li className="niq-li">If the supplier fails to deliver any or all of the services within the time period(s) specified in the purchase order or any extension thereof granted by IIT.</li>
                        <li className="niq-li">If the supplier fails to perform any other obligation(s) under the contract.</li>
                    </ul>
                    If the vendor, in either of the above circumstances, does not take remedial steps within a period of 30 days after receipt of the default notice from IIT (or takes longer period in-spite of what IIT may authorize in writing), IIT may terminate the contract/purchase order in whole or in part and forfeit the EMD/PBG as applicable.
                </span>
            </li>
            <li className="niq-li" contentEditable suppressContentEditableWarning>
                <span>
                    <span className="niq-subheading">Applicable Law (Both foreign &amp; indigenous):</span>
                    <ol className="niq-ol-alpha">
                        <li className="niq-li">The contract shall be governed by the laws and procedures established by Govt. of India and subject to exclusive jurisdiction of Competent Court and Forum in Guwahati, India only.</li>
                        <li className="niq-li">Any dispute arising out of this purchase shall be referred to the Director IIT Guwahati, and if either of the parties hereto is dissatisfied with the decision, the dispute shall be referred to the decision of an Arbitrator, who should be acceptable to both the parties, to be appointed by the Director of the Institute. The decision of such Arbitrator shall be final and binding on both the parties.</li>
                    </ol>
                </span>
            </li>
        </>
    );
});

const ImportedGoodsTerms = React.memo(function ImportedGoodsTerms() {
    return (
        <>
            <div style={{ fontWeight: 'bold', marginTop: '14px', marginBottom: '4px' }} contentEditable suppressContentEditableWarning>ADDITIONAL TERMS FOR IMPORTED GOODS</div>
            <div style={{ marginBottom: '8px' }} contentEditable suppressContentEditableWarning>Following terms besides the fore mentioned terms will be applicable in case of foreign purchases:</div>
            <li className="niq-li" contentEditable suppressContentEditableWarning>
                <span>
                    <span className="niq-subheading">Rates:</span> Quoted rates should be in FOR IITG else CIF/CIP Kolkata terms and charges to be stated in the following break-ups:
                    <ol className="niq-ol-alpha">
                        <li className="niq-li">Ex-works value</li>
                        <li className="niq-li">(+) Documentation &amp; Handling Charge, if any</li>
                        <li className="niq-li">(+) Estimated Overseas Freight to be paid at actual against authentic documents and monetary receipt</li>
                        <li className="niq-li">(+) Estimated Overseas Insurance Charge to be paid at actual against authentic documents and monetary receipt</li>
                        <li className="niq-li">Total CIP/CIF Kolkata value</li>
                        <li className="niq-li">Estimate up to FOR IITG from Kolkata.</li>
                        <li className="niq-li">Total up to IITG.</li>
                    </ol>
                </span>
            </li>
            <li className="niq-li" contentEditable suppressContentEditableWarning><span><span className="niq-subheading">After Sales Service:</span> In case of imported stores, foreign manufacturing firms should indicate facilities available for after sales service in India without which their offers are liable to be ignored.</span></li>
            <li className="niq-li" contentEditable suppressContentEditableWarning>
                <span>
                    <span className="niq-subheading">Delivery:</span>
                    <ol className="niq-ol-alpha">
                        <li className="niq-li">Delivery of goods at IIT Guwahati, will have to be maximum within 95 (ninety-five) days from the date of issue of the Purchase Order.</li>
                        <li className="niq-li">Delivery at Kolkata Airport only: As we do not have clearing agent in any other Airport/Seaport, delivery is to be made only at Kolkata.</li>
                        <li className="niq-li">While transshipment will be allowed, part shipment will not be allowed.</li>
                    </ol>
                </span>
            </li>
            <li className="niq-li" contentEditable suppressContentEditableWarning>
                <span>
                    <span className="niq-subheading">Payment:</span>
                    <ol className="niq-ol-alpha">
                        <li className="niq-li">Above $10,000.00: By an irrevocable letter of Credit at CIF/CIP Kolkata value negotiable through any overseas branch of State Bank of India/Canara Bank with unrestricted provision.</li>
                        <li className="niq-li">
                            Below $10,000.00 by FDD/Wire Transfer as given below:
                            <ol className="niq-ol-roman">
                                <li className="niq-li">Advance payment Against Bank Guarantee: 90% of the price will be paid in advance against equivalent bank guarantee from a scheduled bank provided by the supplier/Indian Agent. The remaining 10% shall be released only after receipt and acceptance of materials in good condition or after satisfactory installation and commissioning of the equipment. or</li>
                                <li className="niq-li">Payment Against Proof of Despatch: 90% of the price will be paid against receipt of proof of dispatch such as AWB, Invoice, Packing List, Insurance certificate, etc. The remaining 10% shall be released only after receipt and acceptance of materials in good condition or after satisfactory installation and commissioning of the equipment. or</li>
                                <li className="niq-li">100% Payment Basis: On request by the supplier/s 100% payment by FDD will be made. In this case on receipt of your Order Acknowledgement an FDD will be established for total ordered value, thereupon a Xerox copy of the FDD will be sent to you which will enable you to send the materials. On satisfactory receipt and acceptance of the materials or satisfactory installation and commission of the equipment the Original FDD will be sent to you.</li>
                            </ol>
                            Note: FDD/LoC will not be opened unless and until Letter of Acknowledgement in original is received at IIT Guwahati, directly from the principal. The Indian agents are therefore advised to submit quotation after consultation with their respective principals.
                        </li>
                    </ol>
                </span>
            </li>
            <li className="niq-li" contentEditable suppressContentEditableWarning><span><span className="niq-subheading">Customs Duty:</span> The Institute is generally exempted from payment of Customs Duty vide GOI Notification No. 51/96-Customs, dated 23.07.96, with Regn. No. TU/V/RG-CDE (351)/2006, dated 14.09.2006. [CUSTOMS DUTY EXEMPTION CERTIFICATE WILL BE MADE AVAILABLE BY THE INSTITUTE IN REGARD TO QUOTES IN FOREIGN CURRENCY ONLY].</span></li>
            <li className="niq-li" contentEditable suppressContentEditableWarning><span><span className="niq-subheading">Agency Commission:</span> The percentage of ex-works value to be paid to Indian agent in equivalent Indian currency as agency commission as applicable will have to be clearly stated in the quotation.</span></li>
            <li className="niq-li" contentEditable suppressContentEditableWarning><span><span className="niq-subheading">After Sales Service:</span> For equipment to be imported the quotation will have to clearly state the available nearest after sales service centre and contact no. in India.</span></li>
            <li className="niq-li" contentEditable suppressContentEditableWarning><span><span className="niq-subheading">Country of Origin:</span> While Country of Origin Certificate will not be insisted, the same however will have to be stated in the Original Invoice for payment through LoC.</span></li>
            <li className="niq-li" contentEditable suppressContentEditableWarning><span><span className="niq-subheading">LoC Amendment:</span> LoC/FDD amendment charges due to mistake on the part of the supplier, if any, will have to be borne by the supplier.</span></li>
        </>
    );
});

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function NIQForm() {
    const { igfId } = useParams<{ igfId?: string }>();
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const [bidType, setBidType] = useState<'single' | 'double'>('single');
    const [f, setF] = useState<NIQFields>({
        niqNumber: '',
        phone1: '',
        phone2: '',
        fax: '',
        email: 'iiisi@iitg.ac.in',
        indenterName: '',
        designation: '',
        address: '',
        itemName: '',
        deptName: '',
        projectNumber: '',
        lastDate: '',
        bidOpeningDate: '',
    });

    // Additional T&C ref (contentEditable, no React state needed)
    const additionalTcRef = useRef<HTMLDivElement>(null);
    const [additionalTcPlaceholder, setAdditionalTcPlaceholder] = useState(true);

    // Fetch IGF doc if igfId provided (passing null/undefined disables the hook)
    const { data: igfDoc } = useFrappeGetDoc(
        'Indent General Form',
        igfId ?? null as any,
    );

    // Raw department ID from the IGF doc (e.g. "DEPT-001")
    const [rawDeptId, setRawDeptId] = useState('');

    // Resolve the department ID → human-readable name
    const { data: deptData } = useFrappeGetCall<{ message: { dept_name: string } }>(
        'frappe.client.get_value',
        rawDeptId ? {
            doctype: 'Department_prornd',
            filters: rawDeptId,
            fieldname: 'dept_name',
        } : undefined,
        rawDeptId ? undefined : null,
        { revalidateOnFocus: false },
    );

    // Once resolved, write the human-readable name into f.deptName
    useEffect(() => {
        const label = deptData?.message?.dept_name;
        if (label) {
            setF(prev => ({ ...prev, deptName: label }));
        }
    }, [deptData]);

    // Pre-fill form fields from IGF doc once loaded
    useEffect(() => {
        if (!igfDoc) return;
        const doc = igfDoc as any;

        // Derive item name from first item in items table
        let derivedItemName = '';
        if (Array.isArray(doc.igf_items) && doc.igf_items.length > 0) {
            const firstItem = doc.igf_items[0];
            derivedItemName = firstItem.igf_item_name
                || firstItem.igf_description
                || firstItem.description
                || firstItem.item_name
                || '';
        }

        // Bid type based on number_of_bids
        const bidsField: string = doc.igf_number_of_bids || '';
        if (bidsField.toLowerCase().includes('double')) {
            setBidType('double');
        }

        const deptId = doc.igf_department_centre_section || '';
        setRawDeptId(deptId);    // triggers dept name resolution

        setF(prev => ({
            ...prev,
            indenterName: doc.igf_indenter || prev.indenterName,
            designation: doc.igf_indenter_designation || prev.designation,
            projectNumber: doc.igf_project_code || prev.projectNumber,
            // Temporarily store the raw ID; the deptData effect will overwrite with the label
            deptName: deptId || prev.deptName,
            itemName: derivedItemName || prev.itemName,
        }));
    }, [igfDoc]);

    const upd = (key: keyof NIQFields) => (val: string) => setF(prev => ({ ...prev, [key]: val }));

    const handlePrint = () => {
        const paper = document.querySelector('.niq-paper') as HTMLElement | null;
        if (!paper) { window.print(); return; }

        // Collect all inputs/textareas inside the paper
        const inputs = paper.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input.niq-input, textarea.niq-input');
        const replacements: { placeholder: Comment; original: HTMLInputElement | HTMLTextAreaElement }[] = [];

        inputs.forEach((el) => {
            const span = document.createElement('span');
            span.textContent = el.value || el.placeholder || '';
            span.style.cssText = 'font-family:inherit;font-size:inherit;color:black;';
            const marker = document.createComment('niq-print-placeholder');
            el.parentNode?.insertBefore(marker, el);
            el.parentNode?.insertBefore(span, el);
            el.style.display = 'none';
            replacements.push({ placeholder: marker, original: el });
        });

        window.print();

        // Restore after print dialog closes
        replacements.forEach(({ placeholder, original }) => {
            // Remove the span that was inserted before the marker
            const prev = placeholder.previousSibling;
            if (prev?.nodeType === Node.ELEMENT_NODE) prev.parentNode?.removeChild(prev);
            // Remove marker
            placeholder.parentNode?.removeChild(placeholder);
            // Restore original input
            original.style.display = '';
        });
    };

    return (
        <div className="min-h-screen bg-zinc-300 p-4 md:p-8 flex justify-center gap-4 items-start">
            <style>{PRINT_STYLES}</style>

            {/* ── TOOLBAR ───────────────────────────────────────────────────── */}
            <div className="no-print sticky top-8 flex flex-col gap-2 p-3 bg-white border border-zinc-200 rounded-xl shadow-xl h-fit min-w-[130px]">
                <button
                    onClick={handlePrint}
                    className="flex items-center justify-center gap-2 p-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                    title="Print / Save as PDF"
                >
                    <Printer size={16} /> Print
                </button>
                <div className="h-px bg-zinc-200 my-1" />
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide px-1">Bid Type</div>
                <button
                    onClick={() => setBidType('single')}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${bidType === 'single' ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
                >
                    Single Bid
                </button>
                <button
                    onClick={() => setBidType('double')}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${bidType === 'double' ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
                >
                    Double Bid
                </button>
                <div className="h-px bg-zinc-200 my-1" />
                <div className="text-xs text-zinc-400 px-1 leading-tight">
                    <Edit2 size={10} className="inline mr-1" />
                    Click any T&amp;C clause to edit it inline
                </div>
            </div>

            {/* ── A4 PAPER ──────────────────────────────────────────────────── */}
            <div
                className="niq-paper bg-white shadow-2xl border border-zinc-300 text-black"
                style={{
                    width: '210mm',
                    minHeight: '297mm',
                    padding: '15mm 18mm',
                    fontFamily: '"Times New Roman", Times, serif',
                    fontSize: '13px',
                    lineHeight: '1.55',
                    boxSizing: 'border-box',
                }}
            >
                {/* ── HEADER TABLE ──────────────────────────────────────────── */}
                <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: '2px solid black', marginBottom: '10px' }}>
                    <tbody>
                        <tr>
                            <td style={{ width: '50%', padding: '6px 10px 10px', verticalAlign: 'top', borderRight: '1px solid black', textAlign: 'center' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '13px' }}>
                                    Office of Industrial Interactions and Special Initiatives
                                </div>
                                <div style={{ fontWeight: 'bold', fontSize: '15px' }}>
                                    Indian Institute of Technology Guwahati
                                </div>
                                <div style={{ fontSize: '11px' }}>Guwahati-781039, Assam, India</div>
                            </td>
                            <td style={{ padding: '6px 10px 10px', verticalAlign: 'top', fontSize: '11px' }}>
                                <table>
                                    <tbody>
                                        <tr>
                                            <td style={{ fontWeight: 'bold', paddingRight: '6px', whiteSpace: 'nowrap' }}>Phone Nos.</td>
                                            <td>: +91-361-258-<F value={f.phone1} onChange={upd('phone1')} size={4} /></td>
                                        </tr>
                                        <tr>
                                            <td></td>
                                            <td>: +91-361-258-<F value={f.phone2} onChange={upd('phone2')} size={4} /></td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: 'bold', paddingRight: '6px' }}>Fax</td>
                                            <td>: +91-361-258-2089</td>
                                        </tr>
                                        <tr>
                                            <td></td>
                                            <td>: +91-361-269-<F value={f.fax} onChange={upd('fax')} size={4} /></td>
                                        </tr>
                                        <tr>
                                            <td style={{ fontWeight: 'bold', paddingRight: '6px' }}>Email</td>
                                            <td>: <F value={f.email} onChange={upd('email')} size={20} /></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td colSpan={2} style={{ padding: '10px 10px 6px', borderTop: '1px solid #ccc' }}>
                                <div style={{ marginLeft: '20px' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase' }}>
                                        <F value={f.indenterName} onChange={upd('indenterName')} size={24} />
                                    </div>
                                    <div style={{ fontStyle: 'italic' }}>
                                        <F value={f.designation} onChange={upd('designation')} size={24} />
                                    </div>
                                </div>
                            </td>
                        </tr>
                        <tr>
                            <td style={{ padding: '4px 10px' }}></td>
                            <td style={{ padding: '4px 10px', textAlign: 'right', fontSize: '12px' }}>
                                <div><strong>Date:</strong> {today}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
                                    <strong>NIQ No.:</strong>
                                    <F value={f.niqNumber} onChange={upd('niqNumber')} size={22} placeholder="IITG/II&SI/PROJECT/____" />
                                </div>
                                {f.niqNumber && (
                                    <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'flex-end' }}>
                                        <QRCode value={f.niqNumber} size={48} />
                                    </div>
                                )}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* ── SINGLE BID CONTENT ────────────────────────────────────── */}
                {bidType === 'single' && (
                    <div>
                        <div style={{ textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase', margin: '16px 0 8px', fontSize: '13px' }}>
                            Notice Inviting Quotation for Supply &amp; Installation of{' '}
                            <F value={f.itemName} onChange={upd('itemName')} size={28} placeholder="[Item Name]" />{' '}
                            for the Department of{' '}
                            <F value={f.deptName} onChange={upd('deptName')} size={20} placeholder="[Department]" />{' '}
                            (Project No.{' '}
                            <F value={f.projectNumber} onChange={upd('projectNumber')} size={14} placeholder="[Proj No.]" />
                            ), IIT Guwahati.
                        </div>

                        <p style={{ marginBottom: '12px', textAlign: 'justify' }}>
                            Quotations for supply of equipment as per details at <strong>ANNEXURE-I-</strong>, in single bid as indicated in the
                            CHECKLIST given below, in sealed covers, are hereby invited so as to reach the undersigned on or before{' '}
                            <strong><F value={f.lastDate} onChange={upd('lastDate')} size={16} placeholder="[Last Date]" /></strong>.
                        </p>

                        <span className="niq-center-header">INSTRUCTION TO BIDDERS</span>
                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Single Bid:</div>
                        <ol className="niq-ol">
                            <li className="niq-li">
                                In case of single bid quotations will have to be submitted in single bid, in a properly sealed cover; and the
                                address of the firm submitting the quotation and the Officer to whom the quotation is addressed, must appear
                                distinctly on the sealed cover. Further, on the sealed cover the following are to be written:{' '}
                                <strong>
                                    'QUOTATION FOR SUPPLY &amp; INSTALLATION OF {f.itemName || '[Item]'} FOR THE DEPARTMENT OF {f.deptName || '[Dept]'}{' '}
                                    (PROJECT NO. {f.projectNumber || '[Proj]'}), IIT GUWAHATI. VIDE NIQ NO. {f.niqNumber || '[NIQ No.]'},{' '}
                                    LAST DATE FOR SUBMISSION {f.lastDate || '[Date]'}'
                                </strong>
                                <br />
                                <span className="niq-subheading">NOTE:</span> The bid documents are not transferable and the firm's seal and
                                signature of the authorized official must appear on all the papers and envelopes submitted.
                            </li>
                            <li className="niq-li">The bid must mention the prices of all items asked for individually and then summed up at last i.e. basic price and other charges such as Packing, Freight, insurance, Installation &amp; commissioning charge, VAT/Tax etc as applicable.</li>
                            <li className="niq-li">Annual Maintenance Contract (AMC) rate (after expiry of warranty period) is to be clearly indicated – preferably in both comprehensive and non-comprehensive terms, failure to which the offer may not be considered even if it turns out to be at the lowest price.</li>
                            <li className="niq-li">Details of the technical features of the offered equipment along with Standard Technical literature on each of the items offered.</li>
                            <li className="niq-li">Dealership certificate on the offered products in case of dealer/s.</li>
                            <li className="niq-li">List of reputed organizations/Institutions, where similar orders have been executed (copies of the purchase/work orders will have to be enclosed).</li>
                            <li className="niq-li">Up-to-date Sales Tax clearance certificate (for vendors outside the State of Assam)/VAT Registration Certificate indicating also the TIN number (for vendors from within the State of Assam) OF THE FIRM will have to accompany the quotation to be submitted.</li>
                            <li className="niq-li">Details of nature and maximum period of warranty offered by the vendor.</li>
                            <li className="niq-li">After Sales Service: The name &amp; address of the nearest available authorized service centre to IIT, North Guwahati, should be stated in the quotation.</li>
                        </ol>

                        <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginTop: '12px' }}>TERMS &amp; CONDITIONS:</div>
                        <div style={{ fontStyle: 'italic', fontSize: '11px', marginBottom: '8px' }} className="tc-editable-hint">
                            (Click any clause below to edit it inline. Use the "Additional Terms" section at the bottom to add new clauses.)
                        </div>
                        <div style={{ fontStyle: 'italic', fontSize: '11px', marginBottom: '8px' }}>
                            (Please note the term 'both foreign &amp; indigenous' wherever mentioned means the term is applicable to both foreign &amp; indigenous purchase)
                        </div>
                        <ol className="niq-ol tc-editable">
                            <CommonTnC startIndex={1} />
                            <ImportedGoodsTerms />
                        </ol>

                        {/* Additional T&C section */}
                        <AdditionalTerms />

                        <div style={{ marginTop: '20px' }}>
                            <div><strong>Name:</strong> {f.indenterName}</div>
                            <div><strong>Designation:</strong> {f.designation}</div>
                            <div style={{ marginTop: '4px' }}>
                                <strong>Address:</strong>{' '}
                                <textarea
                                    className="niq-input"
                                    value={f.address}
                                    onChange={e => upd('address')(e.target.value)}
                                    rows={2}
                                    style={{ width: '300px', verticalAlign: 'top', resize: 'vertical' }}
                                    placeholder="Enter address..."
                                />
                            </div>
                        </div>
                        <div style={{ marginTop: '10px', fontWeight: 'bold' }}>Encl.: ANNEXURES</div>
                    </div>
                )}

                {/* ── DOUBLE BID CONTENT ────────────────────────────────────── */}
                {bidType === 'double' && (
                    <div>
                        <div style={{ textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase', margin: '16px 0 8px', fontSize: '13px' }}>
                            Notice Inviting Quotation for Supply &amp; Installation of{' '}
                            <F value={f.itemName} onChange={upd('itemName')} size={28} placeholder="[Item Name]" />{' '}
                            for the Department of{' '}
                            <F value={f.deptName} onChange={upd('deptName')} size={20} placeholder="[Department]" />{' '}
                            (Project No.{' '}
                            <F value={f.projectNumber} onChange={upd('projectNumber')} size={14} placeholder="[Proj No.]" />
                            ), IIT Guwahati.
                        </div>

                        <p style={{ marginBottom: '12px', textAlign: 'justify' }}>
                            Quotations for supply of equipment as per details at <strong>ANNEXURE-I-</strong>, in double bid as indicated in the
                            CHECKLIST given below, in sealed covers, are hereby invited so as to reach the undersigned on or before{' '}
                            <strong><F value={f.lastDate} onChange={upd('lastDate')} size={16} placeholder="[Last Date]" /></strong>.{' '}
                            Bid opening date:{' '}
                            <strong><F value={f.bidOpeningDate} onChange={upd('bidOpeningDate')} size={16} placeholder="[Opening Date]" /></strong>.
                        </p>

                        <span className="niq-center-header">INSTRUCTION TO BIDDERS</span>
                        <ol className="niq-ol">
                            <li className="niq-li">
                                <span className="niq-subheading">Two Bids:</span>
                                <ol className="niq-ol">
                                    <li className="niq-li">
                                        In case of two bid system quotations will have to be submitted in TWO PARTS i.e. (a) Technical Bid and (b) Price Bid, in two separate properly sealed covers; and both these covers will have to be again put into a single sealed cover. Also, the address of the firm submitting the quotation and the Officer to whom the quotation is addressed, must appear distinctly on both the inner sealed covers, indicating also TECHNICAL BID/PRICE BID as may be applicable. Further, on both the inner sealed covers and the outer sealed cover, the following are to be written:{' '}
                                        <strong>
                                            'QUOTATION FOR SUPPLY &amp; INSTALLATION OF {f.itemName || '[Item]'} FOR THE {f.deptName || '[Dept]'} IIT GUWAHATI.
                                            VIDE REF NO. {f.niqNumber || '[NIQ No.]'}, LAST DATE FOR SUBMISSION {f.lastDate || '[Date]'} DATE OF OPENING {f.bidOpeningDate || '[Opening Date]'}'
                                        </strong>{' '}
                                        (as per Checklist).<br />
                                        <span className="niq-subheading">NOTE:</span> The bid documents are not transferable and the firm's seal and signature of the authorized official must appear on all the papers and envelopes submitted.
                                    </li>
                                    <li className="niq-li">
                                        In the part relating to Technical Bid, the vendor must provide the followings:
                                        <ol className="niq-ol-alpha">
                                            <li className="niq-li">Details of the technical features of the offered equipment;</li>
                                            <li className="niq-li">Standard Technical literature on each of the items offered;</li>
                                            <li className="niq-li">Dealership certificate on the offered products in case of dealer/s;</li>
                                            <li className="niq-li">List of reputed organizations/Institutions, where similar orders have been executed (copies of the purchase/work orders will have to be enclosed);</li>
                                            <li className="niq-li">Up-to-date Sales Tax clearance certificate/VAT Registration Certificate indicating TIN number;</li>
                                            <li className="niq-li">Details of nature and maximum period of warranty offered by the vendor;</li>
                                            <li className="niq-li">After Sales Service: The name &amp; address of the nearest available authorized service centre to IIT, Guwahati, should be stated in the quotation;</li>
                                            <li className="niq-li">A copy of the Price Bid, WITHOUT THE PRICES, will have to be provided as part of the technical bid document.</li>
                                        </ol>
                                    </li>
                                    <li className="niq-li">
                                        In the part relating to Price Bid, the vendor must provide the followings:
                                        <ol className="niq-ol-alpha">
                                            <li className="niq-li">Quantity, basic price (against item-wise details of specifications of each of the offered items);</li>
                                            <li className="niq-li">Prices of each of the optional accessories;</li>
                                            <li className="niq-li">Packing &amp; Forwarding Charge, if any;</li>
                                            <li className="niq-li">Central/State Sales Tax/VAT;</li>
                                            <li className="niq-li">Freight &amp; insurance charge, if any;</li>
                                            <li className="niq-li">Annual Maintenance Contract (AMC) rate (after expiry of warranty period);</li>
                                            <li className="niq-li">Installation &amp; commissioning charge (including Service Tax), to be shown item-wise extra, if any.</li>
                                        </ol>
                                    </li>
                                </ol>
                            </li>
                        </ol>

                        <div style={{ fontWeight: 'bold', textDecoration: 'underline', marginTop: '12px' }}>TERMS &amp; CONDITIONS:</div>
                        <div style={{ fontStyle: 'italic', fontSize: '11px', marginBottom: '8px' }} className="tc-editable-hint">
                            (Click any clause below to edit it inline. Use the "Additional Terms" section at the bottom to add new clauses.)
                        </div>
                        <div style={{ fontStyle: 'italic', fontSize: '11px', marginBottom: '8px' }}>
                            (Please note the term 'both foreign &amp; indigenous' wherever mentioned means the term is applicable to both foreign &amp; indigenous purchase)
                        </div>
                        <ol className="niq-ol tc-editable">
                            <CommonTnC startIndex={1} />
                            <ImportedGoodsTerms />
                        </ol>

                        {/* Additional T&C section */}
                        <AdditionalTerms />

                        <div style={{ marginTop: '20px' }}>
                            <div><strong>Name:</strong> {f.indenterName}</div>
                            <div><strong>Designation:</strong> {f.designation}</div>
                            <div style={{ marginTop: '4px' }}>
                                <strong>Address:</strong>{' '}
                                <textarea
                                    className="niq-input"
                                    value={f.address}
                                    onChange={e => upd('address')(e.target.value)}
                                    rows={2}
                                    style={{ width: '300px', verticalAlign: 'top', resize: 'vertical' }}
                                    placeholder="Enter address..."
                                />
                            </div>
                        </div>
                        <div style={{ marginTop: '10px', fontWeight: 'bold' }}>Encl.: ANNEXURES</div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Additional Terms Editor ──────────────────────────────────────────────────
// Separate component so it doesn't re-mount when parent re-renders
const AdditionalTerms = React.memo(function AdditionalTerms() {
    const [items, setItems] = useState<string[]>([]);
    const [showAdd, setShowAdd] = useState(false);
    const [draft, setDraft] = useState('');

    const addItem = () => {
        if (!draft.trim()) return;
        setItems(prev => [...prev, draft.trim()]);
        setDraft('');
        setShowAdd(false);
    };

    if (items.length === 0 && !showAdd) {
        return (
            <div className="no-print" style={{ marginTop: '8px' }}>
                <button
                    onClick={() => setShowAdd(true)}
                    style={{ fontSize: '11px', color: '#1a56db', cursor: 'pointer', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                    <PlusCircle size={12} /> Add additional terms &amp; conditions
                </button>
            </div>
        );
    }

    return (
        <div style={{ marginTop: '12px' }}>
            {items.length > 0 && (
                <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>ADDITIONAL TERMS &amp; CONDITIONS:</div>
                    <ol className="niq-ol" start={100} style={{ listStyleType: 'lower-roman' }}>
                        {items.map((item, idx) => (
                            <li
                                key={idx}
                                className="niq-li"
                                contentEditable
                                suppressContentEditableWarning
                            >
                                {item}
                                <button
                                    className="no-print"
                                    onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                                    style={{ marginLeft: '8px', fontSize: '10px', color: '#e53e3e', cursor: 'pointer', background: 'none', border: 'none' }}
                                >
                                    ✕
                                </button>
                            </li>
                        ))}
                    </ol>
                </div>
            )}
            {showAdd ? (
                <div className="no-print" style={{ marginTop: '8px', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                    <textarea
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        placeholder="Type additional clause text here..."
                        rows={3}
                        style={{
                            flex: 1,
                            fontFamily: '"Times New Roman", Times, serif',
                            fontSize: '13px',
                            padding: '6px',
                            border: '1px solid #aaa',
                            borderRadius: '4px',
                            resize: 'vertical',
                        }}
                        autoFocus
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <button
                            onClick={addItem}
                            style={{ padding: '4px 10px', background: '#1a56db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                        >
                            Add
                        </button>
                        <button
                            onClick={() => { setShowAdd(false); setDraft(''); }}
                            style={{ padding: '4px 10px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    className="no-print"
                    onClick={() => setShowAdd(true)}
                    style={{ fontSize: '11px', color: '#1a56db', cursor: 'pointer', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}
                >
                    <PlusCircle size={12} /> Add another clause
                </button>
            )}
        </div>
    );
});
