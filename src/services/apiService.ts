/**
 * API Service Layer for Dynamic Forms
 * Centralized API endpoints for all form operations
 */

const API_BASE = 'rndopsapp.rndopsapp.doctype';

// Rate Contract API endpoints
export const rateContractAPI = {
    getFields: `${API_BASE}.rate_contract.rate_contract.get_rate_contract_fields`,
    save: `${API_BASE}.rate_contract.rate_contract.save_rate_contract`,
    submit: `${API_BASE}.rate_contract.rate_contract.submit_rate_contract`,
    getWorkflowActions: `${API_BASE}.rate_contract.rate_contract.get_rate_contract_workflow_actions`,
    performAction: `${API_BASE}.rate_contract.rate_contract.perform_rate_contract_action`,
    getPrincipalSuppliersByItemType: `${API_BASE}.rate_contract.rate_contract.get_principal_suppliers_by_item_type`,
    getLocalSuppliersByPrincipal: `${API_BASE}.rate_contract.rate_contract.get_local_suppliers_by_principal`,
    getPrincipalSupplierDetails: `${API_BASE}.rate_contract.rate_contract.get_principal_supplier_details`,
    getLocalSupplierDetails: `${API_BASE}.rate_contract.rate_contract.get_local_supplier_details`,
    getVendorDetails: `${API_BASE}.rate_contract.rate_contract.get_vendor_details`,
    getFormTypeConfig: `${API_BASE}.rate_contract.rate_contract.get_form_type_config`,
    getVendorsByP4ItemType: `${API_BASE}.rate_contract.rate_contract.get_vendors_by_p4_item_type`,
};

export const annualMaintenanceContractAPI = {
    getFields: `${API_BASE}.amc.amc.get_amc_fields`,
    save: `${API_BASE}.amc.amc.save_amc_data`,
    getWorkflowActions: `${API_BASE}.amc.amc.get_amc_workflow_actions`,
    performAction: `${API_BASE}.amc.amc.perform_amc_action`,
};

// Travel API endpoints
export const travelAPI = {
    getFields: `${API_BASE}.travel.travel.get_travel_fields`,
    save: `${API_BASE}.travel.travel.save_travel`,
    submit: `${API_BASE}.travel.travel.submit_travel`,
    getWorkflowActions: `${API_BASE}.travel.travel.get_travel_workflow_actions`,
    performAction: `${API_BASE}.travel.travel.perform_travel_action`,
    getSclBalance: `${API_BASE}.travel.travel.get_special_leave_balance_for_travel`,
    attachDirectorPdf: `${API_BASE}.travel.travel.attach_director_pdf_travel`,
    getPendingDirectorUploads: `${API_BASE}.travel.travel.get_pending_director_uploads_travel`,
};

// TA DA Settlement API endpoints
export const tadaAPI = {
    getFields: `${API_BASE}.ta_da_settlement.ta_da_settlement.get_ta_da_settlement_fields`,
    save: `${API_BASE}.ta_da_settlement.ta_da_settlement.save_ta_da_settlement`,
    submit: `${API_BASE}.ta_da_settlement.ta_da_settlement.submit_ta_da_settlement`,
    getWorkflowActions: `${API_BASE}.ta_da_settlement.ta_da_settlement.get_ta_da_settlement_workflow_actions`,
    performAction: `${API_BASE}.ta_da_settlement.ta_da_settlement.perform_ta_da_settlement_action`,
    getCommitDetails: `${API_BASE}.ta_da_settlement.ta_da_settlement.get_ta_da_settlement_commit_details`,
};

// Project Staff Resignation API endpoints
export const resignationAPI = {
    getFields: `${API_BASE}.project_staff_resignation.project_staff_resignation.get_project_staff_resignation_fields`,
    save: `${API_BASE}.project_staff_resignation.project_staff_resignation.save_project_staff_resignation`,
    submit: `${API_BASE}.project_staff_resignation.project_staff_resignation.submit_project_staff_resignation`,
    getList: `${API_BASE}.project_staff_resignation.project_staff_resignation.get_project_staff_resignation_list`,
    getWorkflowActions: `${API_BASE}.project_staff_resignation.project_staff_resignation.get_project_staff_resignation_workflow_actions`,
    performAction: `${API_BASE}.project_staff_resignation.project_staff_resignation.perform_project_staff_resignation_action`,
};

