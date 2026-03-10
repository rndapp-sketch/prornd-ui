/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { useFrappePostCall, useFrappeAuth } from "frappe-react-sdk";
import {
    DynamicFormRenderer,
    type FormField,
} from "@/components/forms/DynamicFormRenderer";
import {
    icssAPI,
    proprietaryPurchaseAPI,
    standardizedPurchaseAPI,
    repairReplacementAPI,
    prepareFormDataForApi,
} from "@/services/apiService";
import { Loader2, ArrowLeft, Save, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// --- CLAUDE UI WRAPPERS ---
const FrappeCard = ({ children, className }: any) => (
    <Card
        className={cn(
            "border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#27272A] shadow-sm rounded-xl overflow-hidden",
            className,
        )}
    >
        <CardContent className="p-0">{children}</CardContent>
    </Card>
);

const FrappeButton = ({
    children,
    className,
    variant = "primary",
    ...props
}: any) => (
    <Button
        variant={
            variant === "primary"
                ? "default"
                : variant === "ghost"
                    ? "ghost"
                    : "outline"
        }
        className={cn(className)}
        {...props}
    >
        {children}
    </Button>
);



const IndentCumSanctionSheetForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const editDocName = id || searchParams.get("edit");
    const projectParam = searchParams.get("project");
    const projectNoParam = searchParams.get("projectNo");
    const { currentUser } = useFrappeAuth();

    // Core States
    const [baseFields, setBaseFields] = useState<FormField[]>([]);
    const [subFormFields, setSubFormFields] = useState<FormField[]>([]);
    const fields = React.useMemo(() => [...baseFields, ...subFormFields], [baseFields, subFormFields]);
    const [computationRules, setComputationRules] = useState<any>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [linkOptions, setLinkOptions] = useState<Record<string, any[]>>({});
    const [isLoadingFields, setIsLoadingFields] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [savedDocName, setSavedDocName] = useState<string | null>(
        editDocName || null,
    );

    // Indent Type State
    const [selectedIndentType, setSelectedIndentType] = useState<string>("");

    // Workflow States
    const [workflowState, setWorkflowState] = useState<string>("Draft");
    const [availableActions, setAvailableActions] = useState<string[]>([]);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [docStatus, setDocStatus] = useState<number>(0);

    // API Hooks
    const { call: getFieldsCall } = useFrappePostCall(icssAPI.getFields);

    // Sub-form get fields hooks
    const { call: getProprietaryFields } = useFrappePostCall(proprietaryPurchaseAPI.getFields);
    const { call: getStandardizedFields } = useFrappePostCall(standardizedPurchaseAPI.getFields);
    const { call: getRepairFields } = useFrappePostCall(repairReplacementAPI.getFields);

    // Save hooks
    const { call: saveGenericCall } = useFrappePostCall(icssAPI.save);
    const { call: saveProprietaryCall } = useFrappePostCall(proprietaryPurchaseAPI.save);
    const { call: saveStandardizedCall } = useFrappePostCall(standardizedPurchaseAPI.save);
    const { call: saveRepairCall } = useFrappePostCall(repairReplacementAPI.save);

    const { call: getActionsCall } = useFrappePostCall(icssAPI.getWorkflowActions);
    const { call: getProprietaryActions } = useFrappePostCall(proprietaryPurchaseAPI.getWorkflowActions);
    const { call: getStandardizedActions } = useFrappePostCall(standardizedPurchaseAPI.getWorkflowActions);
    const { call: getRepairActions } = useFrappePostCall(repairReplacementAPI.getWorkflowActions);

    const { call: performActionCall } = useFrappePostCall(icssAPI.performAction);
    const { call: performProprietaryAction } = useFrappePostCall(proprietaryPurchaseAPI.performAction);
    const { call: performStandardizedAction } = useFrappePostCall(standardizedPurchaseAPI.performAction);
    const { call: performRepairAction } = useFrappePostCall(repairReplacementAPI.performAction);

    const { call: getICSSUserDetails } = useFrappePostCall<{ message: any }>(icssAPI.getUserDetails);
    const { call: fetchFrappeValue } = useFrappePostCall<{ message: any }>(
        "frappe.client.get_value",
    );

    // --- LEGACY UTILS ---
    const numberInWords = useCallback((number: number): string => {
        if (number < 0 || number > 999999999999) return "!!!";
        let num = number;
        const Gn = Math.floor(num / 10000000); /* Crore */
        num -= Gn * 10000000;
        const kn = Math.floor(num / 100000); /* lakhs */
        num -= kn * 100000;
        const Hn = Math.floor(num / 1000); /* thousand */
        num -= Hn * 1000;
        const Dn = Math.floor(num / 100); num = num % 100; /* Tens */
        const tn = Math.floor(num / 10);
        const one = Math.floor(num % 10);

        let res = "";
        if (Gn > 0) res += (numberInWords(Gn) + " Crore");
        if (kn > 0) res += (((res === "") ? "" : " ") + numberInWords(kn) + " Lakh");
        if (Hn > 0) res += (((res === "") ? "" : " ") + numberInWords(Hn) + " Thousand");
        if (Dn > 0) res += (((res === "") ? "" : " ") + numberInWords(Dn) + " Hundred");

        const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
            "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
        const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

        if (tn > 0 || one > 0) {
            if (res !== "") res += " and ";
            if (tn < 2) {
                res += ones[tn * 10 + one];
            } else {
                res += tens[tn];
                if (one > 0) res += ("-" + ones[one]);
            }
        }
        if (res === "") res = "Zero";
        return res;
    }, []);

    const convertAmountToWords = useCallback((numStr: string | number): string => {
        const num = parseFloat(String(numStr));
        if (isNaN(num)) return "";
        const integerPart = Math.floor(num);
        let decimalPartStr = String(num.toFixed(2)).split(".")[1] || "00";
        let words = "Rupees " + numberInWords(integerPart) + " Only";
        if (decimalPartStr !== "00") {
            const digits = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
            const p1 = digits[parseInt(decimalPartStr.charAt(0))];
            const p2 = digits[parseInt(decimalPartStr.charAt(1))];
            words = "Rupees " + numberInWords(integerPart) + " Point " + p1 + " " + p2 + " Paisa Only";
        }
        return words;
    }, [numberInWords]);

    // --- COMPUTATION ENGINE ---
    const applyComputations = useCallback((data: any) => {
        if (!computationRules) return data;
        let newData = { ...data };

        try {
            // 1. apply row_calculations (e.g., amount = qty * rate)
            if (computationRules.row_calculations && Array.isArray(computationRules.row_calculations)) {
                computationRules.row_calculations.forEach((rule: any) => {
                    if (rule.table && newData[rule.table]) {
                        newData[rule.table] = newData[rule.table].map((row: any) => {
                            let formula = rule.formula;
                            Object.keys(row).forEach(k => {
                                const val = row[k] !== undefined && row[k] !== null && row[k] !== "" ? row[k] : 0;
                                formula = formula.replace(new RegExp(`\\b${k}\\b`, 'g'), val);
                            });
                            try {
                                const result = new Function(`return ${formula}`)();
                                return { ...row, [rule.target]: isNaN(result) ? 0 : result };
                            } catch (e) { return row; }
                        });
                    }
                });
            }

            // 2. apply aggregations (e.g., basic_value = sum(amount))
            if (computationRules.aggregations && Array.isArray(computationRules.aggregations)) {
                computationRules.aggregations.forEach((rule: any) => {
                    if (rule.table && newData[rule.table]) {
                        if (rule.type === "sum") {
                            const sum = newData[rule.table].reduce((acc: number, row: any) => acc + (parseFloat(row[rule.field]) || 0), 0);
                            newData[rule.target] = sum;
                        }
                    }
                });
            }

            // 3. apply computed_fields (e.g., grand_total = basic_value + (basic_value * gst / 100))
            if (computationRules.computed_fields && Array.isArray(computationRules.computed_fields)) {
                computationRules.computed_fields.forEach((rule: any) => {
                    let formula = rule.formula;
                    Object.keys(newData).forEach(k => {
                        if (typeof newData[k] !== 'object') {
                            const val = newData[k] !== undefined && newData[k] !== null && newData[k] !== "" ? newData[k] : 0;
                            formula = formula.replace(new RegExp(`\\b${k}\\b`, 'g'), val);
                        }
                    });
                    try {
                        const result = new Function(`return ${formula}`)();
                        newData[rule.target] = isNaN(result) ? 0 : result;
                    } catch (e) { }
                });
            }

            // 4. Legacy Word Conversions
            const finalTotal = newData.grand_total || newData.total_estimate;
            if (finalTotal !== undefined && finalTotal !== null && !isNaN(finalTotal)) {
                const inWords = convertAmountToWords(finalTotal);
                if ('amount_in_words' in newData || fields.find(f => f.fieldname === 'amount_in_words')) newData.amount_in_words = inWords;
                if ('grand_total_in_words' in newData || fields.find(f => f.fieldname === 'grand_total_in_words')) newData.grand_total_in_words = inWords;
                if ('total_estimate_in_words' in newData || fields.find(f => f.fieldname === 'total_estimate_in_words')) newData.total_estimate_in_words = inWords;
            }
        } catch (e) {
            console.error("Computation engine error:", e);
        }
        return newData;
    }, [computationRules]);


    // --- Determine the correct save API based on indent type ---
    const getSaveCall = useCallback(() => {
        switch (selectedIndentType) {
            case "Proprietary Purchase with Proprietary certificate from the OEM":
                return saveProprietaryCall;
            case "Standerdised/ Emergent Purchase":
                return saveStandardizedCall;
            case "Repair/ Repleacement":
                return saveRepairCall;
            default:
                return saveGenericCall;
        }
    }, [selectedIndentType, saveProprietaryCall, saveStandardizedCall, saveRepairCall, saveGenericCall]);

    const getWorkflowActionsCall = useCallback(() => {
        switch (selectedIndentType) {
            case "Proprietary Purchase with Proprietary certificate from the OEM":
                return getProprietaryActions;
            case "Standerdised/ Emergent Purchase":
                return getStandardizedActions;
            case "Repair/ Repleacement":
                return getRepairActions;
            default:
                return getActionsCall;
        }
    }, [selectedIndentType, getProprietaryActions, getStandardizedActions, getRepairActions, getActionsCall]);

    const getPerformActionCall = useCallback(() => {
        switch (selectedIndentType) {
            case "Proprietary Purchase with Proprietary certificate from the OEM":
                return performProprietaryAction;
            case "Standerdised/ Emergent Purchase":
                return performStandardizedAction;
            case "Repair/ Repleacement":
                return performRepairAction;
            default:
                return performActionCall;
        }
    }, [selectedIndentType, performProprietaryAction, performStandardizedAction, performRepairAction, performActionCall]);

    // --- DATA FETCHING ---
    const fetchFormConfiguration = useCallback(async () => {
        setIsLoadingFields(true);
        try {
            const currentDocName = editDocName || savedDocName;
            console.log(
                "Fetching ICSS config for:",
                currentDocName ? `Doc: ${currentDocName}` : "New Document",
            );

            const response = await getFieldsCall({ doc_name: currentDocName });
            if (response && response.message) {
                const {
                    fields: fetchedFields,
                    prefill_data,
                    link_options,
                } = response.message;
                console.log("Fetched ICSS Fields:", fetchedFields?.length);

                const HIDDEN_FIELDS = [
                    "amended_from",
                    "section_break_e3vp",
                    "column_break_mlei",
                    "workflow_state",
                ];
                const filteredFields = (fetchedFields || []).filter(
                    (f: any) => !HIDDEN_FIELDS.includes(f.fieldname),
                );

                setBaseFields(filteredFields);
                setLinkOptions(link_options || {});
                if (response.message.computation_rules) {
                    setComputationRules(response.message.computation_rules);
                }

                // Initialize Form Data
                if (currentDocName && prefill_data) {
                    setFormData(prefill_data);
                    setWorkflowState(prefill_data.workflow_state || "Draft");
                    setDocStatus(prefill_data.docstatus || 0);
                    if (prefill_data.icss_indent_type) {
                        setSelectedIndentType(prefill_data.icss_indent_type);
                    }
                } else if (!currentDocName) {
                    const initialData: Record<string, any> = { ...prefill_data };

                    // Auto-set current user
                    if (currentUser && !initialData.webmail_id) {
                        initialData.webmail_id = currentUser;
                    }

                    // Fetch piheadmentor_user_id for head field
                    if (
                        initialData.webmail_id &&
                        !["Administrator", "Guest"].includes(initialData.webmail_id)
                    ) {
                        try {
                            const headRes = await fetchFrappeValue({
                                doctype: "User",
                                filters: { name: initialData.webmail_id },
                                fieldname: "piheadmentor_user_id",
                            });
                            if (headRes?.message?.piheadmentor_user_id) {
                                initialData.head = headRes.message.piheadmentor_user_id;
                            }
                        } catch (e) {
                            console.error("Failed to fetch head (piheadmentor_user_id)", e);
                        }
                    }

                    // Prefill project from URL
                    const projectCode = projectParam || projectNoParam;
                    if (projectCode && !initialData.project_code) {
                        initialData.project_code = projectCode;

                        try {
                            const projectRes = await fetchFrappeValue({
                                doctype: "Project Registration",
                                filters: { project_no: projectCode },
                                fieldname: ["implementation_department", "project_title"],
                            });
                            if (projectRes?.message) {
                                if (projectRes.message.implementation_department && !initialData.department) {
                                    initialData.department = projectRes.message.implementation_department;
                                }
                                if (projectRes.message.project_title && !initialData.project_title) {
                                    initialData.project_title = projectRes.message.project_title;
                                }
                            }
                        } catch (e) {
                            console.error("Failed to fetch project details:", e);
                        }
                    }

                    setFormData(initialData);
                    setWorkflowState("Draft");
                    setDocStatus(0);
                }
            }
        } catch (error) {
            console.error("Error fetching ICSS form details:", error);
            alert("Failed to load form schema");
        } finally {
            setIsLoadingFields(false);
        }
    }, [
        editDocName,
        savedDocName,
        getFieldsCall,
        currentUser,
        getICSSUserDetails,
        fetchFrappeValue,
        projectParam,
        projectNoParam,
    ]);

    // --- FETCH SUB-FORM CONFIGURATION ---
    const fetchSubFormConfiguration = useCallback(async (indentType: string) => {
        if (!indentType || indentType === "Annual Maintenance Contract" || indentType === "Rate Contract Purchase") {
            setSubFormFields([]);
            return;
        }

        try {
            let callToMake = null;
            if (indentType === "Proprietary Purchase with Proprietary certificate from the OEM") {
                callToMake = getProprietaryFields;
            } else if (indentType === "Standerdised/ Emergent Purchase") {
                callToMake = getStandardizedFields;
            } else if (indentType === "Repair/ Repleacement") {
                callToMake = getRepairFields;
            }

            if (callToMake) {
                const response = await callToMake({ doc_name: editDocName || savedDocName || "" });
                if (response && response.message) {
                    const { fields: sfFields, link_options: sfLinks, computation_rules: sfRules } = response.message;
                    if (sfFields) setSubFormFields(sfFields);
                    if (sfLinks) setLinkOptions(prev => ({ ...prev, ...sfLinks }));
                    if (sfRules) {
                        setComputationRules((prev: any) => {
                            if (!prev) return sfRules;
                            // Merge computation rules arrays
                            return {
                                row_calculations: [...(prev.row_calculations || []), ...(sfRules.row_calculations || [])],
                                aggregations: [...(prev.aggregations || []), ...(sfRules.aggregations || [])],
                                computed_fields: [...(prev.computed_fields || []), ...(sfRules.computed_fields || [])]
                            };
                        });
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching sub-form fields:", error);
        }
    }, [editDocName, savedDocName]); // Excluded useFrappePostCall functions to prevent infinite loops

    // Handle initial indent type fetch map
    useEffect(() => {
        let mounted = true;
        if (selectedIndentType) {
            fetchSubFormConfiguration(selectedIndentType).then(() => {
                if (!mounted) return;
            }).catch((err) => {
                console.error("Subform fetch failed", err);
            });
        }
        return () => { mounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedIndentType]);

    const fetchWorkflowActions = useCallback(
        async (docName: string) => {
            try {
                const call = getWorkflowActionsCall();
                const response = await call({ docname: docName });
                if (response && response.message) {
                    setAvailableActions(response.message);
                }
            } catch (error) {
                console.error("Failed to fetch workflow actions:", error);
                setAvailableActions([]);
            }
        },
        [getWorkflowActionsCall],
    );

    // Initial load
    useEffect(() => {
        fetchFormConfiguration();
    }, [fetchFormConfiguration]);

    // Fetch actions if document exists
    useEffect(() => {
        const docNameToUse = editDocName || savedDocName;
        if (docNameToUse) {
            fetchWorkflowActions(docNameToUse);
        }
    }, [editDocName, savedDocName, fetchWorkflowActions]);

    // --- FORM HANDLERS ---
    const handleFieldChange = useCallback((fieldname: string, value: any) => {
        setFormData((prev) => {
            const next = { ...prev, [fieldname]: value };
            return applyComputations(next);
        });

        // Track indent type changes
        if (fieldname === "icss_indent_type") {
            setSelectedIndentType(value || "");
        }
    }, [applyComputations]);

    const handleFieldChangeWithSideEffects = useCallback(
        async (fieldname: string, value: any) => {
            handleFieldChange(fieldname, value);

            if (fieldname === "applicant_webmail_id" || fieldname === "applying_for_mail" || fieldname === "webmail_id") {
                if (value && !["Administrator", "Guest"].includes(value)) {
                    try {
                        const res = await getICSSUserDetails({ user_email: value });
                        if (res && res.message) {
                            setFormData((prev) => applyComputations({
                                ...prev,
                                applicant_name: res.message.applicant_name || prev.applicant_name,
                                department: res.message.department || prev.department,
                                designation: res.message.designation || prev.designation,
                            }));
                        }
                    } catch (e) {
                        console.error("Failed to fetch user details", e);
                    }
                }
            }
        },
        [handleFieldChange, getICSSUserDetails, applyComputations],
    );

    const handleFileChange = useCallback(
        (fieldname: string, file: File | null) => {
            setFormData((prev) => ({ ...prev, [fieldname]: file }));
        },
        [],
    );

    const handleTableRowChange = useCallback(
        (tableName: string, rowIndex: number, fieldname: string, value: any) => {
            setFormData((prev) => {
                const tableData = [...(prev[tableName] || [])];
                if (tableData[rowIndex]) {
                    tableData[rowIndex] = { ...tableData[rowIndex], [fieldname]: value };
                }
                const next = { ...prev, [tableName]: tableData };
                return applyComputations(next);
            });
        },
        [applyComputations],
    );

    const handleTableFileChange = useCallback(
        (
            tableName: string,
            rowIndex: number,
            fieldname: string,
            file: File | null,
        ) => {
            setFormData((prev) => {
                const tableData = [...(prev[tableName] || [])];
                if (tableData[rowIndex]) {
                    tableData[rowIndex] = { ...tableData[rowIndex], [fieldname]: file };
                }
                return { ...prev, [tableName]: tableData };
            });
        },
        [],
    );

    const handleAddTableRow = useCallback(
        (tableName: string, newRow: Record<string, any>) => {
            setFormData((prev) => ({
                ...prev,
                [tableName]: [...(prev[tableName] || []), newRow],
            }));
        },
        [],
    );

    const handleDeleteTableRow = useCallback(
        (tableName: string, rowIndex: number) => {
            setFormData((prev) => ({
                ...prev,
                [tableName]: (prev[tableName] || []).filter(
                    (_: any, idx: number) => idx !== rowIndex,
                ),
            }));
        },
        [],
    );

    // --- PRE-SAVE VALIDATIONS (LEGACY) ---
    const runLegacyValidations = (data: any) => {
        // 1. Limited Tender limits
        const theTenderType = data.tender_type || data.type_of_tender || "";
        if (theTenderType.toString().toLowerCase() === "limited") {
            const estimate = data.total_estimate || data.grand_total || 0;
            if (estimate > 2500000) {
                alert("Validation Failed: Estimate for Limited Tender cannot be greater than 25 Lakhs.");
                return false;
            }
        }
        // 2. Direct Purchase limits
        const itemType = data.item_type || data.icss_indent_type || "";
        if (itemType.toString().toLowerCase().includes("direct") && itemType.toString().toLowerCase().includes("purchase")) {
            const total = data.grand_total || data.direct_pur_grand_total || data.total_estimate || 0;
            if (total > 250000) {
                // Not returning false here as old logic commented it out, just an alert warning
                // alert("Warning: Direct Purchase Indent amount typically should not exceed 2.5 Lakhs.");
            }
        }
        // 3. Unique Purchase Committee Members
        if (data.purchase_committee && Array.isArray(data.purchase_committee)) {
            const emails = data.purchase_committee.map((row: any) => (row.webmail_id || row.webmail_id_pur_comm || "").trim().toLowerCase()).filter(Boolean);
            const uniqueEmails = new Set(emails);
            if (uniqueEmails.size < emails.length) {
                alert("Validation Failed: Repeated person(s) found in the purchase committee table. Members must be unique.");
                return false;
            }
        }
        return true;
    };

    // --- ACTIONS ---
    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!runLegacyValidations(formData)) return;

        setIsSubmitting(true);
        try {
            // Apply project context for routing logic
            const currentProjectNo = formData.project_code || projectNoParam || projectParam || formData.project_no;
            const currentProjectRef = formData.project_ref || searchParams.get("project_ref");

            const preparedData = await prepareFormDataForApi({
                ...formData,
                icss_indent_type: selectedIndentType,
                name: savedDocName || editDocName,
                project_no: currentProjectNo,
                project_ref: currentProjectRef,
            });

            console.log("Saving ICSS Payload:", preparedData);
            const saveCall = getSaveCall();
            const response = await saveCall({ data: preparedData });

            if (response && response.message?.status === "success") {
                const newDocName = response.message.docname;
                alert("Draft saved successfully");

                if (!savedDocName && !editDocName) {
                    setSavedDocName(newDocName);
                    navigate(`/indent-cum-sanction-sheet/${newDocName}`, {
                        replace: true,
                    });
                }

                fetchFormConfiguration();
            } else {
                alert(response.message?.message || "Failed to save draft");
            }
        } catch (error: any) {
            console.error("Save error:", error);
            const errMsg =
                error.exc_type === "ValidationError"
                    ? JSON.parse(error._server_messages || "[]")
                        .map((m: string) => JSON.parse(m).message)
                        .join(", ")
                    : "An error occurred while saving";
            alert(errMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleWorkflowAction = async (action: string) => {
        const docNameToUse = savedDocName || editDocName;
        if (!docNameToUse) {
            alert("Please save the document first.");
            return;
        }

        if (!runLegacyValidations(formData)) return;

        setIsActionLoading(true);
        try {
            let preparedData;
            if (workflowState === "Draft" || action === "Submit") {
                const currentProjectNo = formData.project_code || projectNoParam || projectParam || formData.project_no;
                const currentProjectRef = formData.project_ref || searchParams.get("project_ref");

                preparedData = await prepareFormDataForApi({
                    ...formData,
                    icss_indent_type: selectedIndentType,
                    name: docNameToUse,
                    project_no: currentProjectNo,
                    project_ref: currentProjectRef,
                });
            }

            const performCall = getPerformActionCall();
            const response = await performCall({
                docname: docNameToUse,
                action: action,
                updated_data: preparedData,
            });

            if (
                response &&
                response.message &&
                response.message.status === "success"
            ) {
                alert(`Action "${action}" completed successfully`);
                setWorkflowState(response.message.workflow_state);
                fetchFormConfiguration();
                fetchWorkflowActions(docNameToUse);
            } else {
                alert(
                    response.message?.message || `Failed to perform action ${action}`,
                );
            }
        } catch (error: any) {
            console.error(`Workflow Action ${action} Error:`, error);
            alert(`An error occurred while performing action: ${action}`);
        } finally {
            setIsActionLoading(false);
        }
    };

    // --- RENDER HELPERS ---
    const isReadOnly = docStatus === 1 || (workflowState !== "Draft" && workflowState !== "Pending");
    const isSubmitted = docStatus === 1;

    if (isLoadingFields) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-[#D97757]" />
                <p className="text-zinc-500 font-medium">
                    Loading form configuration...
                </p>
            </div>
        );
    }

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen">
            <main className="max-w-8xl mx-auto p-4 md:p-8 w-full overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-serif font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
                            Indent Cum Sanction Sheet
                            {(editDocName || savedDocName) && (
                                <span
                                    className={cn(
                                        "text-xs font-sans px-2.5 py-1 rounded-full border",
                                        workflowState === "Approved"
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50"
                                            : workflowState === "Draft"
                                                ? "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
                                                : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/50",
                                    )}
                                >
                                    {workflowState}
                                </span>
                            )}
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                            {editDocName || savedDocName
                                ? `Application ID: ${editDocName || savedDocName}`
                                : "New Application"}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">




                    {/* Main Form Content */}
                    <div className="space-y-6">
                        <FrappeCard>
                            <div className="p-8">
                                <DynamicFormRenderer
                                    fields={fields}
                                    formData={formData}
                                    linkOptions={linkOptions}
                                    onChange={handleFieldChange}
                                    onFileChange={handleFileChange}
                                    onTableRowChange={handleTableRowChange}
                                    onTableFileChange={handleTableFileChange}
                                    onAddTableRow={handleAddTableRow}
                                    onDeleteTableRow={handleDeleteTableRow}
                                    onFieldChangeWithSideEffects={
                                        handleFieldChangeWithSideEffects
                                    }
                                    readOnly={isReadOnly}
                                />
                            </div>

                            {/* Action Bar */}
                            {!isSubmitted && (
                                <div className="bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 p-6 flex items-center justify-between">
                                    <div className="text-sm text-zinc-500">
                                        {(editDocName || savedDocName) &&
                                            `Last updated: ${new Date().toLocaleTimeString()}`}
                                    </div>
                                    <div className="flex gap-3">
                                        {workflowState === "Draft" ? (
                                            <>
                                                <FrappeButton
                                                    variant="outline"
                                                    onClick={handleSave}
                                                    disabled={isSubmitting || isActionLoading}
                                                    className="bg-white dark:bg-zinc-800 shadow-sm"
                                                >
                                                    {isSubmitting ? (
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    ) : (
                                                        <Save className="w-4 h-4 mr-2" />
                                                    )}
                                                    Save Draft
                                                </FrappeButton>

                                                {availableActions.includes("Submit") ? (
                                                    <FrappeButton
                                                        onClick={() => handleWorkflowAction("Submit")}
                                                        disabled={isSubmitting || isActionLoading}
                                                        className="bg-[#D97757] hover:opacity-90 text-white shadow-sm"
                                                    >
                                                        {isActionLoading ? (
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        ) : (
                                                            <Send className="w-4 h-4 mr-2" />
                                                        )}
                                                        Submit
                                                    </FrappeButton>
                                                ) : (
                                                    <FrappeButton
                                                        onClick={handleSave}
                                                        disabled={
                                                            isSubmitting ||
                                                            isActionLoading ||
                                                            !(savedDocName || editDocName)
                                                        }
                                                        className="bg-[#D97757] hover:opacity-90 text-white shadow-sm"
                                                    >
                                                        {isSubmitting ? (
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        ) : (
                                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                                        )}
                                                        Save & Continue
                                                    </FrappeButton>
                                                )}
                                            </>
                                        ) : (
                                            /* Other Workflow Actions */
                                            availableActions.map((action) => (
                                                <FrappeButton
                                                    key={action}
                                                    onClick={() => handleWorkflowAction(action)}
                                                    disabled={isActionLoading}
                                                    className={cn(
                                                        "shadow-sm",
                                                        action === "Approve"
                                                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                                            : action === "Reject"
                                                                ? "bg-red-600 hover:bg-red-700 text-white"
                                                                : "bg-[#D97757] hover:opacity-90 text-white",
                                                    )}
                                                >
                                                    {isActionLoading ? (
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    ) : null}
                                                    {action}
                                                </FrappeButton>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </FrappeCard>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default IndentCumSanctionSheetForm;
