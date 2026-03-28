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
    getFields: `${API_BASE}.annual_maintenance_contract.annual_maintenance_contract.get_annual_maintenance_contract_fields`,
    save: `${API_BASE}.annual_maintenance_contract.annual_maintenance_contract.save_annual_maintenance_contract_data`,
    getWorkflowActions: `${API_BASE}.annual_maintenance_contract.annual_maintenance_contract.get_annual_maintenance_contract_workflow_actions`,
    performAction: `${API_BASE}.annual_maintenance_contract.annual_maintenance_contract.perform_annual_maintenance_contract_action`,
};

// Travel API endpoints
export const travelAPI = {
    getFields: `${API_BASE}.travel.travel.get_travel_fields`,
    save: `${API_BASE}.travel.travel.save_travel`,
    submit: `${API_BASE}.travel.travel.submit_travel`,
    getWorkflowActions: `${API_BASE}.travel.travel.get_travel_workflow_actions`,
    performAction: `${API_BASE}.travel.travel.perform_travel_action`,
};

// TA DA Settlement API endpoints
export const tadaAPI = {
    getFields: `${API_BASE}.ta_da_settlement.ta_da_settlement.get_ta_da_settlement_fields`,
    save: `${API_BASE}.ta_da_settlement.ta_da_settlement.save_ta_da_settlement`,
    submit: `${API_BASE}.ta_da_settlement.ta_da_settlement.submit_ta_da_settlement`,
    getWorkflowActions: `${API_BASE}.ta_da_settlement.ta_da_settlement.get_ta_da_settlement_workflow_actions`,
    performAction: `${API_BASE}.ta_da_settlement.ta_da_settlement.perform_ta_da_settlement_action`,
};

// Project Staff Resignation API endpoints
export const resignationAPI = {
    getFields: `${API_BASE}.project_staff_resignation.project_staff_resignation.get_project_staff_resignation_fields`,
    save: `${API_BASE}.project_staff_resignation.project_staff_resignation.save_project_staff_resignation`,
    submit: `${API_BASE}.project_staff_resignation.project_staff_resignation.submit_project_staff_resignation`,
    getList: `${API_BASE}.project_staff_resignation.project_staff_resignation.get_project_staff_resignation_list`,
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

// Indent Cum Sanction Sheet API endpoints
export const icssAPI = {
    getIndentTypes: `${API_BASE}.indent_cum_sanction_sheet.indent_cum_sanction_sheet.get_icss_indent_types`,
    getFields: `${API_BASE}.indent_cum_sanction_sheet.indent_cum_sanction_sheet.get_icss_fields`,
    save: `${API_BASE}.indent_cum_sanction_sheet.indent_cum_sanction_sheet.save_icss_data`,
    getWorkflowActions: `${API_BASE}.indent_cum_sanction_sheet.indent_cum_sanction_sheet.get_icss_workflow_actions`,
    performAction: `${API_BASE}.indent_cum_sanction_sheet.indent_cum_sanction_sheet.perform_icss_action`,
    submit: `${API_BASE}.indent_cum_sanction_sheet.indent_cum_sanction_sheet.submit_icss`,
    getUserDetails: `${API_BASE}.indent_cum_sanction_sheet.indent_cum_sanction_sheet.get_user_details_icss`,
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

// Common utility to get user details
export const commonAPI = {
    getUserDetails: `${API_BASE}.project_registration.project_registration.get_user_details_for_pi`,
    getUserDetailsByEmail: `rndopsapp.rndopsapp.api.get_user_details`,
};

// Helper to convert file to base64
export const fileToBase64 = (file: File): Promise<{ file_name: string; file_data: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve({ file_name: file.name, file_data: reader.result as string });
        reader.onerror = (error) => reject(error);
    });
};

// Helper to prepare form data with file conversions for API submission
export const prepareFormDataForApi = async (formData: Record<string, any>): Promise<Record<string, any>> => {
    const data = JSON.parse(JSON.stringify(formData));

    for (const key in formData) {
        const value = formData[key];

        if (value instanceof File) {
            data[key] = await fileToBase64(value);
        } else if (Array.isArray(value)) {
            for (let i = 0; i < value.length; i++) {
                for (const rowKey in value[i]) {
                    if (value[i][rowKey] instanceof File) {
                        data[key][i][rowKey] = await fileToBase64(value[i][rowKey]);
                    }
                }
            }
        }
    }

    return data;
};