// Project Staff Extension API endpoints
export const extensionAPI = {
    getFields: `${API_BASE}.project_staff_extension.project_staff_extension.get_project_staff_extension_fields`,
    save: `${API_BASE}.project_staff_extension.project_staff_extension.save_project_staff_extension`,
    submit: `${API_BASE}.project_staff_extension.project_staff_extension.submit_project_staff_extension`,
    getList: `${API_BASE}.project_staff_extension.project_staff_extension.get_project_staff_extension_list`,
    getWorkflowActions: `${API_BASE}.project_staff_extension.project_staff_extension.get_project_staff_extension_workflow_actions`,
    performAction: `${API_BASE}.project_staff_extension.project_staff_extension.perform_project_staff_extension_action`,
};

// Temporary Advance API endpoints
export const temporaryAdvanceAPI = {
    getFields: `${API_BASE}.temporary_advance.temporary_advance.get_temporary_advance_fields`,
    save: `${API_BASE}.temporary_advance.temporary_advance.save_temporary_advance`,
    submit: `${API_BASE}.temporary_advance.temporary_advance.submit_temporary_advance`,
    getWorkflowActions: `${API_BASE}.temporary_advance.temporary_advance.get_temporary_advance_workflow_actions`,
    performAction: `${API_BASE}.temporary_advance.temporary_advance.perform_temporary_advance_action`,
};

// Advance Settlement API endpoints
export const advanceSettlementAPI = {
    getFields: `${API_BASE}.advance_settlement.advance_settlement.get_advance_settlement_fields`,
    save: `${API_BASE}.advance_settlement.advance_settlement.save_advance_settlement`,
    submit: `${API_BASE}.advance_settlement.advance_settlement.submit_advance_settlement`,
    getWorkflowActions: `${API_BASE}.advance_settlement.advance_settlement.get_advance_settlement_workflow_actions`,
    performAction: `${API_BASE}.advance_settlement.advance_settlement.perform_advance_settlement_action`,
    getUserDetails: `${API_BASE}.advance_settlement.advance_settlement.get_user_details_advance_settlement`,
    submitCommit: `${API_BASE}.advance_settlement.advance_settlement.submit_advance_settlement_commit`,
    submitPayment: `${API_BASE}.advance_settlement.advance_settlement.submit_advance_settlement_payment`
};

// Direct Purchase API endpoints (Stage 1)
export const directPurchaseAPI = {
    getFields: `${API_BASE}.direct_purchase.direct_purchase.get_direct_purchase_fields`,
    save: `${API_BASE}.direct_purchase.direct_purchase.save_direct_purchase_data`,
    getWorkflowActions: `${API_BASE}.direct_purchase.direct_purchase.get_direct_purchase_workflow_actions`,
    performAction: `${API_BASE}.direct_purchase.direct_purchase.perform_direct_purchase_action`,
    getUserDetails: `${API_BASE}.direct_purchase.direct_purchase.get_user_details_direct_purchase`,
    generateP11Form: `${API_BASE}.direct_purchase.direct_purchase.generate_p11_form`,
    generateSanctionSheet: `${API_BASE}.direct_purchase.direct_purchase.generate_sanction_sheet`,
    generatePurchaseOrder: `${API_BASE}.direct_purchase.direct_purchase.generate_purchase_order`,
};

// Direct Purchase PO (dp_po) API endpoints — Stage 4
export const dpPoAPI = {
    getByDirectPurchase: `${API_BASE}.dp_po.dp_po.get_dp_po_by_direct_purchase`,
    generateFromSS:      `${API_BASE}.dp_po.dp_po.generate_dp_po_from_sanction_sheet`,
    save:                `${API_BASE}.dp_po.dp_po.save_dp_po_data`,
};

