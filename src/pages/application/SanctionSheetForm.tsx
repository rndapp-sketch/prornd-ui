import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppSidebar } from "@/components/RndSidebar";
import { useFrappePostCall } from "frappe-react-sdk";
import { cn } from "@/lib/utils";
import { AlertCircle, Printer } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import {
    DynamicFormRenderer,
    type FormField,
    type LinkOption,
} from "@/components/forms/DynamicFormRenderer";
import { sanctionSheetAPI, prepareFormDataForApi } from "@/services/apiService";
import { generateSanctionSheetHtml } from "@/utils/sanctionSheetPrint";
import { P11PrintModal } from "@/components/P11PrintModal";

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
            "bg-white dark:bg-zinc-900 p-4 md:p-6 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm",
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
const SanctionSheetForm: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const projectName = searchParams.get("project") || "";
    const editDocName = searchParams.get("edit") || "";
    const appId = searchParams.get("app_id") || "";
    const projectNo = searchParams.get("project_no") || "";

    const [fields, setFields] = useState<FormField[]>([]);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [linkOptions, setLinkOptions] = useState<
        Record<string, LinkOption[]>
    >({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [savedDocName, setSavedDocName] = useState<string | null>(
        editDocName || null,
    );

    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

    // Workflow state
    const [workflowActions, setWorkflowActions] = useState<string[]>([]);

    // --- API HOOKS ---
    const {
        call: fetchFormData,
        result: formDataResult,
        error: formDataError,
    } = useFrappePostCall<FormDataResponse>(sanctionSheetAPI.getFields);
    const { call: saveForm, error: saveError } = useFrappePostCall(
        sanctionSheetAPI.save,
    );
    const { call: fetchExistingDoc } = useFrappePostCall<{ message: any }>(
        "frappe.client.get",
    );
    const { call: fetchValue } = useFrappePostCall<{ message: Record<string, any> }>(
        "frappe.client.get_value",
    );

    // Workflow Action API
    const { call: fetchWorkflowActions } = useFrappePostCall<{
        message: string[];
    }>(sanctionSheetAPI.getWorkflowActions);
    const { call: performAction } = useFrappePostCall(
        sanctionSheetAPI.performAction,
    );

    // --- DATA FETCHING ---
    useEffect(() => {
        if (!dataLoaded) {
            fetchFormData({
                doc_name: editDocName || null,
                project_name: projectName || null,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const loadFormAndDocument = async () => {
            if (formDataResult?.message && !dataLoaded) {
                const {
                    fields: apiFields,
                    prefill_data,
                    link_options,
                } = formDataResult.message;
                setLinkOptions(link_options || {});

                let initialData = { ...prefill_data };
                let overrideFields = apiFields || [];

                // If editing, fetch existing document data
                if (editDocName) {
                    try {
                        const existingDoc = await fetchExistingDoc({
                            doctype: "sanction_sheet",
                            name: editDocName,
                        });
                        if (existingDoc?.message) {
                            initialData = {
                                ...initialData,
                                ...existingDoc.message,
                            };
                        }
                        const actionsRes = await fetchWorkflowActions({
                            docname: editDocName,
                        });
                        if (actionsRes?.message) {
                            setWorkflowActions(actionsRes.message);
                        }
                    } catch (err) {
                        console.error(
                            "Error fetching existing document or workflow actions:",
                            err,
                        );
                    }
                }

                // If creating from a Direct Purchase, prefill from DP + P11 in parallel
                if (appId && !editDocName) {
                    try {
                        const p11Filter = encodeURIComponent(
                            JSON.stringify([["app_id", "=", appId]]),
                        );
                        // Step 1: fetch DP + P11 name in parallel
                        const [dpRes, p11ListRes] = await Promise.all([
                            fetchExistingDoc({
                                doctype: "Direct Purchase",
                                name: appId,
                            }),
                            fetch(
                                `/api/v2/document/P_11%20Form?filters=${p11Filter}&fields=${encodeURIComponent('["name"]')}`,
                                {
                                    credentials: "include",
                                    headers: { Accept: "application/json" },
                                },
                            )
                                .then((r) => r.json())
                                .catch(() => ({ data: [] })),
                        ]);

                        const dpData = dpRes?.message || {};
                        const p11Name = p11ListRes?.data?.[0]?.name || "";

                        // Step 2: fetch full P11 doc by name to get child table rows
                        let p11Data: Record<string, any> = {};
                        if (p11Name) {
                            const p11DocRes = await fetchExistingDoc({
                                doctype: "P_11 Form",
                                name: p11Name,
                            });
                            p11Data = p11DocRes?.message || {};
                        }

                        // Map header fields
                        initialData.project_no =
                            projectNo || dpData.project_name || "";
                        initialData.app_id = appId;
                        initialData.p11_no = p11Data.name || "";
                        initialData.ss_applicant_name =
                            dpData.applicant_name || "";

                        // Resolve department ID → readable name
                        let deptName = dpData.applicant_department || "";
                        if (deptName) {
                            try {
                                const deptRes = await fetchValue({
                                    doctype: "Department_prornd",
                                    filters: deptName,
                                    fieldname: "dept_name",
                                });
                                deptName = deptRes?.message?.dept_name || deptName;
                            } catch {
                                // fall back to raw value
                            }
                        }
                        initialData.ss_department_for_purchase = deptName;
                        // Resolve budget head ID → readable name
                        let accountHead = dpData.account_head || "";
                        if (accountHead) {
                            try {
                                const budgetRes = await fetchValue({
                                    doctype: "Budget Head",
                                    filters: { name: accountHead },
                                    fieldname: "budget_head",
                                });
                                accountHead = budgetRes?.message?.budget_head || accountHead;
                            } catch {
                                // fall back to raw value
                            }
                        }
                        initialData.ss_account_head = accountHead;
                        initialData.ss_funding_agency =
                            dpData.funding_agency || "";
                        initialData.ss_name_of_firms =
                            p11Data.quotation_recieved_for_purchase_of_the__items_from_ms ||
                            dpData.vendor_name ||
                            "";
                        initialData.direct_purchase = appId;

                        // Map summary totals from P11
                        if (p11Data.total_basic_value)
                            initialData.ss_total_es_basic_value = p11Data.total_basic_value;
                        if (p11Data.packing_and_forwarding)
                            initialData.ss_pack_forward = p11Data.packing_and_forwarding;
                        if (p11Data.freight)
                            initialData.ss_freight = p11Data.freight;
                        if (p11Data.other_charges)
                            initialData.ss_other_charges = p11Data.other_charges;
                        if (p11Data.grand_total)
                            initialData.ss_grand_total = p11Data.grand_total;

                        // Map item table from P11 into sanction sheet's table_bttk
                        const p11Rows = Array.isArray(p11Data.table_hsrb)
                            ? p11Data.table_hsrb
                            : [];
                        if (p11Rows.length > 0) {
                            initialData.table_bttk = p11Rows.map((row: any) => ({
                                item_name: row.item_name || "",
                                item_make: row.item_make || "",
                                item_model: row.item_model || "",
                                item_description: row.item_description || "",
                                item_quantity: row.item_quantity || "",
                                item_unit_price: row.item_unit_price || "",
                                item_discount: row.item_discount || "",
                                item_gst: row.item_gst || "",
                                dp_total_price: row.dp_total_price || "",
                            }));
                        }
                    } catch (err) {
                        console.error("Error fetching prefill data:", err);
                    }

                    // Mark project_no and app_id read-only, hide p11_no
                    overrideFields = overrideFields.map((field: FormField) => {
                        if (
                            [
                                "project_no",
                                "app_id",
                                "direct_purchase",
                            ].includes(field.fieldname)
                        ) {
                            return { ...field, read_only: 1 };
                        }
                        if (field.fieldname === "p11_no") {
                            return { ...field, hidden: 1 };
                        }
                        return field;
                    });
                }

                setFields(overrideFields);

                // Set defaults for any missing fields
                overrideFields.forEach((field: FormField) => {
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
                alert("Error: Could not load the Sanction Sheet.");
                setLoading(false);
            }
        };

        loadFormAndDocument();
    }, [
        formDataResult,
        formDataError,
        editDocName,
        appId,
        projectNo,
        fetchExistingDoc,
        fetchWorkflowActions,
        fetchValue,
        dataLoaded,
    ]);

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
        },
        [handleChange],
    );

    const handleTableRowChange = useCallback(
        (
            tableName: string,
            rowIndex: number,
            fieldname: string,
            value: any,
        ) => {
            setFormData((prev) => {
                const table = [...(prev[tableName] || [])];
                table[rowIndex] = { ...table[rowIndex], [fieldname]: value };
                return { ...prev, [tableName]: table };
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

    const deleteTableRow = useCallback(
        (tableName: string, rowIndex: number) => {
            setFormData((prev) => ({
                ...prev,
                [tableName]: (prev[tableName] || []).filter(
                    (_: any, i: number) => i !== rowIndex,
                ),
            }));
        },
        [],
    );

    // --- Workflows & Saving ---
    const handleSave = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const data = await prepareFormDataForApi(formData);
            if (editDocName) {
                data.name = editDocName;
            }
            const res = await saveForm({ data: JSON.stringify(data) });

            if (res?.message?.status === "success") {
                const docname = res.message.docname || editDocName;
                setSavedDocName(docname);

                if (editDocName) {
                    // If editing, go back
                    alert("Sanction Sheet updated successfully!");
                    navigate(-1);
                } else {
                    // If creating new, redirect to edit mode to show workflow actions
                    alert(
                        "Sanction Sheet draft saved successfully! You can now proceed with workflow actions.",
                    );
                    navigate(`/sanction-sheet/${docname}`);
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

    const handleWorkflowAction = async (action: string) => {
        if (isSubmitting || !savedDocName) return;

        let comment = "";
        if (
            action.toLowerCase().includes("reject") ||
            action.toLowerCase().includes("put back")
        ) {
            const userComment = prompt(
                `Please provide a reason for '${action}':`,
            );
            if (userComment === null) return; // Cancelled
            comment = userComment;
        }

        setIsSubmitting(true);
        try {
            // Save first to push "Other Charges" to the document.
            const data = await prepareFormDataForApi(formData);
            const saveRes = await saveForm({ data: JSON.stringify(data) });

            if (saveRes?.message?.status !== "success") {
                throw new Error(
                    "Failed to save data before processing action.",
                );
            }

            const res = await performAction({
                docname: savedDocName,
                action: action,
                comment: comment,
            });

            if (res?.message?.status === "success") {
                alert(`Action '${action}' completed successfully!`);
                navigate(-1);
            } else {
                throw new Error(
                    res?.message?.message ||
                        `Failed to perform action '${action}'.`,
                );
            }
        } catch (err: any) {
            console.error(err);
            alert(`Action failed: ${err.message || "Unknown error"}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Apply depends_on logic to filter visible fields ---
    const visibleFields = useMemo(() => {
        return fields.map((field) => {
            const f = { ...field };
            if (f.depends_on) {
                const evalStr = String(f.depends_on).replace(/;$/, "");
                try {
                    const match = evalStr.match(
                        /doc\.(\w+)\s*==\s*['"]([^'"]+)['"]/,
                    );
                    if (match) {
                        const [, fieldName, expectedValue] = match;
                        f.hidden =
                            formData[fieldName] !== expectedValue ? 1 : 0;
                    }
                } catch {
                    f.hidden = 0;
                }
            }
            return f;
        });
    }, [fields, formData]);

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
                <div className="flex items-center justify-between gap-4 mb-2">
                    <PageHeader
                        title={
                            editDocName
                                ? `sanction_sheet: ${editDocName}`
                                : "sanction_sheet"
                        }
                        projectName={projectName}
                    />
                    {editDocName && (
                        <button
                            onClick={() => setIsPrintModalOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shrink-0"
                        >
                            <Printer className="w-4 h-4" /> Print / PDF
                        </button>
                    )}
                </div>

                {validationErrors.length > 0 && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                        <h4 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                            <AlertCircle className="h-5 w-5" />
                            Please fix the following errors:
                        </h4>
                        <ul className="list-disc list-inside text-red-700 space-y-1">
                            {validationErrors.map((err, idx) => (
                                <li key={idx}>{err}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6">
                    <div className="col-span-1">
                        <FrappeCard className="space-y-6">
                            <DynamicFormRenderer
                                fields={visibleFields}
                                formData={formData}
                                linkOptions={linkOptions}
                                onChange={handleChange}
                                onFileChange={handleFileChange}
                                onTableRowChange={handleTableRowChange}
                                onTableFileChange={handleTableFileChange}
                                onAddTableRow={addTableRow}
                                onDeleteTableRow={deleteTableRow}
                                onFieldChangeWithSideEffects={
                                    handleFieldChangeWithSideEffects
                                }
                            />
                        </FrappeCard>

                        <div className="mt-8 flex flex-wrap justify-end gap-4">
                            {!editDocName && (
                                <FrappeButton
                                    onClick={handleSave}
                                    disabled={isSubmitting}
                                    className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:bg-zinc-800/50"
                                >
                                    {isSubmitting ? "Saving..." : "Save Data"}
                                </FrappeButton>
                            )}

                            {/* Workflow Action Buttons */}
                            {editDocName && workflowActions.length > 0
                                ? workflowActions.map((action, idx) => {
                                      const isRejectAction = action
                                          .toLowerCase()
                                          .includes("reject");
                                      const isPutBackAction = action
                                          .toLowerCase()
                                          .includes("put back");

                                      let buttonClass =
                                          "bg-[#D97757] text-white hover:bg-[#c66a4e]"; // Default to orange

                                      if (isRejectAction) {
                                          buttonClass =
                                              "bg-red-600 text-white hover:bg-red-700";
                                      } else if (isPutBackAction) {
                                          buttonClass =
                                              "bg-amber-600 text-white hover:bg-amber-700";
                                      } else if (
                                          action
                                              .toLowerCase()
                                              .includes("approve") ||
                                          action
                                              .toLowerCase()
                                              .includes("print taken") ||
                                          action
                                              .toLowerCase()
                                              .includes("verified")
                                      ) {
                                          buttonClass =
                                              "bg-emerald-600 text-white hover:bg-emerald-700";
                                      }

                                      return (
                                          <FrappeButton
                                              key={idx}
                                              onClick={() =>
                                                  handleWorkflowAction(action)
                                              }
                                              disabled={isSubmitting}
                                              className={buttonClass}
                                          >
                                              {action}
                                          </FrappeButton>
                                      );
                                  })
                                : editDocName &&
                                  workflowActions.length === 0 && (
                                      <FrappeButton
                                          onClick={handleSave}
                                          disabled={isSubmitting}
                                          className="bg-[#D97757] text-white hover:bg-[#c66a4e]"
                                      >
                                          Update Details
                                      </FrappeButton>
                                  )}
                        </div>
                    </div>
                </div>
            </main>

            <P11PrintModal
                isOpen={isPrintModalOpen}
                onClose={() => setIsPrintModalOpen(false)}
                htmlContent={isPrintModalOpen ? generateSanctionSheetHtml(formData) : ''}
                docName={editDocName || formData.name || ''}
            />
        </div>
    );
};

export default SanctionSheetForm;
