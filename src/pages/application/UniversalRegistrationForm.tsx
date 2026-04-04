import React, { useState, useEffect, useCallback } from "react";
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
import { ArrowLeft, Save, Loader2, FileText, CheckCircle2 } from "lucide-react";
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
        }

        // Set Fields
        setFields(fetchedFields || []);

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
  }, []);

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

  const is_personal = profile_type === "Individual / Personal";
  const is_org = profile_type === "Organization";
  const is_vendor = is_org && org_sub_type === "Vendor";
  const is_pi_copi = profile_type === "PI / Co-PI";

  // DEFAULT: HIDE EVERYTHING
  const sectionsToHide = new Set([
    // --- Sections ---
    "personal_information_section_u_r",
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
    // --- University Detail fields (shown for PI / Co-PI) ---
    "university_detail_u_r",
    "university_name_u_r",
    "university_address_u_r",
    "designation_u_r",
    "department_u_r",
    // --- Financial / Documents ---
    "uploaded_documents_u_r",
    "bank_details_u_r",
  ]);

  // PERSONAL FLOW
  if (is_personal) {
    sectionsToHide.delete("personal_information_section_u_r");
    sectionsToHide.delete("personal_history_section_u_r");
    sectionsToHide.delete("financial_and_documents_common_section_u_r");
    sectionsToHide.delete("full_name_u_r");
    sectionsToHide.delete("guardian_name_u_r");
    sectionsToHide.delete("dob_u_r");
    sectionsToHide.delete("gender_u_r");
    sectionsToHide.delete("nationality_u_r");
    sectionsToHide.delete("mobile_number_u_r");
    sectionsToHide.delete("email_address_u_r");
    sectionsToHide.delete("whatsapp_number_u_r");
    sectionsToHide.delete("same_as_mobile_number_u_r");
    sectionsToHide.delete("alternate_mobile_number_u_r");
    sectionsToHide.delete("address_details");
    sectionsToHide.delete("qualifications_u_r");
    sectionsToHide.delete("experiences_u_r");
    sectionsToHide.delete("uploaded_documents_u_r");
    sectionsToHide.delete("bank_details_u_r");
  }

  // PI / Co-PI FLOW
  if (is_pi_copi) {
    // Personal Details: Full Name*, Gender, Nationality
    sectionsToHide.delete("personal_information_section_u_r");
    sectionsToHide.delete("full_name_u_r");
    sectionsToHide.delete("gender_u_r");
    sectionsToHide.delete("nationality_u_r");
    // Contact Information: Mobile Number*, Email, WhatsApp No., Same as mobile checkbox
    sectionsToHide.delete("mobile_number_u_r");
    sectionsToHide.delete("email_address_u_r");
    sectionsToHide.delete("same_as_mobile_number_u_r");
    sectionsToHide.delete("whatsapp_number_u_r");
    // University Detail section
    sectionsToHide.delete("university_detail_u_r");
    sectionsToHide.delete("university_name_u_r");
    sectionsToHide.delete("university_address_u_r");
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

  const filteredFields = (fields || []).filter(
    (f: any) => !dynamicHiddenFields.includes(f.fieldname),
  );

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);

    try {
      // 1. Pre-flight Duplicate Check
      // Extract Email and ID Numbers
      const emailToCheck = formData.email_address_u_r;
      const idNumbersToCheck = (formData.uploaded_documents_u_r || [])
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
        ...formData,
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
            `Universal Registration saved successfully. (ID: ${message.docname})`,
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
                Universal Registration
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

          <div className="flex items-center gap-3 self-start">
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
          </div>
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
            <CardDescription className="text-base text-zinc-700 dark:text-zinc-300 font-medium font-serif">
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
              />
            </div>

            {/* Sticky Action Footer */}
            {!isReadOnly && (
              <div className="sticky bottom-0 border-t border-zinc-200 dark:border-zinc-800 bg-[#FDFDFD]/95 dark:bg-zinc-900/95 backdrop-blur-md px-8 py-5 flex items-center justify-between z-10 transition-all shadow-[0_-4px_24px_-12px_rgba(0,0,0,0.1)]">
                <div className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#D97757]" />
                    Registration in Draft Mode
                  </span>
                </div>
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
