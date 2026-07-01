import tempTemplate from "@/pages/printformat/temporary_advance_format.html?raw";

const fmtNum = (val: any) => {
    const n = Number(val) || 0;
    return n.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

export function generateTemporaryAdvanceHtml(
    data: Record<string, any>,
    resolvedProjectTitle: string,
    resolvedAccountHead: string
): string {
    const creation = data.creation
        ? new Date(data.creation).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        })
        : "";

    let beneficiarySection = "";
    if (data.advance_for_id || data.advance_for_department || data.advance_for_designation) {
        beneficiarySection = `
        <div class="section-title">Beneficiary Details</div>
        <table class="info-table">
            <tr>
                <td class="label">Beneficiary ID</td>
                <td>${data.advance_for_id || "-"}</td>
                <td class="label">Department</td>
                <td>${data.advance_for_department || "-"}</td>
            </tr>
            <tr>
                <td class="label">Designation</td>
                <td colspan="3">${data.advance_for_designation || "-"}</td>
            </tr>
        </table>
        `;
    }

    const indenterName = data.applicant_name || data.owner || "";

    const cleanHtml = tempTemplate
        .replace("{{DOC_REF}}", data.name || "")
        .replace("{{DATE}}", creation)
        .replace("{{PROJECT_CODE}}", data.project_code || "")
        .replace("{{ACCOUNT_HEAD}}", resolvedAccountHead || data.account_head || "")
        .replace("{{PROJECT_TITLE}}", resolvedProjectTitle || "")
        .replace("{{ADVANCE_AMOUNT}}", `₹ ${fmtNum(data.amount)}`)
        .replace("{{APPLYING_FOR}}", data.applying_for_select || "-")
        .replace("{{AMOUNT_IN_WORDS}}", data.amount_in_words || "-")
        .replace("{{APPLICANT_NAME}}", indenterName)
        .replace("{{APPLICANT_WEBMAIL}}", data.applicant_webmail || data.owner || "")
        .replace("{{APPLICANT_DEPARTMENT}}", data.applicant_department || "-")
        .replace("{{APPLICANT_DESIGNATION}}", data.applicant_designation || "-")
        .replace("{{APPLICANT_CATEGORY}}", data.applicant_category || "-")
        .replace("{{BENEFICIARY_SECTION}}", beneficiarySection)
        .replace("{{BANK_NAME}}", data.bank_name || "-")
        .replace("{{ACCOUNT_HOLDER}}", data.account || "-")
        .replace("{{ACCOUNT_NUMBER}}", data.bank_account_number || "-")
        .replace("{{IFSC_CODE}}", data.ifsc_code || "-")
        .replace("{{JUSTIFICATION}}", data.justification || data.reason || data.purpose || data.comments || "-");

    return cleanHtml;
}
