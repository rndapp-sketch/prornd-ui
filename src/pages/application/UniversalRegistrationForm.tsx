import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFrappePostCall } from "frappe-react-sdk";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, Loader2, FileText } from "lucide-react";
// import { ArrowLeft, Save, Loader2, FileText, CheckCircle2 } from "lucide-react";
import DynamicFormRenderer from "@/components/forms/DynamicFormRenderer";
import {
    universalRegistrationAPI,
    prepareFormDataForApi,
} from "@/services/apiService";
import { Skeleton } from "@/components/ui/skeleton";

interface UniversalRegistrationFormProps {
    isFundingAgency?: boolean;
}

export default function UniversalRegistrationForm({
    isFundingAgency = false,
}: UniversalRegistrationFormProps) {
    const [saveError, setSaveError] = useState<string | null>(null);
    const prevNationality = useRef<string | undefined>(undefined);
    const { id } = useParams();
    const navigate = useNavigate();

    // Form State
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [fields, setFields] = useState<any[]>([]);
    const [linkOptions, setLinkOptions] = useState<Record<string, any[]>>({});
    const [isLoadingFields, setIsLoadingFields] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [savedDocName, setSavedDocName] = useState<string | null>(id || null);

    // API Hooks
    const { call: getFieldsCall } = useFrappePostCall<{ message: any }>(
        universalRegistrationAPI.getFields,
    );
    const { call: saveCall } = useFrappePostCall<{ message: any }>(
        universalRegistrationAPI.save,
    );
    const { call: checkDuplicatesCall } = useFrappePostCall<{ message: any }>(
        universalRegistrationAPI.checkDuplicates,
    );
    const { call: checkEmailCall } = useFrappePostCall<{ message: any }>(
        universalRegistrationAPI.checkEmailAvailability,
    );

    // Email validation state
    const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "available" | "unavailable" | "invalid">("idle");
    const [emailMessage, setEmailMessage] = useState<string>("");
    const emailCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fetch Form Configuration based on Document State
    const fetchFormConfiguration = useCallback(async () => {
        setIsLoadingFields(true);
        try {
            const response = await getFieldsCall({
                doc_name: savedDocName || undefined,
            });
            if (response && response.message) {
                const {
                    fields: fetchedFields,
                    link_options,
                    prefill_data,
                } = response.message;

                // Force Account Type to be non-readonly
                const enableAccountType = (fieldsList: any[]) => {
                    fieldsList.forEach((f) => {
                        if (f.fieldname === "account_type_u_r" || f.label === "Account Type") {
                            f.read_only = 0;
                            f.read_only_depends_on = null;
                        }
                        if (f.child_fields && Array.isArray(f.child_fields)) {
                            enableAccountType(f.child_fields);
                        }
                    });
                };

                if (fetchedFields) {
                    enableAccountType(fetchedFields);

                    let processedFields = [...fetchedFields];

                    const pullField = (fname: string) => {
                        const idx = processedFields.findIndex((f) => f.fieldname === fname);
                        if (idx !== -1) {
                            return processedFields.splice(idx, 1)[0];
                        }
                        return null;
                    };

                    const profileTypeField = processedFields.find(f => f.fieldname === "profile_type_u_r");
                    if (profileTypeField && profileTypeField.options) {
                        const originalOptions = profileTypeField.options.split("\n");
                        const modifiedOptions = originalOptions
                            .filter((opt: string) => opt.trim() !== "Organization")
                            .map((opt: string) => opt.trim() === "Individual (For Honorarium)" ? "Individual (For Honorarium)" : opt);
                        profileTypeField.options = modifiedOptions.join("\n");
                    }

                    const emailField = pullField("email_address_u_r");
                    if (emailField) {
                        emailField.label = "Official Email Address";
                    }
                    const profileTypeIdx = processedFields.findIndex((f) => f.fieldname === "profile_type_u_r");
                    if (profileTypeIdx !== -1 && emailField) {
                        processedFields.splice(profileTypeIdx + 1, 0, emailField);
                    } else if (emailField) {
                        processedFields.unshift(emailField);
                    }

                    const personalFnames = ["full_name_u_r", "gender_u_r", "nationality_u_r", "guardian_name_u_r", "dob_u_r"];
                    const personalExtracted = personalFnames.map(f => pullField(f)).filter(Boolean);

                    const contactFnames = ["mobile_number_u_r", "same_as_mobile_number_u_r", "whatsapp_number_u_r", "alternate_mobile_number_u_r"];
                    const contactExtracted = contactFnames.map(f => pullField(f)).filter(Boolean);

                    const sameAsMobileField = contactExtracted.find(f => f.fieldname === "same_as_mobile_number_u_r");
                    if (sameAsMobileField) {
                        sameAsMobileField.label = "WhatsApp No. Same as mobile number.";
                    }

                    const uniFnames = ["institution_details_u_r", "designation_u_r", "department_u_r"];
                    const uniExtracted = uniFnames.map(f => pullField(f)).filter(Boolean);

                    // Auto-add first row for Institution Details
                    const instField = uniExtracted.find((f: any) => f.fieldname === "institution_details_u_r");
                    if (instField) {
                        instField.autoAddFirstRow = true;
                        instField.maxRows = 1;
                        instField.disableDelete = true;
                    }

                    // Auto-add first row for Bank Details
                    const bankField = processedFields.find((f: any) => f.fieldname === "bank_details_u_r");
                    if (bankField) {
                        bankField.autoAddFirstRow = true;
                        bankField.maxRows = 1;
                        bankField.disableDelete = true;
                        if (bankField.child_fields) {
                            bankField.child_fields.forEach((cf: any) => {
                                if (cf.fieldname === "bank_city_u_r" || cf.fieldname === "bank_state_u_r") {
                                    cf.read_only = 0;
                                }
                            });
                        }
                    }

                    // Split Address Tables into Permanent and Current
                    const addrIdx = processedFields.findIndex((f: any) => f.fieldname === "address_details");
                    if (addrIdx !== -1) {
                        const baseField = JSON.parse(JSON.stringify(processedFields[addrIdx]));
                        if (baseField.child_fields) {
                            baseField.child_fields.forEach((cf: any) => {
                                const lowerLabel = cf.label?.toLowerCase() || "";
                                if (lowerLabel.includes("district") || lowerLabel.includes("city") || lowerLabel.includes("state")) {
                                    cf.read_only = 0;
                                }
                            });
                        }
                        const typeField = baseField.child_fields?.find((cf: any) => {
                            const lbl = cf.label?.toLowerCase() || "";
                            const fn = cf.fieldname || "";
                            return lbl.includes("address type") || fn.includes("address_type") || lbl === "type" || fn === "type";
                        });
                        if (typeField) {
                            typeField.read_only = 1;
                        }

                        const permField = { ...baseField, fieldname: "permanent_address_custom", label: "Permanent Address", maxRows: 1, autoAddFirstRow: 1, mandatory: 1, disableDelete: true };
                        const currField = { ...baseField, fieldname: "current_address_custom", label: "Present Address", maxRows: 1, autoAddFirstRow: 1, mandatory: 1, disableDelete: true };
                        if (typeField) {
                            permField.defaultRows = [{ [typeField.fieldname]: "Permanent" }];
                            currField.defaultRows = [{ [typeField.fieldname]: "Present" }];
                        }
                        const checkboxField = { fieldname: "same_as_permanent_address_custom", fieldtype: "Check", label: "Present Address Same as Permanent Address", read_only: 0 };
                        processedFields.splice(addrIdx, 1, permField, checkboxField, currField);
                    }

                    const orgAddrIdx = processedFields.findIndex((f: any) => f.fieldname === "org_address_details_u_r");
                    if (orgAddrIdx !== -1) {
                        const baseField = JSON.parse(JSON.stringify(processedFields[orgAddrIdx]));
                        if (baseField.child_fields) {
                            baseField.child_fields.forEach((cf: any) => {
                                const lowerLabel = cf.label?.toLowerCase() || "";
                                if (lowerLabel.includes("district") || lowerLabel.includes("city") || lowerLabel.includes("state")) {
                                    cf.read_only = 0;
                                }
                            });
                        }
                        const typeField = baseField.child_fields?.find((cf: any) => {
                            const lbl = cf.label?.toLowerCase() || "";
                            const fn = cf.fieldname || "";
                            return lbl.includes("address type") || fn.includes("address_type") || lbl === "type" || fn === "type";
                        });
                        if (typeField) {
                            typeField.read_only = 1;
                        }

                        const permField = { ...baseField, fieldname: "org_permanent_address_custom", label: "Permanent Address", maxRows: 1, autoAddFirstRow: 1, mandatory: 1, disableDelete: true };
                        const currField = { ...baseField, fieldname: "org_current_address_custom", label: "Present Address", maxRows: 1, autoAddFirstRow: 1, mandatory: 1, disableDelete: true };
                        if (typeField) {
                            permField.defaultRows = [{ [typeField.fieldname]: "Permanent" }];
                            currField.defaultRows = [{ [typeField.fieldname]: "Present" }];
                        }
                        const checkboxField = { fieldname: "org_same_as_permanent_address_custom", fieldtype: "Check", label: "Same as Permanent Address", read_only: 0 };
                        processedFields.splice(orgAddrIdx, 1, permField, checkboxField, currField);
                    }

                    // Mark PI / Co-PI mandatory fields
                    const piMandatoryFields = [
                        "email_address_u_r", "full_name_u_r", "gender_u_r",
                        "nationality_u_r", "institution_details_u_r", "uploaded_documents_u_r",
                        "mobile_number_u_r",
                    ];
                    const allExtracted = [
                        ...personalExtracted, ...contactExtracted, ...uniExtracted,
                    ];
                    // Also mark fields that remain in processedFields
                    [...allExtracted, ...processedFields].forEach((f: any) => {
                        if (piMandatoryFields.includes(f.fieldname)) {
                            f.mandatory = 1;
                        }
                        if (f.fieldname === "uploaded_documents_u_r") {
                            f.label = "Official Identification (Aadhaar & PAN / Foreigner ID)";
                            // Remove mandatory from the table label itself (*) as per requirement
                            f.mandatory = 0;
                            // Ensure internal columns remain mandatory
                            if (f.child_fields && Array.isArray(f.child_fields)) {
                                f.child_fields.forEach((cf: any) => {
                                    if (cf.label === "Document Type" || cf.label === "ID Number") {
                                        cf.mandatory = 1;
                                    }
                                });
                            }
                        }
                        if (f.fieldname === "experiences_u_r") {
                            f.label = "Experience (If Any)";
                        }
                    });

                    const personalSec = pullField("personal_information_section_u_r") || {
                        fieldname: "personal_information_section_u_r",
                        fieldtype: "Section Break",
                        label: "Personal Information",
                    };

                    const contactSec = pullField("contact_information_section_u_r") || {
                        fieldname: "contact_information_section_u_r",
                        fieldtype: "Section Break",
                        label: "Contact Information",
                    };

                    const uniSec = pullField("university_detail_u_r") || {
                        fieldname: "university_detail_u_r",
                        fieldtype: "Section Break",
                        label: "Affiliation Details",
                    };

                    const anchorIdx = processedFields.findIndex((f) => f.fieldname === "organization_sub_type_u_r");
                    const insertAt = anchorIdx !== -1 ? anchorIdx + 1 : (profileTypeIdx !== -1 ? profileTypeIdx + 2 : 0);

                    const blockToInsert = [
                        personalSec,
                        ...personalExtracted,
                        contactSec,
                        ...contactExtracted,
                        uniSec,
                        ...uniExtracted,
                    ];

                    processedFields.splice(insertAt, 0, ...blockToInsert);

                    setFields(processedFields);
                } else {
                    setFields([]);
                }

                // Set Link Options
                setLinkOptions(link_options || {});

                // Default status
                let initialData: any = { status_u_r: "Draft" };

                // Pre-fill Funding Agency based on route prop
                if (isFundingAgency && !savedDocName) {
                    initialData.profile_type_u_r = "Organization";
                    initialData.organization_sub_type_u_r = "Funding Agency";
                }

                // Handle Prefill Data (Edit flow)
                if (prefill_data && savedDocName) {
                    initialData = { ...initialData, ...prefill_data };
                }

                // Map legacy profile type value to the new renamed value for UI consistency
                if (initialData.profile_type_u_r === "Individual (For Honorarium)") {
                    initialData.profile_type_u_r = "Individual (For Honorarium)";
                }

                setFormData(initialData);
            }
        } catch (error) {
            console.error("Error fetching form configuration:", error);
            alert("Failed to load form configuration.");
        } finally {
            setIsLoadingFields(false);
        }
    }, [savedDocName, getFieldsCall]);

    useEffect(() => {
        let mounted = true;
        fetchFormConfiguration().then(() => {
            if (!mounted) return;
        });
        return () => {
            mounted = false;
        };
    }, [fetchFormConfiguration]);

    // WhatsApp auto-fill: sync WhatsApp number when "Same as mobile" is checked
    useEffect(() => {
        if (formData.same_as_mobile_number_u_r === 1 || formData.same_as_mobile_number_u_r === true) {
            const mobileVal = formData.mobile_number_u_r || "";
            if (formData.whatsapp_number_u_r !== mobileVal) {
                setFormData((prev) => ({ ...prev, whatsapp_number_u_r: mobileVal }));
            }
        }
    }, [formData.same_as_mobile_number_u_r, formData.mobile_number_u_r]);

    // Map existing address data to split tables on load
    useEffect(() => {
        if (formData.address_details && formData.address_details.length > 0 && !formData.permanent_address_custom && !formData.current_address_custom) {
            const perm = formData.address_details.find((r: any) => r.address_type === "Permanent" || r.address_type === "Permanent Address") || formData.address_details[0];
            const curr = formData.address_details.find((r: any) => r.address_type === "Present" || r.address_type === "Present Address" || r.address_type === "Current") || formData.address_details[1] || {};
            setFormData(prev => ({ ...prev, permanent_address_custom: [perm], current_address_custom: [curr] }));
        }
    }, [formData.address_details]);

    useEffect(() => {
        if (formData.org_address_details_u_r && formData.org_address_details_u_r.length > 0 && !formData.org_permanent_address_custom && !formData.org_current_address_custom) {
            const perm = formData.org_address_details_u_r.find((r: any) => r.address_type === "Permanent" || r.address_type === "Permanent Address") || formData.org_address_details_u_r[0];
            const curr = formData.org_address_details_u_r.find((r: any) => r.address_type === "Present" || r.address_type === "Present Address" || r.address_type === "Current") || formData.org_address_details_u_r[1] || {};
            setFormData(prev => ({ ...prev, org_permanent_address_custom: [perm], org_current_address_custom: [curr] }));
        }
    }, [formData.org_address_details_u_r]);

    // Address auto-fill: sync Permanent to Current when "Same as Permanent Address" is checked
    useEffect(() => {
        if (formData.same_as_permanent_address_custom === 1 || formData.same_as_permanent_address_custom === true) {
            const permTable = formData.permanent_address_custom || [];
            if (permTable.length > 0) {
                const permanentRow = permTable[0];
                const currentRow = (formData.current_address_custom || [])[0] || {};
                let needsUpdate = false;
                const updatedCurrentRow = { ...currentRow };
                Object.keys(permanentRow).forEach(key => {
                    if (key !== 'id' && key !== 'idx' && !key.includes('address_type') && key !== 'type') {
                        if (updatedCurrentRow[key] !== permanentRow[key]) {
                            updatedCurrentRow[key] = permanentRow[key];
                            needsUpdate = true;
                        }
                    }
                });
                if (needsUpdate) {
                    setFormData(prev => ({ ...prev, current_address_custom: [updatedCurrentRow] }));
                }
            }
        }
    }, [formData.same_as_permanent_address_custom, formData.permanent_address_custom]);

    // Organization Address auto-fill
    useEffect(() => {
        if (formData.org_same_as_permanent_address_custom === 1 || formData.org_same_as_permanent_address_custom === true) {
            const permTable = formData.org_permanent_address_custom || [];
            if (permTable.length > 0) {
                const permanentRow = permTable[0];
                const currentRow = (formData.org_current_address_custom || [])[0] || {};
                let needsUpdate = false;
                const updatedCurrentRow = { ...currentRow };
                Object.keys(permanentRow).forEach(key => {
                    if (key !== 'id' && key !== 'idx' && !key.includes('address_type') && key !== 'type') {
                        if (updatedCurrentRow[key] !== permanentRow[key]) {
                            updatedCurrentRow[key] = permanentRow[key];
                            needsUpdate = true;
                        }
                    }
                });
                if (needsUpdate) {
                    setFormData(prev => ({ ...prev, org_current_address_custom: [updatedCurrentRow] }));
                }
            }
        }
    }, [formData.org_same_as_permanent_address_custom, formData.org_permanent_address_custom]);

    // Dynamically update uploaded_documents_u_r based on nationality
    useEffect(() => {
        let shouldClearTable = false;
        if (prevNationality.current !== undefined && prevNationality.current !== formData.nationality_u_r) {
            shouldClearTable = true;
        }
        prevNationality.current = formData.nationality_u_r;

        setFields(prevFields => {
            const newFields = [...prevFields];
            const docsIdx = newFields.findIndex(f => f.fieldname === "uploaded_documents_u_r");
            if (docsIdx !== -1) {
                const docsField = JSON.parse(JSON.stringify(newFields[docsIdx])); 
                const typeField = docsField.child_fields?.find((cf: any) => cf.label === "Document Type" || cf.fieldname === "document_type");
                const typeFieldname = typeField ? typeField.fieldname : "document_type";

                let needsUpdate = false;

                if (formData.nationality_u_r === "India") {
                    if (docsField.maxRows !== 2 || docsField.autoAddFirstRow !== 2) {
                        docsField.autoAddFirstRow = 2;
                        docsField.maxRows = 2;
                        docsField.disableDelete = true;
                        docsField.defaultRows = [
                            { [typeFieldname]: "Aadhaar Card" },
                            { [typeFieldname]: "Pan Card" }
                        ];
                        if (typeField) typeField.read_only = 1;
                        needsUpdate = true;
                    }
                } else if (formData.nationality_u_r && formData.nationality_u_r !== "India") {
                    if (docsField.maxRows !== 1 || docsField.autoAddFirstRow !== 1) {
                        docsField.autoAddFirstRow = 1;
                        docsField.maxRows = 1;
                        docsField.disableDelete = true;
                        docsField.defaultRows = [
                            { [typeFieldname]: "ID Proof (For Non-Indian)" }
                        ];
                        if (typeField) typeField.read_only = 1;
                        needsUpdate = true;
                    }
                } else {
                    if (docsField.disableDelete === true) {
                        docsField.autoAddFirstRow = 0;
                        docsField.maxRows = undefined;
                        docsField.disableDelete = false;
                        docsField.defaultRows = [];
                        if (typeField) typeField.read_only = 0;
                        needsUpdate = true;
                    }
                }

                if (needsUpdate) {
                    newFields[docsIdx] = docsField;
                    return newFields;
                }
            }
            return prevFields;
        });

        if (shouldClearTable) {
            setFormData(prev => {
                let newDocs: any[] = [];
                let typeFieldname = "document_type"; // fallback
                if (fields && fields.length > 0) {
                    const docFielddef = fields.find(f => f.fieldname === "uploaded_documents_u_r");
                    const typeField = docFielddef?.child_fields?.find((cf: any) => cf.label === "Document Type" || cf.fieldname === "document_type");
                    if (typeField) typeFieldname = typeField.fieldname;
                }

                if (formData.nationality_u_r === "India") {
                    newDocs = [
                        { [typeFieldname]: "Aadhaar Card" },
                        { [typeFieldname]: "Pan Card" }
                    ];
                } else if (formData.nationality_u_r && formData.nationality_u_r !== "India") {
                    newDocs = [
                        { [typeFieldname]: "ID Proof (For Non-Indian)" }
                    ];
                }
                return { ...prev, uploaded_documents_u_r: newDocs };
            });
        }
    }, [formData.nationality_u_r]);

    // Handle single field changes
    const handleFieldChange = useCallback((fieldname: string, value: any) => {
        setFormData((prev) => {
            const updated = { ...prev, [fieldname]: value };
            // When "Same as mobile number" checkbox is toggled ON, copy mobile to WhatsApp
            if (fieldname === "same_as_mobile_number_u_r" && (value === 1 || value === true)) {
                updated.whatsapp_number_u_r = prev.mobile_number_u_r || "";
            }

            // Clear PIN code details if valid pincode is modified to an invalid one
            if (
                typeof fieldname === "string" &&
                (fieldname.toLowerCase().includes("pin_code") || fieldname.toLowerCase().includes("pincode")) &&
                typeof value === "string" && value.length !== 6
            ) {
                const distField = fieldname.replace(/pin_?code/i, "district");
                const cityField = fieldname.replace(/pin_?code/i, "city");
                const stateField = fieldname.replace(/pin_?code/i, "state");
                updated[distField] = "";
                updated[cityField] = "";
                updated[stateField] = "";
            }

            return updated;
        });

        // --- Real-time Email Availability Check ---
        if (fieldname === "email_address_u_r") {
            // Clear any previous timer
            if (emailCheckTimerRef.current) {
                clearTimeout(emailCheckTimerRef.current);
            }

            const emailValue = typeof value === "string" ? value.trim().toLowerCase() : "";

            // Basic email format validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailValue) {
                setEmailStatus("idle");
                setEmailMessage("");
                return; // Skip further checks but still run pincode logic below if needed
            }

            if (!emailRegex.test(emailValue)) {
                setEmailStatus("invalid");
                setEmailMessage("Please enter a valid email address.");
                return;
            }

            // Set checking state and debounce the API call
            setEmailStatus("checking");
            setEmailMessage("Checking availability...");

            emailCheckTimerRef.current = setTimeout(async () => {
                try {
                    const response = await checkEmailCall({
                        email: emailValue,
                        exclude_docname: savedDocName || undefined,
                    });

                    const result =
                        typeof response?.message === "string"
                            ? JSON.parse(response.message)
                            : response?.message;

                    if (result?.status === "success") {
                        if (result.available) {
                            setEmailStatus("idle");
                            setEmailMessage("");
                        } else {
                            setEmailStatus("unavailable");
                            setEmailMessage("An account with this email already exists.");
                        }
                    } else {
                        setEmailStatus("idle");
                        setEmailMessage("");
                    }
                } catch (err) {
                    console.error("Email availability check failed:", err);
                    setEmailStatus("idle");
                    setEmailMessage("");
                }
            }, 500); // 500ms debounce
        }

        if (
            typeof fieldname === "string" &&
            (fieldname.toLowerCase().includes("pin_code") || fieldname.toLowerCase().includes("pincode")) &&
            typeof value === "string" &&
            value.length === 6 &&
            /^\d+$/.test(value)
        ) {
            fetch(`https://api.postalpincode.in/pincode/${value}`)
                .then((res) => {
                    if (res.ok) return res.json();
                    throw new Error("Invalid PIN Code");
                })
                .then((data) => {
                    if (data && data[0] && data[0].Status === "Success" && data[0].PostOffice && data[0].PostOffice.length > 0) {
                        const po = data[0].PostOffice[0];
                        setFormData((prev) => {
                            const distField = fieldname.replace(/pin_?code/i, "district");
                            const cityField = fieldname.replace(/pin_?code/i, "city");
                            const stateField = fieldname.replace(/pin_?code/i, "state");

                            return {
                                ...prev,
                                [distField]: po.District || "",
                                [cityField]: po.Block || po.Name || po.District || "",
                                [stateField]: po.State || "",
                            };
                        });
                    }
                })
                .catch((err) => console.error("Error fetching pincode details:", err));
        }
    }, [checkEmailCall, savedDocName]);

    // Handle file changes for root fields
    const handleFileChange = useCallback(
        (fieldname: string, file: File | null) => {
            setFormData((prev) => ({ ...prev, [fieldname]: file }));
        },
        [],
    );

    // --- TABLE HANDLERS ---
    const handleTableRowChange = useCallback(
        (tableName: string, rowIndex: number, fieldname: string, value: any) => {
            setFormData((prev) => {
                const tableData = [...(prev[tableName] || [])];
                if (tableData[rowIndex]) {
                    tableData[rowIndex] = { ...tableData[rowIndex], [fieldname]: value };

                    if (tableName === "bank_details_u_r" && fieldname === "ifsc_code_u_r") {
                        if (typeof value === "string" && value.length !== 11) {
                            tableData[rowIndex].bank_name_u_r = "";
                            tableData[rowIndex].branch_name_u_r = "";
                            tableData[rowIndex].bank_city_u_r = "";
                            tableData[rowIndex].bank_state_u_r = "";
                        }
                    }

                    if (
                        typeof fieldname === "string" &&
                        (fieldname.toLowerCase().includes("pin_code") || fieldname.toLowerCase().includes("pincode")) &&
                        typeof value === "string" && value.length !== 6
                    ) {
                        const distField = fieldname.replace(/pin_?code/i, "district");
                        const cityField = fieldname.replace(/pin_?code/i, "city");
                        const stateField = fieldname.replace(/pin_?code/i, "state");
                        tableData[rowIndex][distField] = "";
                        tableData[rowIndex][cityField] = "";
                        tableData[rowIndex][stateField] = "";
                    }
                }
                return { ...prev, [tableName]: tableData };
            });

            if (
                typeof fieldname === "string" &&
                (fieldname.toLowerCase().includes("pin_code") || fieldname.toLowerCase().includes("pincode")) &&
                typeof value === "string" &&
                value.length === 6 &&
                /^\d+$/.test(value)
            ) {
                fetch(`https://api.postalpincode.in/pincode/${value}`)
                    .then((res) => {
                        if (res.ok) return res.json();
                        throw new Error("Invalid PIN Code");
                    })
                    .then((data) => {
                        if (data && data[0] && data[0].Status === "Success" && data[0].PostOffice && data[0].PostOffice.length > 0) {
                            const po = data[0].PostOffice[0];
                            setFormData((prev) => {
                                const tableData = [...(prev[tableName] || [])];
                                if (tableData[rowIndex]) {
                                    const distField = fieldname.replace(/pin_?code/i, "district");
                                    const cityField = fieldname.replace(/pin_?code/i, "city");
                                    const stateField = fieldname.replace(/pin_?code/i, "state");

                                    tableData[rowIndex] = {
                                        ...tableData[rowIndex],
                                        [distField]: po.District || "",
                                        [cityField]: po.Block || po.Name || po.District || "",
                                        [stateField]: po.State || "",
                                    };
                                }
                                return { ...prev, [tableName]: tableData };
                            });
                        }
                    })
                    .catch((err) => console.error("Error fetching pincode details:", err));
            }

            if (
                tableName === "bank_details_u_r" &&
                fieldname === "ifsc_code_u_r" &&
                typeof value === "string" &&
                value.length === 11
            ) {
                fetch(`https://ifsc.razorpay.com/${value}`)
                    .then((res) => {
                        if (res.ok) return res.json();
                        throw new Error("Invalid IFSC");
                    })
                    .then((data) => {
                        setFormData((prev) => {
                            const tableData = [...(prev[tableName] || [])];
                            if (tableData[rowIndex]) {
                                tableData[rowIndex] = {
                                    ...tableData[rowIndex],
                                    bank_name_u_r: data.BANK,
                                    branch_name_u_r: data.BRANCH,
                                    bank_city_u_r: data.CITY,
                                    bank_state_u_r: data.STATE,
                                };
                            }
                            return { ...prev, [tableName]: tableData };
                        });
                    })
                    .catch((err) => {
                        console.error("Error fetching bank details:", err);
                        setFormData((prev) => {
                            const tableData = [...(prev[tableName] || [])];
                            if (tableData[rowIndex]) {
                                tableData[rowIndex] = {
                                    ...tableData[rowIndex],
                                    bank_name_u_r: "",
                                    branch_name_u_r: "",
                                    bank_city_u_r: "",
                                    bank_state_u_r: "",
                                };
                            }
                            return { ...prev, [tableName]: tableData };
                        });
                    });
            }
        },
        [],
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

    // Filter out hidden fields
    const HIDDEN_FIELDS = [
        "amended_from",
        "docstatus",
        "naming_series",
        "workflow_state",
    ];
    let dynamicHiddenFields = [...HIDDEN_FIELDS];

    const profile_type = formData.profile_type_u_r || null;
    const org_sub_type = formData.organization_sub_type_u_r || null;

    const is_personal = profile_type === "Individual (For Honorarium)" || profile_type === "Individual (For Honorarium)";
    const is_org = profile_type === "Organization";
    const is_vendor = is_org && org_sub_type === "Vendor";
    const is_pi_copi = profile_type === "PI / Co-PI (External only)";

    // DEFAULT: HIDE EVERYTHING
    const sectionsToHide = new Set([
        // --- Sections ---
        "personal_information_section_u_r",
        "contact_information_section_u_r",
        "personal_history_section_u_r",
        "organization_basic_details_section_u_r",
        "financial_and_documents_common_section_u_r",
        "vendor_profile_and_statutory_section_u_r",
        "vendor_declarations_and_signatory_section_u_r",
        "compliance_and_sub_type_logic_section_u_r",
        // --- Personal fields ---
        "full_name_u_r",
        "guardian_name_u_r",
        "dob_u_r",
        "gender_u_r",
        "nationality_u_r",
        "mobile_number_u_r",
        "email_address_u_r",
        "whatsapp_number_u_r",
        "same_as_mobile_number_u_r",
        "alternate_mobile_number_u_r",
        "permanent_address_custom",
        "same_as_permanent_address_custom",
        "current_address_custom",
        "address_details",
        "qualifications_u_r",
        "experiences_u_r",
        // --- Organization fields ---
        "org_name_u_r",
        "est_date_u_r",
        "nature_of_business_u_r",
        "website_u_r",
        "contact_person_u_r",
        "contact_designation",
        "email_oraganization__contact_person_u_r",
        "org_contact_number_u_r",
        "organization_mobile_number_u_r",
        "org_permanent_address_custom",
        "org_same_as_permanent_address_custom",
        "org_current_address_custom",
        "org_address_details_u_r",
        "universal_user_u_r",
        // --- Vendor / Org sub-type fields ---
        "gst_number_u_r",
        "overhead_percentage_u_r",
        "discount_percentage_u_r",
        "agreement_number_u_r",
        "type_of_business_u_r",
        "other_business_type_u_r",
        "nature_of_org",
        "pan_number_org_u_r",
        "gst_status_u_r",
        "other_registration_u_r",
        "signatory_name_u_r",
        "signatory_designation_u_r",
        "date_of_signing_u_r",
        "decl_info_true_u_r",
        // --- Affiliation Detail fields (shown for PI / Co-PI (External only)) ---
        "university_detail_u_r",
        "institution_details_u_r",
        "designation_u_r",
        "department_u_r",
        // --- Financial / Documents ---
        "uploaded_documents_u_r",
        "bank_details_u_r",
    ]);

    // PERSONAL FLOW
    if (is_personal) {
        sectionsToHide.delete("personal_information_section_u_r");
        sectionsToHide.delete("contact_information_section_u_r");
        sectionsToHide.delete("personal_history_section_u_r");
        sectionsToHide.delete("financial_and_documents_common_section_u_r");
        sectionsToHide.delete("full_name_u_r");
        sectionsToHide.delete("gender_u_r");
        sectionsToHide.delete("nationality_u_r");
        sectionsToHide.delete("mobile_number_u_r");
        sectionsToHide.delete("email_address_u_r");
        sectionsToHide.delete("whatsapp_number_u_r");
        sectionsToHide.delete("same_as_mobile_number_u_r");
        sectionsToHide.delete("permanent_address_custom");
        sectionsToHide.delete("same_as_permanent_address_custom");
        sectionsToHide.delete("current_address_custom");
        sectionsToHide.delete("address_details");
        sectionsToHide.delete("qualifications_u_r");
        sectionsToHide.delete("experiences_u_r");
        sectionsToHide.delete("uploaded_documents_u_r");
        sectionsToHide.delete("bank_details_u_r");
    }

    // PI / Co-PI (External only) FLOW
    if (is_pi_copi) {
        // Personal Details: Full Name*, Gender, Nationality
        sectionsToHide.delete("personal_information_section_u_r");
        sectionsToHide.delete("contact_information_section_u_r");
        sectionsToHide.delete("full_name_u_r");
        sectionsToHide.delete("gender_u_r");
        sectionsToHide.delete("nationality_u_r");
        // Contact Information: Mobile Number*, Email, WhatsApp No., Same as mobile checkbox
        sectionsToHide.delete("mobile_number_u_r");
        sectionsToHide.delete("email_address_u_r");
        sectionsToHide.delete("same_as_mobile_number_u_r");
        sectionsToHide.delete("whatsapp_number_u_r");
        // Affiliation Detail section
        sectionsToHide.delete("university_detail_u_r");
        sectionsToHide.delete("institution_details_u_r");
        sectionsToHide.delete("designation_u_r");
        sectionsToHide.delete("department_u_r");
        // Identity & Credential Documents + Bank Details
        sectionsToHide.delete("financial_and_documents_common_section_u_r");
        sectionsToHide.delete("uploaded_documents_u_r");
        sectionsToHide.delete("bank_details_u_r");
    }

    // ORGANIZATION FLOW
    if (is_org) {
        sectionsToHide.delete("organization_basic_details_section_u_r");
        sectionsToHide.delete("financial_and_documents_common_section_u_r");
        sectionsToHide.delete("compliance_and_sub_type_logic_section_u_r");
        // Organization fields
        sectionsToHide.delete("org_name_u_r");
        sectionsToHide.delete("est_date_u_r");
        sectionsToHide.delete("nature_of_business_u_r");
        sectionsToHide.delete("website_u_r");
        sectionsToHide.delete("contact_person_u_r");
        sectionsToHide.delete("contact_designation");
        sectionsToHide.delete("email_oraganization__contact_person_u_r");
        sectionsToHide.delete("org_contact_number_u_r");
        sectionsToHide.delete("organization_mobile_number_u_r");
        sectionsToHide.delete("org_permanent_address_custom");
        sectionsToHide.delete("org_same_as_permanent_address_custom");
        sectionsToHide.delete("org_current_address_custom");
        sectionsToHide.delete("org_address_details_u_r");
        sectionsToHide.delete("gst_number_u_r");
        sectionsToHide.delete("uploaded_documents_u_r");
        sectionsToHide.delete("bank_details_u_r");
    }

    // VENDOR FLOW
    if (is_vendor) {
        sectionsToHide.delete("vendor_profile_and_statutory_section_u_r");
        sectionsToHide.delete("vendor_declarations_and_signatory_section_u_r");
        sectionsToHide.delete("type_of_business_u_r");
        sectionsToHide.delete("other_business_type_u_r");
        sectionsToHide.delete("nature_of_org");
        sectionsToHide.delete("pan_number_org_u_r");
        sectionsToHide.delete("gst_status_u_r");
        sectionsToHide.delete("other_registration_u_r");
        sectionsToHide.delete("signatory_name_u_r");
        sectionsToHide.delete("signatory_designation_u_r");
        sectionsToHide.delete("date_of_signing_u_r");
        sectionsToHide.delete("decl_info_true_u_r");
    }

    // ORG SUB-TYPE SPECIFIC FIELDS
    if (org_sub_type === "Funding Agency") {
        sectionsToHide.delete("overhead_percentage_u_r");
    }

    if (org_sub_type === "Local Supplier") {
        sectionsToHide.delete("discount_percentage_u_r");
    }

    if (org_sub_type === "Principle Supplier") {
        sectionsToHide.delete("agreement_number_u_r");
    }

    dynamicHiddenFields = [...dynamicHiddenFields, ...Array.from(sectionsToHide)];

    const filteredFields = (fields || [])
        .filter((f: any) => !dynamicHiddenFields.includes(f.fieldname))
        .map((f: any) => {
            if (is_personal && f.fieldname === "bank_details_u_r") {
                return { ...f, mandatory: 1 };
            }
            return f;
        });

    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsSaving(true);

        try {
            // MERGE SPLIT ADDRESS TABLES
            const finalFormData = { ...formData };
            if (finalFormData.permanent_address_custom || finalFormData.current_address_custom) {
                finalFormData.address_details = [
                    ...(finalFormData.permanent_address_custom || []),
                    ...(finalFormData.current_address_custom || [])
                ];
            }
            if (finalFormData.org_permanent_address_custom || finalFormData.org_current_address_custom) {
                finalFormData.org_address_details_u_r = [
                    ...(finalFormData.org_permanent_address_custom || []),
                    ...(finalFormData.org_current_address_custom || [])
                ];
            }

            // 0. Frontend Mandatory Field Validation (Generic)
            const missingFields: string[] = [];
            filteredFields.forEach((f: any) => {
                if (f.mandatory) {
                    if (f.fieldtype === "Table") {
                        const tableData = finalFormData[f.fieldname];
                        if (!tableData || !Array.isArray(tableData) || tableData.length === 0) {
                            missingFields.push(f.label || f.fieldname);
                        } else {
                            // Check if mandatory child fields are filled
                            if (f.child_fields && Array.isArray(f.child_fields)) {
                                const mandatoryChildFields = f.child_fields.filter((cf: any) => cf.mandatory);
                                if (mandatoryChildFields.length > 0) {
                                    const isAnyRowIncomplete = tableData.some((row: any) => 
                                        mandatoryChildFields.some((cf: any) => {
                                            const val = row[cf.fieldname];
                                            return val === undefined || val === null || (typeof val === "string" && val.trim() === "");
                                        })
                                    );
                                    if (isAnyRowIncomplete) {
                                        // Only push if not already in missingFields
                                        if (!missingFields.includes(f.label || f.fieldname)) {
                                            missingFields.push(`${f.label || f.fieldname} (All rows must be complete)`);
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        const val = finalFormData[f.fieldname];
                        if (val === undefined || val === null || (typeof val === "string" && val.trim() === "")) {
                            missingFields.push(f.label || f.fieldname);
                        }
                    }
                }
            });

            if (missingFields.length > 0) {
                alert(`Please fill in the following mandatory fields:\n\n• ${missingFields.join("\n• ")}`);
                setIsSaving(false);
                return;
            }
            // 1. Pre-flight Duplicate Check
            // Extract Email and ID Numbers
            const emailToCheck = finalFormData.email_address_u_r;
            const idNumbersToCheck = (finalFormData.uploaded_documents_u_r || [])
                .map((doc: any) => doc.id_number_u_r)
                .filter((val: string) => val && val.trim() !== "");

            if (emailToCheck || idNumbersToCheck.length > 0) {
                const checkResponse = await checkDuplicatesCall({
                    email: emailToCheck,
                    id_numbers: JSON.stringify(idNumbersToCheck),
                    exclude_docname: savedDocName || undefined,
                });

                const checkData =
                    typeof checkResponse?.message === "string"
                        ? JSON.parse(checkResponse.message)
                        : checkResponse?.message;

                if (checkData?.has_duplicate) {
                    const fieldNames = checkData.duplicates.join(" and ");
                    alert(`Registration failed: This ${fieldNames} is already registered in our system.`);
                    setIsSaving(false);
                    return; // Stop saving
                }
            }

            // 2. Prepare and Save Data
            const preparedData = await prepareFormDataForApi({
                ...finalFormData,
                docname: savedDocName,
            });

            const response = await saveCall({ data: JSON.stringify(preparedData) });

            if (response && response.message) {
                const message =
                    typeof response.message === "string"
                        ? JSON.parse(response.message)
                        : response.message;

                if (message.status === "success") {
                    setSavedDocName(message.docname);
                    alert(
                        `Stakeholder Registration saved successfully. (ID: ${message.docname})`,
                    );

                    // Navigation to edit mode if we were creating a new one
                    if (!savedDocName) {
                        navigate(`/universal-registration/${message.docname}`, {
                            replace: true,
                        });
                    }
                } else {
                    throw new Error(
                        message.message ||
                        "Failed to save data. No success status received.",
                    );
                }
            } else {
                throw new Error("Invalid response received from the server.");
            }
        } catch (error: any) {
            console.error("Error saving form:", error);
            const errorMsg = error.exc
                ? JSON.parse(error.exc)[0]
                : error.message || "An unexpected error occurred while saving.";
            alert(`Error Saving Form: ${errorMsg}`);
        } finally {
            setIsSaving(false);
        }
    };

    const isReadOnly = formData.docstatus === 1 || formData.docstatus === 2; // Submitted or Cancelled

    if (isLoadingFields) {
        return (
            <div className="flex-1 w-full bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen">
                <div className="max-w-[1240px] px-8 py-10 mx-auto">
                    <div className="flex items-center gap-4 mb-8">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-[250px]" />
                            <Skeleton className="h-4 w-[200px]" />
                        </div>
                    </div>
                    <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
                        <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 bg-[#FDFDFD] dark:bg-[#27272A]">
                            <Skeleton className="h-6 w-[200px] mb-2" />
                            <Skeleton className="h-4 w-[350px]" />
                        </CardHeader>
                        <CardContent className="p-8 space-y-8 bg-white dark:bg-zinc-900">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="space-y-4">
                                    <Skeleton className="h-5 w-[150px]" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <Skeleton className="h-10 w-full rounded-lg" />
                                        <Skeleton className="h-10 w-full rounded-lg" />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 w-full bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen text-zinc-900 dark:text-zinc-100">
            <div className="max-w-[1240px] px-8 py-10 mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
                {/* --- Header Section (Claude UI) --- */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 mt-4">
                    <div className="flex items-start gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(-1)}
                            className="text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/50 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 mt-1 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-serif font-medium text-zinc-900 dark:text-zinc-100 tracking-tight leading-none mb-2 flex items-center gap-3">
                                Stakeholder Registration
                                {formData.status_u_r && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-sans font-medium bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                                        {formData.status_u_r}
                                    </span>
                                )}
                            </h1>
                            <p className="text-sm font-sans text-zinc-500 dark:text-zinc-400 max-w-2xl">
                                {savedDocName
                                    ? `Editing universal registration document ${savedDocName}`
                                    : "Create a new universal registration profile."}
                            </p>
                        </div>
                    </div>

                    {/* <div className="flex items-center gap-3 self-start">
                        <Button
                            variant="outline"
                            onClick={() => navigate(-1)}
                            className="bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 shadow-sm transition-all text-sm font-medium dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                            Cancel
                        </Button>
                        {!isReadOnly && (
                            <Button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="bg-[#D97757] text-white hover:bg-[#C2654A] shadow-sm transition-all min-w-[100px] text-sm font-medium"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Save Registration
                                    </>
                                )}
                            </Button>
                        )}
                    </div> */}
                </div>

                {/* --- Main Application Form Card --- */}
                <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden bg-white dark:bg-zinc-900">
                    <CardHeader className="bg-[#FDFDFD] dark:bg-[#27272A] border-b border-zinc-100 dark:border-zinc-800 px-8 py-6">
                        <div className="flex items-center gap-2 mb-1">
                            <FileText className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                            <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-sans">
                                Registration Details
                            </CardTitle>
                        </div>
                        <CardDescription className="text-base text-zinc-700 text-red-600 dark:text-zinc-300 font-medium font-serif">
                            Please complete the form below only if the PI/Co-PI details are unavailable. Fields marked with a red asterisk (*) are mandatory.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="p-0">
                        <div className="p-8">
                            <DynamicFormRenderer
                                fields={filteredFields}
                                formData={formData}
                                onChange={handleFieldChange}
                                linkOptions={linkOptions}
                                readOnly={isReadOnly}
                                onFileChange={handleFileChange}
                                onTableRowChange={handleTableRowChange}
                                onTableFileChange={handleTableFileChange}
                                onAddTableRow={handleAddTableRow}
                                onDeleteTableRow={handleDeleteTableRow}
                                fieldMessages={
                                    emailStatus !== "idle"
                                        ? {
                                            email_address_u_r: {
                                                type:
                                                    emailStatus === "checking"
                                                        ? "loading"
                                                        : emailStatus === "available"
                                                            ? "success"
                                                            : emailStatus === "unavailable"
                                                                ? "error"
                                                                : "warning",
                                                message: emailMessage,
                                            },
                                        }
                                        : undefined
                                }
                            />
                        </div>

                        {/* Sticky Action Footer */}
                        {!isReadOnly && (
                            <div className="sticky bottom-0 border-t border-zinc-200 dark:border-zinc-800 bg-[#FDFDFD]/95 dark:bg-zinc-900/95 backdrop-blur-md px-8 py-5 flex items-center justify-between z-10 transition-all shadow-[0_-4px_24px_-12px_rgba(0,0,0,0.1)]">
                                {/* <div className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                                    <span className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-[#D97757]" />
                                        Registration in Draft Mode
                                    </span>
                                </div> */}
                                <div className="space-x-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => navigate(-1)}
                                        className="bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 font-medium transition-colors dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                    >
                                        Discard Changes
                                    </Button>
                                    <Button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="bg-[#D97757] text-white hover:bg-[#C2654A] font-medium shadow-sm transition-all min-w-[120px]"
                                    >
                                        {isSaving ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-4 w-4" />
                                                Save Information
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}