// P_11 Form API endpoints (Stage 2)
export const p11FormAPI = {
    getFields: `${API_BASE}.p_11_form.p_11_form.get_p_11_form_fields`,
    save: `${API_BASE}.p_11_form.p_11_form.save_p_11_form_data`,
    getWorkflowActions: `${API_BASE}.p_11_form.p_11_form.get_p_11_form_workflow_actions`,
    performAction: `${API_BASE}.p_11_form.p_11_form.perform_p_11_form_action`,
};

// Sanction Sheet API endpoints (Stage 3)
export const sanctionSheetAPI = {
    getFields: `${API_BASE}.sanction_sheet.sanction_sheet.get_sanction_sheet_fields`,
    save: `${API_BASE}.sanction_sheet.sanction_sheet.save_sanction_sheet_data`,
    getWorkflowActions: `${API_BASE}.sanction_sheet.sanction_sheet.get_sanction_sheet_workflow_actions`,
    performAction: `${API_BASE}.sanction_sheet.sanction_sheet.perform_sanction_sheet_action`,
};

// Recruitment Adhoc Contractual API endpoints
export const recruitmentAdhocContractualAPI = {
    getFields: `${API_BASE}.recruitment_adhoc_contractual.recruitment_adhoc_contractual.get_recruitment_adhoc_contractual_fields`,
    save: `${API_BASE}.recruitment_adhoc_contractual.recruitment_adhoc_contractual.save_recruitment_adhoc_contractual_data`,
    getWorkflowActions: `${API_BASE}.recruitment_adhoc_contractual.recruitment_adhoc_contractual.get_recruitment_adhoc_contractual_workflow_actions`,
    performAction: `${API_BASE}.recruitment_adhoc_contractual.recruitment_adhoc_contractual.perform_recruitment_adhoc_contractual_action`,
    submit: `${API_BASE}.recruitment_adhoc_contractual.recruitment_adhoc_contractual.submit_recruitment_adhoc_contractual`,
};

// Selection Committee Report API endpoints
export const selectionCommitteeReportAPI = {
    getFields: `${API_BASE}.selection_committee_report.selection_committee_report.get_selection_committee_report_fields`,
    save: `${API_BASE}.selection_committee_report.selection_committee_report.save_selection_committee_report_data`,
    submit: `${API_BASE}.selection_committee_report.selection_committee_report.submit_selection_committee_report`,
    getWorkflowActions: `${API_BASE}.selection_committee_report.selection_committee_report.get_selection_committee_report_workflow_actions`,
    performAction: `${API_BASE}.selection_committee_report.selection_committee_report.perform_selection_committee_report_action`,
    getByWebmail: `${API_BASE}.selection_committee_report.selection_committee_report.get_selection_committee_report_by_webmail`,
    updateSendToDirector: `${API_BASE}.selection_committee_report.selection_committee_report.update_send_to_director_scr`,
    getPendingDirectorUploads: `${API_BASE}.selection_committee_report.selection_committee_report.get_pending_director_uploads_scr`,
    attachDirectorPdf: `${API_BASE}.selection_committee_report.selection_committee_report.attach_director_pdf_scr`,
};

// Top Up Fellowship — Faculty Admission PDF flow (R&D Staff)
export const topUpFellowshipAPI = {
    getPendingFacultyAdmissionUploads: `${API_BASE}.top_up_fellowship.top_up_fellowship.get_pending_faculty_admission_uploads`,
    attachFacultyAdmissionPdf: `${API_BASE}.top_up_fellowship.top_up_fellowship.attach_faculty_admission_pdf`,
};

// Selection Candidate Details API endpoints
export const selectionCandidateDetailsAPI = {
    getByInterview: `${API_BASE}.selection_candidate_details.selection_candidate_details.get_selection_candidate_details_by_interview`,
    getByApplication: `${API_BASE}.selection_candidate_details.selection_candidate_details.get_selection_candidate_details_by_application`,
    updateAppointmentOrderNumber: `${API_BASE}.selection_candidate_details.selection_candidate_details.update_appointment_order_number`,
    updateMedicalReportNumber: `${API_BASE}.selection_candidate_details.selection_candidate_details.update_medical_report_number`,
    updateJoiningReportNumber: `${API_BASE}.selection_candidate_details.selection_candidate_details.update_joining_report_number`,
};

