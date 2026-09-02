export const getApplicationRoute = (doctype: string, name: string) => {
    switch (doctype) {
        case "Fund Received":
            return `/fund-received/${name}`;
        case "Reimbursement":
            return `/reimbursement/${name}`;
        case "Disbursal of Consultancy":
            return `/disbursal-of-consultancy/${name}`;
        case "Travel":
            return `/travel/${name}`;
        case "Miscellaneous Commit":
            return `/miscellaneous-commit/${name}`;
        case "Loan Request":
            return `/loan-request/${name}`;
        case "Project Staff Extension":
            return `/project-staff-extension?edit=${encodeURIComponent(name)}`;
        case "Project Staff Resignation":
            return `/project-staff-resignation?edit=${encodeURIComponent(name)}`;
        case "Project Staff Details":
            return `/project-staff-joining?docname=${encodeURIComponent(name)}`;
        default:
            return `/task-registry/${doctype}/${name}`;
    }
};

/** The 12 application doctypes the delegation/create-on-behalf system covers. */
export interface DelegableApplicationDoctype {
    doctype: string;
    /** Frappe whitelisted method that returns { fields, link_options, prefill_data, child_table_fields } */
    getFieldsMethod: string;
    /** Field on the doctype that stores the linked Project Registration name — only for project-scoped doctypes */
    projectField?: string;
    /** Owner-identifying field the backend force-sets to delegator_user on create_application_on_behalf */
    ownerField?: string;
}

export const DELEGABLE_APPLICATION_DOCTYPES: DelegableApplicationDoctype[] = [
    {
        doctype: "Travel",
        getFieldsMethod: "rndopsapp.rndopsapp.doctype.travel.travel.get_travel_fields",
        projectField: "travel_project_number",
        ownerField: "webmail_id_travel",
    },
    {
        doctype: "TA DA Settlement",
        getFieldsMethod: "rndopsapp.rndopsapp.doctype.ta_da_settlement.ta_da_settlement.get_ta_da_settlement_fields",
        projectField: "project_no",
        ownerField: "webmail_id",
    },
    {
        doctype: "Temporary Advance",
        getFieldsMethod: "rndopsapp.rndopsapp.doctype.temporary_advance.temporary_advance.get_temporary_advance_fields",
        projectField: "project_name",
        ownerField: "applicant_webmail",
    },
    {
        doctype: "Advance Settlement",
        getFieldsMethod: "rndopsapp.rndopsapp.doctype.advance_settlement.advance_settlement.get_advance_settlement_fields",
        projectField: "project_name",
    },
    {
        doctype: "Reimbursement",
        getFieldsMethod: "rndopsapp.rndopsapp.doctype.reimbursement.reimbursement.get_reimbursement_fields",
        projectField: "project_number",
        ownerField: "applicant_webmail",
    },
    {
        doctype: "Direct Purchase",
        getFieldsMethod: "rndopsapp.rndopsapp.doctype.direct_purchase.direct_purchase.get_direct_purchase_fields",
    },
    {
        doctype: "Disbursal of Consultancy",
        getFieldsMethod: "rndopsapp.rndopsapp.doctype.disbursal_of_consultancy.disbursal_of_consultancy.get_disbursal_of_consultancy_fields",
        ownerField: "webmail_id",
    },
    {
        doctype: "Disbursal of Honorarium",
        getFieldsMethod: "rndopsapp.rndopsapp.doctype.disbursal_of_honorarium.disbursal_of_honorarium.get_disbursal_of_honorarium_fields",
        ownerField: "webmail_id",
    },
    {
        doctype: "Loan Request",
        getFieldsMethod: "rndopsapp.rndopsapp.doctype.loan_request.loan_request.get_loan_request_fields",
        ownerField: "loan_for_webmail_id",
    },
    {
        doctype: "Indent General Form",
        getFieldsMethod: "rndopsapp.rndopsapp.doctype.indent_general_form.indent_general_form.get_indent_general_form_fields",
        ownerField: "igf_webmail_id",
    },
    {
        doctype: "Indent Cum Sanction Sheet",
        getFieldsMethod: "rndopsapp.rndopsapp.doctype.indent_cum_sanction_sheet.indent_cum_sanction_sheet.get_icss_fields",
        ownerField: "icss_applicant_webmail_id",
    },
    {
        doctype: "Recruitment Adhoc Contractual",
        getFieldsMethod: "rndopsapp.rndopsapp.doctype.recruitment_adhoc_contractual.recruitment_adhoc_contractual.get_recruitment_adhoc_contractual_fields",
        ownerField: "webmail_id",
    },
];
