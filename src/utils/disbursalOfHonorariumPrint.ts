import dohTemplate from "@/pages/printformat/disbursal_of_honorarium_format.html?raw";

const fmt = (val: any) => {
    const n = Number(val);
    if (!val && val !== 0) return "";
    if (isNaN(n)) return String(val);
    return n.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

type LinkOptionLike = { value: string; label: string };

// Department/Budget Head fields come back from the backend as raw Frappe doc
// names/ids (e.g. "otho2cn3vc"), not the human-readable label. The link_options
// loaded by the caller (keyed by fieldname, containing the full Department_prornd /
// Budget Head list) is used to translate every occurrence — including per-row
// department_section in the honorarium table — before rendering the print HTML.
export function resolveHonorariumPrintData(
    formData: Record<string, any>,
    linkOptions: Record<string, LinkOptionLike[] | undefined>,
): Record<string, any> {
    const findLabel = (keys: string[], value: any): string | undefined => {
        if (!value) return undefined;
        for (const key of keys) {
            const label = linkOptions?.[key]?.find((o) => o.value === value)?.label;
            if (label) return label;
        }
        return undefined;
    };

    const deptKeys = ["applicant_department", "department_for", "Department_prornd", "department"];

    const resolvedRows = Array.isArray(formData.table_weoy)
        ? formData.table_weoy.map((row: any) => ({
              ...row,
              department_section:
                  findLabel(deptKeys, row.department_section) || row.department_section,
          }))
        : formData.table_weoy;

    return {
        ...formData,
        account_head:
            findLabel(["account_head", "Budget Head"], formData.account_head) ||
            formData.account_head,
        applicant_department:
            findLabel(deptKeys, formData.applicant_department) || formData.applicant_department,
        department_for: findLabel(deptKeys, formData.department_for) || formData.department_for,
        table_weoy: resolvedRows,
    };
}

export function generateDisbursalOfHonorariumHtml(
    formData: Record<string, any>,
): string {
    const rows: any[] = Array.isArray(formData.table_weoy)
        ? formData.table_weoy
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
            <td>${row.name1 || ""}</td>
            <td>${row.designation || ""}</td>
            <td>${row.department_section || ""}</td>
            <td>${row.emp_id || ""}</td>
            <td>${row.nature_of_work || ""}</td>
            <td class="center">${row.from || ""}</td>
            <td class="center">${row.to || ""}</td>
            <td>${row.bank_account_number || ""}${row.ifsc_code ? ` / ${row.ifsc_code}` : ""}</td>
            <td class="right">${fmt(row.amount)}</td>
        </tr>`,
        )
        .join("");

    let beneficiarySection = "";
    if (formData.applying_for_self_or_other === "Other") {
        beneficiarySection = `
        <div class="section-title">Beneficiary Details</div>
        <table class="info-table">
            <tr>
                <td class="label">Name</td>
                <td>${formData.name_of_applicant_for || "-"}</td>
                <td class="label">Designation</td>
                <td>${formData.designation_of_applicant_for || "-"}</td>
            </tr>
            <tr>
                <td class="label">Department</td>
                <td colspan="3">${formData.department_for || "-"}</td>
            </tr>
        </table>
        `;
    }

    return dohTemplate
        .replace("{{DOC_REF}}", formData.name || "")
        .replace("{{DATE}}", creation)
        .replace("{{APPLICANT_NAME}}", formData.name_of_applicant || "")
        .replace("{{APPLICANT_DESIGNATION}}", formData.designation_of_applicant || "-")
        .replace("{{APPLICANT_DEPARTMENT}}", formData.applicant_department || "-")
        .replace("{{APPLYING_FOR}}", formData.applying_for_self_or_other || "-")
        .replace("{{PROJECT_NO}}", formData.project_no || "")
        .replace("{{ACCOUNT_HEAD}}", formData.account_head || "-")
        .replace("{{PROJECT_NAME}}", formData.project_name || "-")
        .replace("{{BENEFICIARY_SECTION}}", beneficiarySection)
        .replace("{{ITEM_ROWS}}", itemRows)
        .replace("{{TOTAL_AMOUNT}}", fmt(formData.total_amount))
        .replace("{{APPROVAL_COMP_AUTHORITY}}", formData.approval_comp_authority || "-");
}