// Project Staff Details (Joining) API endpoints
export const projectStaffDetailsAPI = {
    getFields: `${API_BASE}.project_staff_details.project_staff_details.get_project_staff_details_fields`,
    save: `${API_BASE}.project_staff_details.project_staff_details.save_project_staff_details_data`,
    getList: `${API_BASE}.project_staff_details.project_staff_details.get_project_staff_details_list`,
    getByApplication: `${API_BASE}.project_staff_details.project_staff_details.get_joining_by_application`,
    delete: `${API_BASE}.project_staff_details.project_staff_details.delete_project_staff_details`,
    getNextEmpId: `${API_BASE}.project_staff_details.project_staff_details.get_next_emp_id`,
    submit: `${API_BASE}.project_staff_details.project_staff_details.submit_project_staff_details`,
    getWorkflowActions: `${API_BASE}.project_staff_details.project_staff_details.get_project_staff_details_workflow_actions`,
    performAction: `${API_BASE}.project_staff_details.project_staff_details.perform_project_staff_details_action`,
};

// Indent Cum Sanction Sheet API endpoints
export const icssAPI = {
    getIndentTypes: `${API_BASE}.indent_cum_sanction_sheet.indent_cum_sanction_sheet.get_icss_indent_types`,
    getFields: `${API_BASE}.indent_cum_sanction_sheet.indent_cum_sanction_sheet.get_icss_fields`,
    getChildFields: `${API_BASE}.indent_cum_sanction_sheet.indent_cum_sanction_sheet.get_icss_child_fields`,
    save: `${API_BASE}.indent_cum_sanction_sheet.indent_cum_sanction_sheet.save_icss_data`,
    saveComposite: `${API_BASE}.indent_cum_sanction_sheet.indent_cum_sanction_sheet.save_icss_composite_data`,
    savePOData: `${API_BASE}.indent_cum_sanction_sheet.indent_cum_sanction_sheet.save_icss_po_data`,
    saveICSSPOData: `${API_BASE}.icss_po.icss_po.save_icss_po_data`,
    getWorkflowActions: `${API_BASE}.indent_cum_sanction_sheet.indent_cum_sanction_sheet.get_icss_workflow_actions`,
    performAction: `${API_BASE}.indent_cum_sanction_sheet.indent_cum_sanction_sheet.perform_icss_action`,
    submit: `${API_BASE}.indent_cum_sanction_sheet.indent_cum_sanction_sheet.submit_icss`,
    getUserDetails: `${API_BASE}.indent_cum_sanction_sheet.indent_cum_sanction_sheet.get_user_details_icss`,
    updateSendToDirector: `${API_BASE}.indent_cum_sanction_sheet.indent_cum_sanction_sheet.update_send_to_director_icss`,
    attachDirectorPdf: `${API_BASE}.indent_cum_sanction_sheet.indent_cum_sanction_sheet.attach_director_pdf_icss`,
    getPendingDirectorUploads: `${API_BASE}.indent_cum_sanction_sheet.indent_cum_sanction_sheet.get_pending_director_uploads_icss`,
};

export const proprietaryPurchaseAPI = {
    getFields: `${API_BASE}.proprietary_purchase.proprietary_purchase.get_proprietary_purchase_fields`,
    save: `${API_BASE}.proprietary_purchase.proprietary_purchase.save_proprietary_purchase_data`,
    getWorkflowActions: `${API_BASE}.proprietary_purchase.proprietary_purchase.get_proprietary_purchase_workflow_actions`,
    performAction: `${API_BASE}.proprietary_purchase.proprietary_purchase.perform_proprietary_purchase_action`,
};

