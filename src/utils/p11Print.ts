import p11Template from '@/pages/printformat/p_11_format.html?raw';

const fmtNum = (val: any) => {
    const n = Number(val) || 0;
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export function generateP11Html(formData: Record<string, any>): string {
    const rows: any[] = Array.isArray(formData.table_hsrb) ? formData.table_hsrb : [];
    const creation = formData.creation
        ? new Date(formData.creation).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '';

    const itemRows = rows.map((row, i) => `
        <tr>
            <td class="center">${i + 1}</td>
            <td>${row.item_name || ''}</td>
            <td>${row.item_description || ''}</td>
            <td class="center">${row.item_quantity ?? 0}</td>
            <td class="right">${fmtNum(row.item_unit_price)}</td>
            <td class="right">${fmtNum(row.dp_total_price)}</td>
        </tr>`).join('');

    const summaryRows = [
        `<tr><td colspan="5">Total Basic Value:</td><td class="right">${fmtNum(formData.total_basic_value)}</td></tr>`,
        Number(formData.packing_and_forwarding) ? `<tr><td colspan="5">Packing &amp; Forwarding:</td><td class="right">${fmtNum(formData.packing_and_forwarding)}</td></tr>` : '',
        Number(formData.freight) ? `<tr><td colspan="5">Freight:</td><td class="right">${fmtNum(formData.freight)}</td></tr>` : '',
        Number(formData.other_charges) ? `<tr><td colspan="5">Other Charges:</td><td class="right">${fmtNum(formData.other_charges)}</td></tr>` : '',
        `<tr><td colspan="5"><strong>Grand Total:</strong></td><td class="right"><strong>${fmtNum(formData.grand_total)}</strong></td></tr>`,
    ].join('');

    return p11Template
        .replace('{{OWNER}}', formData.owner || '')
        .replace('{{DOC_REF}}', formData.name || '')
        .replace('{{DATE}}', creation)
        .replace('{{QUOTATION_FROM}}', formData.quotation_recieved_for_purchase_of_the__items_from_ms || '')
        .replace('{{RECOMMENDATION_FROM}}', formData.the_purchase_committe_recommends_purchase_of_the_items_from_ms || '')
        .replace('{{ITEM_ROWS}}', itemRows)
        .replace('{{SUMMARY_ROWS}}', summaryRows);
}
