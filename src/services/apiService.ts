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
    getPrincipalSuppliersByItemType: `${API_BASE}.rate_contract.rate_contract.get_principal_suppliers_by_item_type`,
    getLocalSuppliersByPrincipal: `${API_BASE}.rate_contract.rate_contract.get_local_suppliers_by_principal`,
    getPrincipalSupplierDetails: `${API_BASE}.rate_contract.rate_contract.get_principal_supplier_details`,
    getLocalSupplierDetails: `${API_BASE}.rate_contract.rate_contract.get_local_supplier_details`,
    getVendorDetails: `${API_BASE}.rate_contract.rate_contract.get_vendor_details`,
    getFormTypeConfig: `${API_BASE}.rate_contract.rate_contract.get_form_type_config`,
    getVendorsByP4ItemType: `${API_BASE}.rate_contract.rate_contract.get_vendors_by_p4_item_type`,
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

// Direct Purchase API endpoints
export const directPurchaseAPI = {
    getFields: `${API_BASE}.direct_purchase.direct_purchase.get_direct_purchase_fields`,
    save: `${API_BASE}.direct_purchase.direct_purchase.save_direct_purchase_data`,
    getWorkflowActions: `${API_BASE}.direct_purchase.direct_purchase.get_direct_purchase_workflow_actions`,
    performAction: `${API_BASE}.direct_purchase.direct_purchase.perform_direct_purchase_action`,
    submit: `${API_BASE}.direct_purchase.direct_purchase.submit_direct_purchase`,
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