export const standardizedPurchaseAPI = {
    getFields: `${API_BASE}.standerdized_purchase.standerdized_purchase.get_standerdized_purchase_fields`,
    save: `${API_BASE}.standerdized_purchase.standerdized_purchase.save_standerdized_purchase_data`,
    getWorkflowActions: `${API_BASE}.standerdized_purchase.standerdized_purchase.get_standerdized_purchase_workflow_actions`,
    performAction: `${API_BASE}.standerdized_purchase.standerdized_purchase.perform_standerdized_purchase_action`,
};

export const repairReplacementAPI = {
    getFields: `${API_BASE}.repair_replacement.repair_replacement.get_repair_replacement_fields`,
    save: `${API_BASE}.repair_replacement.repair_replacement.save_repair_replacement_data`,
    getWorkflowActions: `${API_BASE}.repair_replacement.repair_replacement.get_repair_replacement_workflow_actions`,
    performAction: `${API_BASE}.repair_replacement.repair_replacement.perform_repair_replacement_action`,
};

// Universal Registration API endpoints
export const universalRegistrationAPI = {
    getFields: `${API_BASE}.universal_registration__.universal_registration__.get_universal_registration___fields`,
    save: `${API_BASE}.universal_registration__.universal_registration__.save_universal_registration___data`,
    checkDuplicates: `${API_BASE}.universal_registration__.universal_registration__.check_duplicate_registration`,
    checkEmailAvailability: `${API_BASE}.universal_registration__.universal_registration__.check_email_availability`,
};

// Disbursal of Consultancy API endpoints
export const disbursalOfConsultancyAPI = {
    getFields: `${API_BASE}.disbursal_of_consultancy.disbursal_of_consultancy.get_disbursal_of_consultancy_fields`,
    save: `${API_BASE}.disbursal_of_consultancy.disbursal_of_consultancy.save_disbursal_of_consultancy_data`,
    submit: `${API_BASE}.disbursal_of_consultancy.disbursal_of_consultancy.submit_disbursal_of_consultancy`,
    getWorkflowActions: `${API_BASE}.disbursal_of_consultancy.disbursal_of_consultancy.get_disbursal_of_consultancy_workflow_actions`,
    performAction: `${API_BASE}.disbursal_of_consultancy.disbursal_of_consultancy.perform_disbursal_of_consultancy_action`,
    getByProject: `${API_BASE}.disbursal_of_consultancy.disbursal_of_consultancy.get_disbursal_of_consultancy_by_project`,
    getByWebmail: `${API_BASE}.disbursal_of_consultancy.disbursal_of_consultancy.get_disbursal_of_consultancy_by_webmail`,
};

// Disbursal of Honorarium API endpoints
export const disbursalOfHonorariumAPI = {
    getFields: `${API_BASE}.disbursal_of_honorarium.disbursal_of_honorarium.get_disbursal_of_honorarium_fields`,
    save: `${API_BASE}.disbursal_of_honorarium.disbursal_of_honorarium.save_disbursal_of_honorarium_data`,
    submit: `${API_BASE}.disbursal_of_honorarium.disbursal_of_honorarium.submit_disbursal_of_honorarium`,
    getWorkflowActions: `${API_BASE}.disbursal_of_honorarium.disbursal_of_honorarium.get_disbursal_of_honorarium_workflow_actions`,
    performAction: `${API_BASE}.disbursal_of_honorarium.disbursal_of_honorarium.perform_disbursal_of_honorarium_action`,
    getByProject: `${API_BASE}.disbursal_of_honorarium.disbursal_of_honorarium.get_disbursal_of_honorarium_by_project`,
    getByWebmail: `${API_BASE}.disbursal_of_honorarium.disbursal_of_honorarium.get_disbursal_of_honorarium_by_webmail`,
};

// Universal User API endpoints
export const universalUserAPI = {
    getFields: `${API_BASE}.universal_user__.universal_user__.get_universal_user___fields`,
    save: `${API_BASE}.universal_user__.universal_user__.save_universal_user___data`,
};

