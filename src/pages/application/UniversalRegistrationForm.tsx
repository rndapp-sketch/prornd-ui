

// -=======================================================

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFrappePostCall } from "frappe-react-sdk";
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
    const [step, setStep] = useState<'instructions' | 'form'>(id ? 'form' : 'instructions');

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
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        (window as any).__permDefaultRows = permField.defaultRows;
                        (window as any).__currDefaultRows = currField.defaultRows;
                        (window as any).__addrTypeFieldname = typeField?.fieldname;
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
                            f.autoAddFirstRow = 1;
                        }
                        if (f.fieldname === "qualifications_u_r") {
                            f.autoAddFirstRow = 1;
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

                // Set Link Options with fallback for nationality
                const processedLinkOptions = link_options || {};
                if (!processedLinkOptions.nationality_u_r) {
                    processedLinkOptions.nationality_u_r = [
                        { value: "India", label: "India" },
                        { value: "Afghanistan", label: "Afghanistan" },
                        { value: "Albania", label: "Albania" },
                        { value: "Algeria", label: "Algeria" },
                        { value: "Andorra", label: "Andorra" },
                        { value: "Angola", label: "Angola" },
                        { value: "Argentina", label: "Argentina" },
                        { value: "Australia", label: "Australia" },
                        { value: "Austria", label: "Austria" },
                        { value: "Azerbaijan", label: "Azerbaijan" },
                        { value: "Bahamas", label: "Bahamas" },
                        { value: "Bahrain", label: "Bahrain" },
                        { value: "Bangladesh", label: "Bangladesh" },
                        { value: "Barbados", label: "Barbados" },
                        { value: "Belarus", label: "Belarus" },
                        { value: "Belgium", label: "Belgium" },
                        { value: "Belize", label: "Belize" },
                        { value: "Benin", label: "Benin" },
                        { value: "Bhutan", label: "Bhutan" },
                        { value: "Bolivia", label: "Bolivia" },
                        { value: "Bosnia and Herzegovina", label: "Bosnia and Herzegovina" },
                        { value: "Botswana", label: "Botswana" },
                        { value: "Brazil", label: "Brazil" },
                        { value: "Brunei", label: "Brunei" },
                        { value: "Bulgaria", label: "Bulgaria" },
                        { value: "Burkina Faso", label: "Burkina Faso" },
                        { value: "Burundi", label: "Burundi" },
                        { value: "Cambodia", label: "Cambodia" },
                        { value: "Cameroon", label: "Cameroon" },
                        { value: "Canada", label: "Canada" },
                        { value: "Cape Verde", label: "Cape Verde" },
                        { value: "Central African Republic", label: "Central African Republic" },
                        { value: "Chad", label: "Chad" },
                        { value: "Chile", label: "Chile" },
                        { value: "China", label: "China" },
                        { value: "Colombia", label: "Colombia" },
                        { value: "Comoros", label: "Comoros" },
                        { value: "Congo", label: "Congo" },
                        { value: "Costa Rica", label: "Costa Rica" },
                        { value: "Croatia", label: "Croatia" },
                        { value: "Cuba", label: "Cuba" },
                        { value: "Cyprus", label: "Cyprus" },
                        { value: "Czech Republic", label: "Czech Republic" },
                        { value: "Denmark", label: "Denmark" },
                        { value: "Djibouti", label: "Djibouti" },
                        { value: "Dominica", label: "Dominica" },
                        { value: "Dominican Republic", label: "Dominican Republic" },
                        { value: "East Timor", label: "East Timor" },
                        { value: "Ecuador", label: "Ecuador" },
                        { value: "Egypt", label: "Egypt" },
                        { value: "El Salvador", label: "El Salvador" },
                        { value: "Equatorial Guinea", label: "Equatorial Guinea" },
                        { value: "Eritrea", label: "Eritrea" },
                        { value: "Estonia", label: "Estonia" },
                        { value: "Ethiopia", label: "Ethiopia" },
                        { value: "Fiji", label: "Fiji" },
                        { value: "Finland", label: "Finland" },
                        { value: "France", label: "France" },
                        { value: "Gabon", label: "Gabon" },
                        { value: "Gambia", label: "Gambia" },
                        { value: "Georgia", label: "Georgia" },
                        { value: "Germany", label: "Germany" },
                        { value: "Ghana", label: "Ghana" },
                        { value: "Greece", label: "Greece" },
                        { value: "Grenada", label: "Grenada" },
                        { value: "Guatemala", label: "Guatemala" },
                        { value: "Guinea", label: "Guinea" },
                        { value: "Guinea-Bissau", label: "Guinea-Bissau" },
                        { value: "Guyana", label: "Guyana" },
                        { value: "Haiti", label: "Haiti" },
                        { value: "Honduras", label: "Honduras" },
                        { value: "Hungary", label: "Hungary" },
                        { value: "Iceland", label: "Iceland" },
                        { value: "Indonesia", label: "Indonesia" },
                        { value: "Iran", label: "Iran" },
                        { value: "Iraq", label: "Iraq" },
                        { value: "Ireland", label: "Ireland" },
                        { value: "Israel", label: "Israel" },
                        { value: "Italy", label: "Italy" },
                        { value: "Jamaica", label: "Jamaica" },
                        { value: "Japan", label: "Japan" },
                        { value: "Jordan", label: "Jordan" },
                        { value: "Kazakhstan", label: "Kazakhstan" },
                        { value: "Kenya", label: "Kenya" },
                        { value: "Kiribati", label: "Kiribati" },
                        { value: "Kosovo", label: "Kosovo" },
                        { value: "Kuwait", label: "Kuwait" },
                        { value: "Kyrgyzstan", label: "Kyrgyzstan" },
                        { value: "Laos", label: "Laos" },
                        { value: "Latvia", label: "Latvia" },
                        { value: "Lebanon", label: "Lebanon" },
                        { value: "Lesotho", label: "Lesotho" },
                        { value: "Liberia", label: "Liberia" },
                        { value: "Libya", label: "Libya" },
                        { value: "Liechtenstein", label: "Liechtenstein" },
                        { value: "Lithuania", label: "Lithuania" },
                        { value: "Luxembourg", label: "Luxembourg" },
                        { value: "Madagascar", label: "Madagascar" },
                        { value: "Malawi", label: "Malawi" },
                        { value: "Malaysia", label: "Malaysia" },
                        { value: "Maldives", label: "Maldives" },
                        { value: "Mali", label: "Mali" },
                        { value: "Malta", label: "Malta" },
                        { value: "Marshall Islands", label: "Marshall Islands" },
                        { value: "Mauritania", label: "Mauritania" },
                        { value: "Mauritius", label: "Mauritius" },
                        { value: "Mexico", label: "Mexico" },
                        { value: "Micronesia", label: "Micronesia" },
                        { value: "Moldova", label: "Moldova" },
                        { value: "Monaco", label: "Monaco" },
                        { value: "Mongolia", label: "Mongolia" },
                        { value: "Montenegro", label: "Montenegro" },
                        { value: "Morocco", label: "Morocco" },
                        { value: "Mozambique", label: "Mozambique" },
                        { value: "Myanmar", label: "Myanmar" },
                        { value: "Namibia", label: "Namibia" },
                        { value: "Nauru", label: "Nauru" },
                        { value: "Nepal", label: "Nepal" },
                        { value: "Netherlands", label: "Netherlands" },
                        { value: "New Zealand", label: "New Zealand" },
                        { value: "Nicaragua", label: "Nicaragua" },
                        { value: "Niger", label: "Niger" },
                        { value: "Nigeria", label: "Nigeria" },
                        { value: "North Korea", label: "North Korea" },
                        { value: "North Macedonia", label: "North Macedonia" },
                        { value: "Norway", label: "Norway" },
                        { value: "Oman", label: "Oman" },
                        { value: "Pakistan", label: "Pakistan" },
                        { value: "Palau", label: "Palau" },
                        { value: "Palestine", label: "Palestine" },
                        { value: "Panama", label: "Panama" },
                        { value: "Papua New Guinea", label: "Papua New Guinea" },
                        { value: "Paraguay", label: "Paraguay" },
                        { value: "Peru", label: "Peru" },
                        { value: "Philippines", label: "Philippines" },
                        { value: "Poland", label: "Poland" },
                        { value: "Portugal", label: "Portugal" },
                        { value: "Qatar", label: "Qatar" },
                        { value: "Romania", label: "Romania" },
                        { value: "Russia", label: "Russia" },
                        { value: "Rwanda", label: "Rwanda" },
                        { value: "Saint Kitts and Nevis", label: "Saint Kitts and Nevis" },
                        { value: "Saint Lucia", label: "Saint Lucia" },
                        { value: "Saint Vincent and the Grenadines", label: "Saint Vincent and the Grenadines" },
                        { value: "Samoa", label: "Samoa" },
                        { value: "San Marino", label: "San Marino" },
                        { value: "Sao Tome and Principe", label: "Sao Tome and Principe" },
                        { value: "Saudi Arabia", label: "Saudi Arabia" },
                        { value: "Senegal", label: "Senegal" },
                        { value: "Serbia", label: "Serbia" },
                        { value: "Seychelles", label: "Seychelles" },
                        { value: "Sierra Leone", label: "Sierra Leone" },
                        { value: "Singapore", label: "Singapore" },
                        { value: "Slovakia", label: "Slovakia" },
                        { value: "Slovenia", label: "Slovenia" },
                        { value: "Solomon Islands", label: "Solomon Islands" },
                        { value: "Somalia", label: "Somalia" },
                        { value: "South Africa", label: "South Africa" },
                        { value: "South Korea", label: "South Korea" },
                        { value: "South Sudan", label: "South Sudan" },
                        { value: "Spain", label: "Spain" },
                        { value: "Sri Lanka", label: "Sri Lanka" },
                        { value: "Sudan", label: "Sudan" },
                        { value: "Suriname", label: "Suriname" },
                        { value: "Sweden", label: "Sweden" },
                        { value: "Switzerland", label: "Switzerland" },
                        { value: "Syria", label: "Syria" },
                        { value: "Taiwan", label: "Taiwan" },
                        { value: "Tajikistan", label: "Tajikistan" },
                        { value: "Tanzania", label: "Tanzania" },
                        { value: "Thailand", label: "Thailand" },
                        { value: "Timor-Leste", label: "Timor-Leste" },
                        { value: "Togo", label: "Togo" },
                        { value: "Tonga", label: "Tonga" },
                        { value: "Trinidad and Tobago", label: "Trinidad and Tobago" },
                        { value: "Tunisia", label: "Tunisia" },
                        { value: "Turkey", label: "Turkey" },
                        { value: "Turkmenistan", label: "Turkmenistan" },
                        { value: "Tuvalu", label: "Tuvalu" },
                        { value: "Uganda", label: "Uganda" },
                        { value: "Ukraine", label: "Ukraine" },
                        { value: "United Arab Emirates", label: "United Arab Emirates" },
                        { value: "United Kingdom", label: "United Kingdom" },
                        { value: "United States", label: "United States" },
                        { value: "Uruguay", label: "Uruguay" },
                        { value: "Uzbekistan", label: "Uzbekistan" },
                        { value: "Vanuatu", label: "Vanuatu" },
                        { value: "Vatican City", label: "Vatican City" },
                        { value: "Venezuela", label: "Venezuela" },
                        { value: "Vietnam", label: "Vietnam" },
                        { value: "Yemen", label: "Yemen" },
                        { value: "Zambia", label: "Zambia" },
                        { value: "Zimbabwe", label: "Zimbabwe" },
                    ];
                }
                setLinkOptions(processedLinkOptions);

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

                // Restore from Draft if exists
                const draftKey = savedDocName ? `universal_reg_draft_${savedDocName}` : 'universal_reg_draft_new';
                const draftStr = localStorage.getItem(draftKey);
                if (draftStr) {
                    try {
                        const parsedDraft = JSON.parse(draftStr);
                        initialData = { ...initialData, ...parsedDraft };
                    } catch (e) {
                        console.error("Failed to parse draft", e);
                    }
                }

                // Pre-fill address type rows and always enforce the read-only type value
                const tf = (window as any).__addrTypeFieldname;
                if (tf) {
                    // Permanent address — create row if missing, always stamp the type
                    if (!initialData.permanent_address_custom || initialData.permanent_address_custom.length === 0) {
                        initialData.permanent_address_custom = [{ [tf]: "Permanent" }];
                    } else {
                        initialData.permanent_address_custom = initialData.permanent_address_custom.map((row: any, i: number) =>
                            i === 0 ? { ...row, [tf]: "Permanent" } : row
                        );
                    }
                    // Present address — create row if missing, always stamp the type
                    if (!initialData.current_address_custom || initialData.current_address_custom.length === 0) {
                        initialData.current_address_custom = [{ [tf]: "Present" }];
                    } else {
                        initialData.current_address_custom = initialData.current_address_custom.map((row: any, i: number) =>
                            i === 0 ? { ...row, [tf]: "Present" } : row
                        );
                    }
                    // Org Permanent address
                    if (initialData.org_permanent_address_custom && initialData.org_permanent_address_custom.length > 0) {
                        initialData.org_permanent_address_custom = initialData.org_permanent_address_custom.map((row: any, i: number) =>
                            i === 0 ? { ...row, [tf]: "Permanent" } : row
                        );
                    }
                    // Org Present address
                    if (initialData.org_current_address_custom && initialData.org_current_address_custom.length > 0) {
                        initialData.org_current_address_custom = initialData.org_current_address_custom.map((row: any, i: number) =>
                            i === 0 ? { ...row, [tf]: "Present" } : row
                        );
                    }
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

    // Save draft to localStorage whenever formData changes
    useEffect(() => {
        if (!isLoadingFields && Object.keys(formData).length > 0 && formData.docstatus !== 1 && formData.docstatus !== 2) {
            const draftKey = savedDocName ? `universal_reg_draft_${savedDocName}` : 'universal_reg_draft_new';
            const replacer = (_key: string, value: any) => {
                if (value instanceof File) return undefined;
                return value;
            };
            localStorage.setItem(draftKey, JSON.stringify(formData, replacer));
        }
    }, [formData, savedDocName, isLoadingFields]);

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
                    const draftKey = savedDocName ? `universal_reg_draft_${savedDocName}` : 'universal_reg_draft_new';
                    localStorage.removeItem(draftKey);

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
                <div className="max-w-[1240px] px-6 md:px-8 py-8 md:py-10 mx-auto">
                    <div className="flex items-center gap-4 mb-8">
                        <Skeleton className="h-9 w-9 rounded-lg" />
                        <div className="space-y-2">
                            <Skeleton className="h-7 w-[250px] rounded-xl" />
                            <Skeleton className="h-3.5 w-[200px] rounded-lg" />
                        </div>
                    </div>
                    <div className="bg-white dark:bg-[#27272A] border-[1.5px] border-[#D4D4D8] dark:border-[#52525B] rounded-2xl shadow-sm overflow-hidden">
                        <div className="section-header-lg">
                            <Skeleton className="h-5 w-[200px]" />
                        </div>
                        <div className="p-8 space-y-8">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="space-y-4">
                                    <Skeleton className="h-4 w-[150px] rounded-lg" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <Skeleton className="h-10 w-full rounded-[0.4375rem]" />
                                        <Skeleton className="h-10 w-full rounded-[0.4375rem]" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Step 1: Instructions screen ─────────────────────────────────────────
    if (step === 'instructions') {
        return (
            <div className="flex-1 w-full bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen text-[#3F3F46] dark:text-[#E4E4E7]">
                <div className="max-w-[1240px] px-6 md:px-8 py-8 md:py-10 mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
                    {/* Back + Title */}
                    <div className="flex items-start gap-4 mb-8 mt-4">
                        <button onClick={() => navigate(-1)}
                            className="mt-0.5 p-1.5 rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A] hover:bg-[#EFF6FF] dark:hover:bg-[#2563EB]/10 hover:border-[#2563EB]/40 transition-all flex-shrink-0">
                            <ArrowLeft className="h-4 w-4 text-[#2563EB] dark:text-[#60A5FA]" />
                        </button>
                        <div>
                            <h1 className="text-[22px] font-extrabold tracking-[-0.02em] text-[#3F3F46] dark:text-[#E4E4E7] leading-tight mb-1">
                                Stakeholder Registration
                            </h1>
                            <p className="text-[12px] text-[#71717A] dark:text-[#A1A1AA] font-medium">
                                Register as a new stakeholder to participate in research projects.
                            </p>
                        </div>
                    </div>

                    {/* Instructions Card */}
                    <div className="bg-white dark:bg-[#27272A] border-[1.5px] border-[#D4D4D8] dark:border-[#52525B] rounded-2xl shadow-sm overflow-hidden">
                        {/* Card header accent */}
                        <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-transparent" />
                        {/* Section header */}
                        <div className="section-header-lg">
                            <div className="section-header-lg-accent" />
                            <div className="section-header-lg-icon">
                                <FileText className="h-4 w-4" />
                            </div>
                            <div>
                                <div className="section-header-lg-title">Registration Instructions</div>
                                <div className="section-header-lg-subtitle">How to Register — Please follow the steps below</div>
                            </div>
                        </div>

                        <div className="px-8 py-7">
                            <ol className="space-y-6">
                                {/* Step 1 */}
                                <li className="flex gap-4">
                                    <span className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#EEF2FF] dark:bg-[#4A6CF7]/20 text-[#4A6CF7] dark:text-[#818CF8] font-extrabold text-[12px] mt-0.5 border border-[#C7D2FE] dark:border-[#4A6CF7]/30">1</span>
                                    <div className="text-[13px] text-[#52525B] dark:text-[#A1A1AA] leading-relaxed">
                                        <strong className="text-[#27272A] dark:text-[#E4E4E7] block mb-1 font-bold">Select your Profile Type</strong>
                                        Choose the category that best describes you:
                                        <ul className="mt-3 ml-1 space-y-3">
                                            {/* Individual */}
                                            <li className="rounded-xl border-[1.5px] border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B]/60 p-4">
                                                <div className="flex gap-2 mb-1.5">
                                                    <span className="text-[#4A6CF7] font-extrabold mt-0.5">•</span>
                                                    <strong className="text-[#27272A] dark:text-[#E4E4E7] text-[13px]">Individual (For Honorarium)</strong>
                                                </div>
                                                <p className="ml-4 text-[#71717A] dark:text-[#A1A1AA] mb-2 text-[12px]">For individuals invited to participate in academic or research activities who will receive honorarium payments.</p>
                                                <ul className="ml-4 space-y-1 text-[#71717A] dark:text-[#A1A1AA] text-[12px]">
                                                    <li className="flex gap-1.5"><span className="text-[#A1A1AA]">–</span> Guest lecturers, keynote speakers, workshop facilitators</li>
                                                    <li className="flex gap-1.5"><span className="text-[#A1A1AA]">–</span> External subject-matter experts, consultants, or reviewers</li>
                                                    <li className="flex gap-1.5"><span className="text-[#A1A1AA]">–</span> Jury members, evaluators, or examiners</li>
                                                    <li className="flex gap-1.5"><span className="text-[#A1A1AA]">–</span> <span><strong className="text-[#52525B] dark:text-[#D4D4D8]">Required documents:</strong> Aadhaar Card + PAN Card (Indian nationals) or valid government-issued ID (foreign nationals), bank account details for payment.</span></li>
                                                </ul>
                                            </li>

                                            {/* PI / Co-PI External */}
                                            <li className="rounded-xl border-[1.5px] border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B]/60 p-4">
                                                <div className="flex gap-2 mb-1.5">
                                                    <span className="text-[#4A6CF7] font-extrabold mt-0.5">•</span>
                                                    <strong className="text-[#27272A] dark:text-[#E4E4E7] text-[13px]">PI / Co-PI (External only)</strong>
                                                </div>
                                                <p className="ml-4 text-[#71717A] dark:text-[#A1A1AA] mb-2 text-[12px]">For Principal Investigators or Co-Principal Investigators employed at another institute/university collaborating on a research project registered at this institution.</p>
                                                <ul className="ml-4 space-y-1 text-[#71717A] dark:text-[#A1A1AA] text-[12px]">
                                                    <li className="flex gap-1.5"><span className="text-[#A1A1AA]">–</span> Faculty members or researchers from other universities/institutes</li>
                                                    <li className="flex gap-1.5"><span className="text-[#A1A1AA]">–</span> Scientists from government labs or research organisations (e.g., CSIR, DRDO, ISRO)</li>
                                                    <li className="flex gap-1.5"><span className="text-[#A1A1AA]">–</span> International collaborators holding a PI/Co-PI role on a funded project</li>
                                                    <li className="flex gap-1.5"><span className="text-[#A1A1AA]">–</span> <span><strong className="text-[#52525B] dark:text-[#D4D4D8]">Required documents:</strong> Aadhaar Card + PAN Card (Indian nationals) or valid government-issued ID (foreign nationals), institutional affiliation details, bank account details.</span></li>
                                                </ul>
                                            </li>
                                        </ul>
                                    </div>
                                </li>

                                {/* Step 2 */}
                                <li className="flex gap-4">
                                    <span className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#EEF2FF] dark:bg-[#4A6CF7]/20 text-[#4A6CF7] dark:text-[#818CF8] font-extrabold text-[12px] mt-0.5 border border-[#C7D2FE] dark:border-[#4A6CF7]/30">2</span>
                                    <div className="text-[13px] text-[#52525B] dark:text-[#A1A1AA] leading-relaxed">
                                        <strong className="text-[#27272A] dark:text-[#E4E4E7] block mb-1 font-bold">Fill in the required details</strong>
                                        Complete all fields marked with a red asterisk <span className="text-red-500 font-bold">*</span>. These are mandatory for successful registration.
                                    </div>
                                </li>

                                {/* Step 3 */}
                                <li className="flex gap-4">
                                    <span className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#EEF2FF] dark:bg-[#4A6CF7]/20 text-[#4A6CF7] dark:text-[#818CF8] font-extrabold text-[12px] mt-0.5 border border-[#C7D2FE] dark:border-[#4A6CF7]/30">3</span>
                                    <div className="text-[13px] text-[#52525B] dark:text-[#A1A1AA] leading-relaxed">
                                        <strong className="text-[#27272A] dark:text-[#E4E4E7] block mb-1 font-bold">Upload supporting documents</strong>
                                        Attach required identification documents — Aadhaar &amp; PAN for Indian nationals, or a valid government-issued ID for foreign nationals.
                                    </div>
                                </li>

                                {/* Step 4 */}
                                <li className="flex gap-4">
                                    <span className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#EEF2FF] dark:bg-[#4A6CF7]/20 text-[#4A6CF7] dark:text-[#818CF8] font-extrabold text-[12px] mt-0.5 border border-[#C7D2FE] dark:border-[#4A6CF7]/30">4</span>
                                    <div className="text-[13px] text-[#52525B] dark:text-[#A1A1AA] leading-relaxed">
                                        <strong className="text-[#27272A] dark:text-[#E4E4E7] block mb-1 font-bold">Submit your registration</strong>
                                        Once all details are filled, click the <strong className="text-[#4A6CF7]">Save &amp; Submit</strong> button at the bottom of the form to complete your registration.
                                    </div>
                                </li>
                            </ol>

                            {/* CTA */}
                            <div className="mt-8 pt-6 border-t border-[#E4E4E7] dark:border-[#3F3F46] flex justify-end">
                                <button
                                    onClick={() => setStep('form')}
                                    disabled={isLoadingFields}
                                    className="btn-primary-accent disabled:opacity-50"
                                >
                                    {isLoadingFields ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Loading Form...
                                        </>
                                    ) : (
                                        <>
                                            Next: Start Registration
                                            <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Step 2: The Registration Form ────────────────────────────────────────
    return (
        <div className="flex-1 w-full bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen text-[#3F3F46] dark:text-[#E4E4E7]">
            <div className="max-w-[1240px] px-6 md:px-8 py-8 md:py-10 mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
                {/* --- Header Section --- */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 mt-4">
                    <div className="flex items-start gap-4">
                        <button
                            onClick={() => setStep('instructions')}
                            className="mt-0.5 p-1.5 rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A] hover:bg-[#EFF6FF] dark:hover:bg-[#2563EB]/10 hover:border-[#2563EB]/40 transition-all flex-shrink-0"
                        >
                            <ArrowLeft className="h-4 w-4 text-[#2563EB] dark:text-[#60A5FA]" />
                        </button>
                        <div>
                            <h1 className="text-[22px] font-extrabold tracking-[-0.02em] text-[#3F3F46] dark:text-[#E4E4E7] leading-tight mb-1 flex items-center gap-3">
                                Stakeholder Registration
                                {formData.status_u_r && (
                                    <span className="status-progress text-[9px]">
                                        {formData.status_u_r}
                                    </span>
                                )}
                            </h1>
                            <p className="text-[12px] text-[#71717A] dark:text-[#A1A1AA] font-medium max-w-2xl">
                                {savedDocName
                                    ? `Editing universal registration document ${savedDocName}`
                                    : "Select your profile type below, then fill in the required details."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* --- Main Application Form Card --- */}
                <div className="bg-white dark:bg-[#27272A] border-[1.5px] border-[#D4D4D8] dark:border-[#52525B] rounded-2xl shadow-sm overflow-visible">
                    {/* Card header accent */}
                    <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-transparent" />
                    {/* Section header */}
                    <div className="section-header-lg">
                        <div className="section-header-lg-accent" />
                        <div className="section-header-lg-icon">
                            <FileText className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="section-header-lg-title">Registration Details</div>
                            <div className="section-header-lg-subtitle">
                                Fields marked with a red asterisk <span className="text-red-500">*</span> are mandatory.
                            </div>
                        </div>
                    </div>

                    <div className="p-0">
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
                            <div className="form-action-bar">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => {
                                            const draftKey = savedDocName ? `universal_reg_draft_${savedDocName}` : 'universal_reg_draft_new';
                                            localStorage.removeItem(draftKey);
                                            navigate(-1);
                                        }}
                                        className="btn-neutral"
                                    >
                                        Clear Draft
                                    </button>
                                </div>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="btn-primary-accent disabled:opacity-50"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-3.5 w-3.5" />
                                            Save & Submit
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
