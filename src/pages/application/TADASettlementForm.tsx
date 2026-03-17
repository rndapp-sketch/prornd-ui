import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppSidebar } from "@/components/RndSidebar";
import { useFrappePostCall, useFrappeAuth } from "frappe-react-sdk";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import {
  DynamicFormRenderer,
  type FormField,
  type LinkOption,
} from "@/components/forms/DynamicFormRenderer";
import {
  tadaAPI,
  prepareFormDataForApi,
  commonAPI,
} from "@/services/apiService";
import TADASettlementActionButtons from "@/components/TADASettlementActionButtons";

// --- TYPE DEFINITIONS ---
interface FormDataResponse {
  message: {
    fields: FormField[];
    link_options: Record<string, LinkOption[]>;
    prefill_data: Record<string, any>;
  };
}

// --- STYLES & REUSABLE UI COMPONENTS ---
const FrappeCard = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "bg-white dark:bg-zinc-900 p-6 md:p-8 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm",
      className,
    )}
  >
    {children}
  </div>
);

const FrappeButton = ({
  children,
  onClick,
  disabled,
  className,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-150",
      "focus:outline-none focus:ring-2 focus:ring-[#D97757]/20",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      className,
    )}
  >
    {children}
  </button>
);

// --- MAIN COMPONENT ---
const TADASettlementForm: React.FC = () => {
  const { currentUser } = useFrappeAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectName = searchParams.get("project") || "";
  const travelRef = searchParams.get("travel_ref") || "";
  const editDocName = searchParams.get("edit") || "";

  const [fields, setFields] = useState<FormField[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // --- API HOOKS ---
  const {
    call: fetchFormData,
    result: formDataResult,
    error: formDataError,
  } = useFrappePostCall<FormDataResponse>(tadaAPI.getFields);
  const { call: saveForm, error: saveError } = useFrappePostCall(tadaAPI.save);
  const { call: submitForm, error: submitError } = useFrappePostCall(
    tadaAPI.submit,
  );
  const { call: fetchExistingDoc } = useFrappePostCall<{ message: any }>(
    "frappe.client.get",
  );
  const { call: fetchTravelDetails } = useFrappePostCall<{ message: any }>(
    "frappe.client.get",
  );
  const { call: fetchUserDetailsByEmail } = useFrappePostCall<{ message: any }>(
    commonAPI.getUserDetailsByEmail,
  );
  const { call: fetchDepartmentDoc } = useFrappePostCall<{
    message: { dept_name: string };
  }>("frappe.client.get");

  // --- DATA FETCHING ---
  useEffect(() => {
    if (!dataLoaded) {
      fetchFormData({
        doc_name: editDocName || null,
        project_name: projectName || null,
        // Do not pass travel_ref to the backend fields fetch if it's a new form
        // because it forcefully fetches and overwrites the form with existing records.
        // We handle mapping `travel_ref` manually below.
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper: resolve department ID to department name
  const resolveDepartmentName = async (deptId: string): Promise<string> => {
    if (!deptId) return "";
    try {
      const deptResult = await fetchDepartmentDoc({
        doctype: "Department_prornd",
        name: deptId,
      });
      if (deptResult?.message?.dept_name) {
        return deptResult.message.dept_name;
      }
    } catch (e) {
      console.error("Failed to fetch department name for ID:", deptId, e);
    }
    return deptId; // fallback to the ID if resolution fails
  };

  // Helper: fetch user details by email and map to form fields
  const fetchAndMapUserDetails = async (
    email: string,
    currentData: Record<string, any>,
  ) => {
    try {
      const result = await fetchUserDetailsByEmail({ user_email: email });
      if (result?.message) {
        const user = result.message;

        // Resolve department name
        let deptName = user?.department_name || "";
        if (!deptName && user?.department) {
          deptName = await resolveDepartmentName(user.department);
        }

        return {
          ...currentData,
          ta_da_name: user?.full_name || currentData.ta_da_name || "",
          webmail_id: email,
          ta_da_designation:
            user?.designation_name ||
            user?.designation ||
            currentData.ta_da_designation ||
            "",
          ta_da_department_section:
            deptName || currentData.ta_da_department_section || "",
          ta_da_employee_number:
            user?.employee_id || currentData.ta_da_employee_number || "",
        };
      }
    } catch (err) {
      console.error("Failed to fetch user details:", err);
    }
    return currentData;
  };

  useEffect(() => {
    const loadFormAndDocument = async () => {
      if (formDataResult?.message && !dataLoaded) {
        const {
          fields: apiFields,
          prefill_data,
          link_options,
        } = formDataResult.message;
        setFields(apiFields || []);
        setLinkOptions(link_options || {});

        let initialData = { ...prefill_data };

        // If editing, fetch existing document data
        if (editDocName) {
          try {
            const existingDoc = await fetchExistingDoc({
              doctype: "TA DA Settlement",
              name: editDocName,
            });

            if (existingDoc?.message) {
              initialData = { ...initialData, ...existingDoc.message };
            }
          } catch (err) {
            console.error("Error fetching existing document:", err);
            alert("Failed to load document for editing");
          }
        }

        // If project is passed via URL
        if (projectName && !initialData.project_no) {
          initialData.project_name = projectName;
          initialData.ta_da_project_code = projectName;
          initialData.project_no = projectName;
        }

        if (travelRef && !editDocName) {
          initialData.ta_da_travel_application = travelRef;
          try {
            const travelResult = await fetchTravelDetails({
              doctype: "Travel",
              name: travelRef,
            });

            if (travelResult?.message) {
              const travelDoc = travelResult.message;

              // Map all requested fields from Travel to TA DA Settlement
              initialData.ta_da_purpose_of_journey =
                travelDoc.purpose_of_journey_travel ||
                travelDoc.purpose_of_journey ||
                travelDoc.purpose ||
                "";
              initialData.ta_da_bank_account_holder =
                travelDoc.bank_account_holder_name_travel ||
                travelDoc.bank_account_holder ||
                "";
              initialData.ta_da_bank_account_number =
                travelDoc.bank_account_number_travel ||
                travelDoc.bank_account_number ||
                "";
              initialData.project_no =
                projectName ||
                initialData.project_no ||
                travelDoc.travel_project_number;

              if (travelDoc.webmail_id_travel) {
                // Full fetch for user fields
                const userMapped = await fetchAndMapUserDetails(
                  travelDoc.webmail_id_travel,
                  {
                    ta_da_project_code:
                      projectName || travelDoc.travel_project_number || "",
                  },
                );
                initialData = { ...initialData, ...userMapped };
              } else {
                // Fallback mapping
                let deptName = travelDoc.department_travel || "";
                if (deptName) deptName = await resolveDepartmentName(deptName);

                initialData.ta_da_name = travelDoc.applicant_name_travel || "";
                initialData.ta_da_designation =
                  travelDoc.designation_travel || "";
                initialData.ta_da_department_section = deptName;
                initialData.ta_da_project_code =
                  projectName || travelDoc.travel_project_number || "";
              }
            }
          } catch (err) {
            console.error(
              "Failed to automatically prefill from Travel details:",
              err,
            );
          }
        }

        // The backend already prefills data when travel_ref is passed.
        // We just need to resolve the department ID to a name.
        if (initialData.ta_da_department_section) {
          const resolvedDept = await resolveDepartmentName(
            initialData.ta_da_department_section,
          );
          initialData.ta_da_department_section = resolvedDept;
        }

        // If NO travel ref and NOT editing, prefill for current user
        if (!travelRef && !editDocName && currentUser) {
          initialData = await fetchAndMapUserDetails(currentUser, initialData);
        }

        // Set defaults for any missing fields
        (apiFields || []).forEach((field: FormField) => {
          if (
            initialData[field.fieldname] === undefined &&
            field.default !== undefined
          ) {
            initialData[field.fieldname] = field.default;
          }
        });

        setFormData(initialData);
        setDataLoaded(true);
        setLoading(false);
      }
      if (formDataError) {
        console.error("Failed to load form data:", formDataError);
        alert("Error: Could not load the TA DA Settlement form.");
        setLoading(false);
      }
    };

    loadFormAndDocument();
  }, [
    formDataResult,
    formDataError,
    editDocName,
    fetchExistingDoc,
    projectName,
    travelRef,
    dataLoaded,
    currentUser,
    fetchUserDetailsByEmail,
    fetchDepartmentDoc,
  ]);

  // --- CALCULATE TOTALS ---
  useEffect(() => {
    // Calculate net claimed amount
    const totalClaimed = parseFloat(formData.total_claimed || 0);
    const advanceTaken = parseFloat(formData.advance_taken || 0);
    const netClaimed = totalClaimed - advanceTaken;

    if (formData.net_claimed !== netClaimed) {
      setFormData((prev) => ({
        ...prev,
        net_claimed: netClaimed,
      }));
    }
  }, [formData.total_claimed, formData.advance_taken]);

  // --- EVENT HANDLERS ---
  const handleChange = useCallback((fieldname: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldname]: value }));
  }, []);

  const handleFileChange = useCallback(
    (fieldname: string, file: File | null) => {
      setFormData((prev) => ({ ...prev, [fieldname]: file }));
    },
    [],
  );

  const handleFieldChangeWithSideEffects = useCallback(
    async (fieldname: string, value: any) => {
      handleChange(fieldname, value);

      if (fieldname === "ta_da_travel_application" && value) {
        try {
          const result = await fetchTravelDetails({
            doctype: "Travel",
            name: value,
          });

          if (result?.message) {
            const travelDoc = result.message;

            if (travelDoc.webmail_id_travel) {
              // Use the robust fetcher to get user details + resolved department
              const userMapped = await fetchAndMapUserDetails(
                travelDoc.webmail_id_travel,
                {
                  ta_da_project_code: travelDoc.travel_project_number || "",
                },
              );
              setFormData((prev) => ({
                ...prev,
                [fieldname]: value,
                ...userMapped,
              }));
            } else {
              // Fallback: resolve department from Travel doc's department ID
              let deptName = travelDoc.department_travel || "";
              if (deptName) {
                deptName = await resolveDepartmentName(deptName);
              }
              setFormData((prev) => ({
                ...prev,
                [fieldname]: value,
                ta_da_name: travelDoc.applicant_name_travel || "",
                ta_da_designation: travelDoc.designation_travel || "",
                ta_da_department_section: deptName,
                ta_da_project_code: travelDoc.travel_project_number || "",
              }));
            }
          }
        } catch (err) {
          console.error("Failed to fetch travel details:", err);
        }
      }
    },
    [
      handleChange,
      fetchTravelDetails,
      fetchAndMapUserDetails,
      resolveDepartmentName,
    ],
  );

  const handleTableRowChange = useCallback(
    (tableName: string, rowIndex: number, fieldname: string, value: any) => {
      setFormData((prev) => {
        const table = [...(prev[tableName] || [])];
        table[rowIndex] = { ...table[rowIndex], [fieldname]: value };

        // Calculate row total if amount field changes
        if (fieldname === "amount" || fieldname === "quantity") {
          const row = table[rowIndex];
          const amount = parseFloat(row.amount || 0);
          const quantity = parseFloat(row.quantity || 1);
          table[rowIndex].total = amount * quantity;
        }

        // Calculate table total
        const tableTotal = table.reduce(
          (sum, row) => sum + parseFloat(row.total || row.amount || 0),
          0,
        );

        return {
          ...prev,
          [tableName]: table,
          // Update total claimed if this is the expenses table
          ...(tableName === "ta_da_other_expenses_p"
            ? { total_claimed: tableTotal }
            : {}),
        };
      });
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
        const table = [...(prev[tableName] || [])];
        table[rowIndex] = { ...table[rowIndex], [fieldname]: file };
        return { ...prev, [tableName]: table };
      });
    },
    [],
  );

  const addTableRow = useCallback(
    (tableName: string, newRow: Record<string, any>) => {
      setFormData((prev) => ({
        ...prev,
        [tableName]: [...(prev[tableName] || []), newRow],
      }));
    },
    [],
  );

  const deleteTableRow = useCallback((tableName: string, rowIndex: number) => {
    setFormData((prev) => {
      const newTable = (prev[tableName] || []).filter(
        (_: any, i: number) => i !== rowIndex,
      );

      // Recalculate total if this is the expenses table
      let updates: Record<string, any> = { [tableName]: newTable };
      if (tableName === "ta_da_other_expenses_p") {
        const tableTotal = newTable.reduce(
          (sum: number, row: any) =>
            sum + parseFloat(row.total || row.amount || 0),
          0,
        );
        updates.total_claimed = tableTotal;
      }

      return { ...prev, ...updates };
    });
  }, []);

  const handleSave = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const data = await prepareFormDataForApi(formData);
      if (editDocName) {
        data.name = editDocName;
      }
      const res = await saveForm({ doc_data: JSON.stringify(data) });

      if (res?.message?.status === "success") {
        alert(
          editDocName
            ? "TA DA Settlement updated successfully!"
            : "Draft saved successfully!",
        );
        if (editDocName) {
          navigate(-1);
        }
      } else {
        throw new Error(res?.message?.message || "Save failed");
      }
    } catch (err: any) {
      console.error(saveError || err);
      alert(`Save failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      // 1. Save first
      const data = await prepareFormDataForApi(formData);
      const saveRes = await saveForm({ doc_data: JSON.stringify(data) });

      if (saveRes?.message?.status !== "success") {
        throw new Error(
          saveRes?.message?.message || "Save failed during submission",
        );
      }

      const docname = saveRes.message.docname;

      // 2. Submit
      const submitRes = await submitForm({ docname });
      if (submitRes?.message?.status === "success") {
        alert("TA DA Settlement submitted successfully!");
        navigate(-1);
      } else {
        throw new Error(submitRes?.message?.message || "Submission failed");
      }
    } catch (err: any) {
      console.error(submitError || err);
      alert(
        `Submission failed: ${err.message || "Please check the console for details."}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RENDER LOGIC ---
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-claude-bg dark:bg-zinc-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#D97757] border-t-transparent mx-auto"></div>
          <p className="mt-4 text-lg font-medium text-zinc-700 dark:text-zinc-300">
            Loading form...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-claude-bg dark:bg-zinc-900 min-h-screen">
      <AppSidebar />
      <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
        <PageHeader
          title={
            editDocName
              ? `Edit TA DA Settlement: ${editDocName}`
              : "TA DA Settlement"
          }
          projectName={
            projectName + (travelRef ? ` | Travel Ref: ${travelRef}` : "")
          }
          status={formData?.workflow_state}
        >
          {editDocName && formData?.docstatus === 1 && (
            <TADASettlementActionButtons
              docName={editDocName}
              onActionComplete={() => window.location.reload()}
            />
          )}
        </PageHeader>

        {/* Summary Cards */}
        {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Total Claimed</p>
                        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                            ₹ {(parseFloat(formData.total_claimed || 0)).toLocaleString('en-IN')}
                        </p>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Advance Taken</p>
                        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                            ₹ {(parseFloat(formData.advance_taken || 0)).toLocaleString('en-IN')}
                        </p>
                    </div>
                    <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Net Claimed</p>
                        <p className={cn(
                            "text-2xl font-bold mt-1",
                            (formData.net_claimed || 0) >= 0 ? "text-[#D97757]" : "text-[#D97757]"
                        )}>
                            ₹ {(parseFloat(formData.net_claimed || 0)).toLocaleString('en-IN')}
                        </p>
                    </div>
                </div> */}

        <form onSubmit={handleSubmit}>
          <FrappeCard className="space-y-12">
            <DynamicFormRenderer
              fields={fields}
              formData={formData}
              linkOptions={linkOptions}
              onChange={handleChange}
              onFileChange={handleFileChange}
              onTableRowChange={handleTableRowChange}
              onTableFileChange={handleTableFileChange}
              onAddTableRow={addTableRow}
              onDeleteTableRow={deleteTableRow}
              onFieldChangeWithSideEffects={handleFieldChangeWithSideEffects}
              readOnly={formData.docstatus === 1}
            />
          </FrappeCard>

          {(!editDocName || formData.docstatus === 0) && (
            <div className="mt-8 flex justify-end gap-4">
              <FrappeButton
                onClick={handleSave}
                disabled={isSubmitting}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:bg-zinc-800/50"
              >
                {isSubmitting ? "Saving..." : "Save Draft"}
              </FrappeButton>
              <FrappeButton
                type="submit"
                disabled={isSubmitting}
                className="bg-[#D97757] text-white hover:bg-[#D97757]"
              >
                {isSubmitting ? "Submitting..." : "Submit Settlement"}
              </FrappeButton>
            </div>
          )}
        </form>
      </main>
    </div>
  );
};

export default TADASettlementForm;