// Indent General Form API endpoints
export const indentGeneralFormAPI = {
    getFields: `${API_BASE}.indent_general_form.indent_general_form.get_indent_general_form_fields`,
    save: `${API_BASE}.indent_general_form.indent_general_form.save_indent_general_form_data`,
    getWorkflowActions: `${API_BASE}.indent_general_form.indent_general_form.get_indent_general_form_workflow_actions`,
    performAction: `${API_BASE}.indent_general_form.indent_general_form.perform_indent_general_form_action`,
    updateSendToDirector: `${API_BASE}.indent_general_form.indent_general_form.update_send_to_director_igf`,
    attachDirectorPdf: `${API_BASE}.indent_general_form.indent_general_form.attach_director_pdf_igf`,
    getPendingDirectorUploads: `${API_BASE}.indent_general_form.indent_general_form.get_pending_director_uploads_igf`,
    getAvailableBackActions: `${API_BASE}.indent_general_form.indent_general_form.get_available_back_actions`,
    putBack: `${API_BASE}.indent_general_form.indent_general_form.put_back`,
};

// Loan Request API endpoints
export const loanRequestAPI = {
    getFields: `${API_BASE}.loan_request.loan_request.get_loan_request_fields`,
    save: `${API_BASE}.loan_request.loan_request.save_loan_request`,
    submit: `${API_BASE}.loan_request.loan_request.submit_loan_request`,
    getWorkflowActions: `${API_BASE}.loan_request.loan_request.get_loan_request_workflow_actions`,
    performAction: `${API_BASE}.loan_request.loan_request.perform_loan_request_action`,
};

// Loan Settlement API endpoints (settling a project loan out of an incoming Fund Received)
export const loanSettlementAPI = {
    getActiveLoansForProject: `${API_BASE}.loan_settlement.loan_settlement.get_active_loan_for_project`,
    saveRequests: `${API_BASE}.loan_settlement.loan_settlement.save_loan_settlement_requests`,
    discardRequests: `${API_BASE}.loan_settlement.loan_settlement.discard_loan_settlement_requests`,
    getDetails: `${API_BASE}.loan_settlement.loan_settlement.get_loan_settlement_details`,
    getForFundReceived: `${API_BASE}.loan_settlement.loan_settlement.get_loan_settlements_for_fund_received`,
    getWorkflowActions: `${API_BASE}.loan_settlement.loan_settlement.get_loan_settlement_workflow_actions`,
    performAction: `${API_BASE}.loan_settlement.loan_settlement.perform_loan_settlement_action`,
    retryPublish: `${API_BASE}.loan_settlement.loan_settlement.retry_publish_loan_settlement`,
};

// Miscellaneous Commit API endpoints
export const miscellaneousCommitAPI = {
    getFields: `${API_BASE}.miscellaneous_commit.miscellaneous_commit.get_miscellaneous_commit_fields`,
    save: `${API_BASE}.miscellaneous_commit.miscellaneous_commit.save_miscellaneous_commit`,
    submit: `${API_BASE}.miscellaneous_commit.miscellaneous_commit.submit_miscellaneous_commit`,
    getWorkflowActions: `${API_BASE}.miscellaneous_commit.miscellaneous_commit.get_miscellaneous_commit_workflow_actions`,
    performAction: `${API_BASE}.miscellaneous_commit.miscellaneous_commit.perform_miscellaneous_commit_action`,
};

// Common utility to get user details
export const commonAPI = {
    getUserDetails: `${API_BASE}.project_registration.project_registration.get_user_details_for_pi`,
    getUserDetailsByEmail: `rndopsapp.rndopsapp.api.get_user_details`,
    /** Combined User + Universal Registration profile lookup (supports `search` param for list, or `user`/`email` for single) */
    getUserRegistrationProfile: `rndopsapp.rndopsapp.api.get_user_registration_profile`,
    addComment: `rndopsapp.rndopsapp.api.add_project_comment`,
};

// Delegate User API endpoints
export const delegateUserAPI = {
    searchUsers: `rndopsapp.rndopsapp.api.search_delegate_users`,
    getScope: `rndopsapp.rndopsapp.api.get_delegate_scope`,
    getActiveDelegations: `rndopsapp.rndopsapp.api.get_active_delegations`,
    delegate: `rndopsapp.rndopsapp.api.delegate_user`,
    undelegate: `rndopsapp.rndopsapp.api.undelegate_user`,
    removeItem: `rndopsapp.rndopsapp.api.remove_delegated_item`,
};

// Helper to convert file to base64.
// IMPORTANT: returns pure base64 (no `data:<mime>;base64,` prefix). Frappe's
// `save_file(decode=True)` does base64.b64decode() which silently skips
// non-alphabet characters in the prefix; leaving the prefix on shifts byte
// alignment of the real payload and corrupts the decoded file, which then
// surfaces server-side as "FileNotFoundError: ... /private/files/...".
export const fileToBase64 = (file: File): Promise<{ file_name: string; file_data: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const commaIdx = result.indexOf(",");
            const pureBase64 = commaIdx >= 0 ? result.slice(commaIdx + 1) : result;
            resolve({ file_name: file.name, file_data: pureBase64 });
        };
        reader.onerror = (error) => reject(error);
    });
};

// Candidate APIs (External Node Server)
// In dev, calls are routed through the Vite proxy at /candidate-api (see proxyOptions.ts)
// so that binary document downloads (which the external API does not send CORS headers for)
// can be fetched same-origin instead of being blocked by the browser.
export const CANDIDATE_API_BASE_URL = import.meta.env.VITE_CANDIDATE_API_URL || "/candidate-api";

export const candidateAPI = {
    getApplications: (refNum: string) => `${CANDIDATE_API_BASE_URL}/api/applications?refNumParent=${encodeURIComponent(refNum)}`,
    reviewApplication: (applicationId: number | string) => `${CANDIDATE_API_BASE_URL}/api/applications/${applicationId}/review`,
    getProfile: (candidateId: number | string) => `${CANDIDATE_API_BASE_URL}/api/candidates/${candidateId}/profile`,
    getDocument: (docId: number | string) => `${CANDIDATE_API_BASE_URL}/api/documents/${docId}`,
    viewDocument: (docId: number | string) => `${CANDIDATE_API_BASE_URL}/api/documents/${docId}/view`,
    getPost: (postId: number | string) => `${CANDIDATE_API_BASE_URL}/api/recruitment-posts/${postId}`,
};

// Leave Module API endpoints
export const leaveModuleAPI = {
    getFields: `${API_BASE}.leave_module.leave_module.get_leave_module_fields`,
    save: `${API_BASE}.leave_module.leave_module.save_leave_module_data`,
    submit: `${API_BASE}.leave_module.leave_module.submit_leave_module`,
    getWorkflowActions: `${API_BASE}.leave_module.leave_module.get_leave_module_workflow_actions`,
    performAction: `${API_BASE}.leave_module.leave_module.perform_leave_module_action`,
    getMyLeaves: `${API_BASE}.leave_module.leave_module.get_my_leaves`,
    getPendingApprovals: `${API_BASE}.leave_module.leave_module.get_pending_approvals`,
    getDetail: `${API_BASE}.leave_module.leave_module.get_leave_detail`,
    getLeaveBalance: `${API_BASE}.leave_module.leave_module.get_leave_balance`,
};

// Helper to prepare form data with file conversions for API submission
export const prepareFormDataForApi = async (formData: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const data = JSON.parse(JSON.stringify(formData)) as Record<string, unknown>;

    for (const key in formData) {
        const value = formData[key];

        if (value instanceof File) {
            data[key] = await fileToBase64(value);
        } else if (Array.isArray(value)) {
            for (let i = 0; i < value.length; i++) {
                const row = value[i];
                const dataRows = data[key];
                if (!row || typeof row !== 'object' || !Array.isArray(dataRows)) continue;
                for (const rowKey in row) {
                    const rowValue = (row as Record<string, unknown>)[rowKey];
                    if (rowValue instanceof File) {
                        (dataRows[i] as Record<string, unknown>)[rowKey] = await fileToBase64(rowValue);
                    }
                }
            }
        }
    }

    return data;
};
