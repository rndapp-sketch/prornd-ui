import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppSidebar } from "@/components/RndSidebar";
import { useFrappePostCall, useFrappeAuth } from "frappe-react-sdk";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { CheckCircle2, XCircle, Clock, ChevronRight, Printer } from "lucide-react";
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
import ViewProjectButton from "@/components/ViewProjectButton";
import { useUserRoles } from "@/components/UserRole";
import { generateTadaSettlementHtml } from "@/utils/tadaSettlementPrint";
import { resolveBudgetHeadLabel } from "@/utils/resolveBudgetHeadLabel";
import { fetchActivityLogHtml } from "@/utils/fetchActivityLogHtml";

// "Upload Supporting Docs / Additional Docs" table — same constraints as
// Project Registration's "Upload Supporting Docs" table.
const SUPPORTING_DOCS_TABLE = "ta_da_supporting_docs";
const ALLOWED_DOCUMENT_EXTENSIONS = [".pdf", ".doc", ".docx"];
const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

const validateSupportingDocFile = (file: File): string | null => {
  const lowerName = file.name.toLowerCase();
  if (!ALLOWED_DOCUMENT_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
    return "Only PDF, DOC, or DOCX files are supported.";
  }
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return "Each file should be 10MB or smaller.";
  }
  return null;
};

// --- "FOR OFFICE USE" SECTION ---
// Filled in by `staff, RnD` only, while the settlement sits at
// "Pending Staff Approval"; hidden from the applicant entirely. Visible
// (read-only) to approvers further down the chain once staff have forwarded it.
const OFFICE_USE_SECTION_FIELDNAME = "for_office_use_section";
const OFFICE_USE_INPUT_FIELDNAMES = [
  "railways_air_steamer_busfare",
  "road_mileage",
  "local_conveyance",
  "food_charges",
  "cccommodation_charges",
  "registration_fee_other",
  "less_advance_paid_to_applicant",
];
const OFFICE_USE_COMPUTED_FIELDNAMES = ["total_admissible_amount", "net_amount"];
const OFFICE_USE_FIELDNAMES = new Set([
  ...OFFICE_USE_INPUT_FIELDNAMES,
  ...OFFICE_USE_COMPUTED_FIELDNAMES,
]);
// Sum of these 6 (excludes "Less: Advance Paid") makes up Total Admissible Amount
const OFFICE_USE_CHARGE_FIELDNAMES = OFFICE_USE_INPUT_FIELDNAMES.filter(
  (f) => f !== "less_advance_paid_to_applicant",
);
const OFFICE_USE_VIEW_ONLY_ROLES = [
  "Hos, RnD (Head of Section, RnD)",
  "Ado_RnD",
  "Dean, RnD",
  "Director",
];

// --- TYPE DEFINITIONS ---
interface FormDataResponse {
  message: {
    fields: FormField[];
    link_options: Record<string, LinkOption[]>;
    prefill_data: Record<string, any>;
    child_table_meta?: Record<string, { doctype: string; fields: FormField[] }>;
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

// --- WORKFLOW TIMELINE ---
// Core forward path: Draft -> Pending Staff Approval -> Approved. `Pending PI
// Approval` only applies to project staff / Student applicants (Permanent
// Employee etc. skip straight to Pending Staff Approval). staff, RnD now
// approves directly from Pending Staff Approval — the Pending HoS Approval /
// Pending Associate Dean / Pending Dean Approval stages have no transitions
// leading to or from them anymore (removed from the live workflow), so they
// no longer appear here.
type TadaStageStatus = "completed" | "in-progress" | "pending" | "rejected";

const buildTadaTimelineStages = (
  currentState: string,
): { label: string; status: TadaStageStatus }[] => {
  const isApproved = currentState === "Approved";
  const isRejected = currentState === "Rejected";
  const entryStage = currentState === "Pending PI Approval" ? "Pending PI Approval" : null;

  const stages = [
    "Draft",
    ...(entryStage ? [entryStage] : []),
    "Pending Staff Approval",
    "Approved",
  ];
  const stagesForRejected = [...stages.slice(0, -1), "Rejected"];
  const activeStages = isRejected ? stagesForRejected : stages;

  let currentIdx = activeStages.findIndex((s) => s === currentState);
  if (currentIdx === -1) currentIdx = currentState ? 1 : 0;

  return activeStages.map((stage, idx) => {
    if (isApproved) return { label: stage, status: "completed" };
    if (isRejected) {
      if (idx === activeStages.length - 1) return { label: stage, status: "rejected" };
      return { label: stage, status: "pending" };
    }
    if (idx < currentIdx) return { label: stage, status: "completed" };
    if (idx === currentIdx) return { label: stage, status: "in-progress" };
    return { label: stage, status: "pending" };
  });
};

const TadaWorkflowTimeline: React.FC<{
  currentState: string;
}> = ({ currentState }) => {
  const stages = buildTadaTimelineStages(currentState || "Draft");

  const iconForStatus = (status: TadaStageStatus) => {
    if (status === "completed") return <CheckCircle2 className="w-4 h-4 text-white" />;
    if (status === "in-progress") return <Clock className="w-4 h-4 text-white" />;
    if (status === "rejected") return <XCircle className="w-4 h-4 text-white" />;
    return <span className="w-2 h-2 rounded-full bg-white/60" />;
  };

  const bgForStatus = (status: TadaStageStatus) => {
    if (status === "completed") return "bg-emerald-500";
    if (status === "in-progress") return "bg-[#D97757]";
    if (status === "rejected") return "bg-red-500";
    return "bg-zinc-300 dark:bg-zinc-600";
  };

  const connectorColor = (status: TadaStageStatus) =>
    status === "completed" ? "bg-emerald-400" : "bg-zinc-200 dark:bg-zinc-700";

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-5">
      <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
        Workflow Progress
      </h3>
      <div className="flex items-start overflow-x-auto pb-1">
        {stages.map((stage, idx) => (
          <React.Fragment key={stage.label}>
            <div className="flex flex-col items-center min-w-[90px] max-w-[110px]">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shadow-sm flex-shrink-0",
                  bgForStatus(stage.status),
                )}
              >
                {iconForStatus(stage.status)}
              </div>
              <p
                className={cn(
                  "mt-2 text-center text-xs leading-tight px-1",
                  stage.status === "in-progress" ? "font-bold text-[#D97757]" : "",
                  stage.status === "completed" ? "text-emerald-600 dark:text-emerald-400 font-medium" : "",
                  stage.status === "pending" ? "text-zinc-400 dark:text-zinc-500" : "",
                  stage.status === "rejected" ? "text-red-500 font-bold" : "",
                )}
              >
                {stage.label}
              </p>
              {stage.status === "in-progress" && (
                <span className="mt-1 text-[10px] font-bold text-white bg-[#D97757] px-2 py-0.5 rounded-full">
                  Pending Here
                </span>
              )}
            </div>
            {idx < stages.length - 1 && (
              <div className="flex-1 flex items-center pt-4 min-w-[20px]">
                <div className={cn("h-1 w-full rounded", connectorColor(stage.status))} />
                <ChevronRight className="w-3 h-3 text-zinc-400 flex-shrink-0 -ml-1" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

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
  // Tracks the docname created/returned by a Save Draft action so Submit can reuse it
  const [savedDocName, setSavedDocName] = useState<string>("");

  // --- ROLE-BASED "FOR OFFICE USE" ACCESS ---
  const { roles } = useUserRoles(currentUser ?? null);
  const isStaffRnD = roles.some(
    (r) => r === "staff, RnD" || r === "System Manager",
  );
  const isOfficeUseViewer =
    isStaffRnD || roles.some((r) => OFFICE_USE_VIEW_ONLY_ROLES.includes(r));
  const isPendingStaffApproval = formData.workflow_state === "Pending Staff Approval";
  // Staff, RnD can only edit the office-use figures while the settlement is
  // sitting in their queue; everyone else (including staff, at other stages) views them read-only.
  const canEditOfficeUse = isStaffRnD && isPendingStaffApproval;
  // Once the applicant has submitted (left Draft), the document must lock —
  // `docstatus` doesn't work for this: in this workflow it stays 0 all the
  // way through Approved (only Rejected flips it to 1), so it's not a
  // reliable "has this been submitted" signal.
  const isSubmitted = !!formData.workflow_state && formData.workflow_state !== "Draft";

  // Only the applicant who initiated this settlement should see "Print" —
  // and only once it has actually been submitted (not while still a Draft).
  const isApplicant =
    !!currentUser &&
    !!formData.webmail_id &&
    currentUser.toLowerCase() === String(formData.webmail_id).toLowerCase();
  const showPrintButton = isApplicant && isSubmitted;
  const handlePrintTada = async () => {
    if (!formData) return;
    const linkedAccountHeadLabel = linkOptions.ta_da_account_head?.find(
      (o) => o.value === formData.ta_da_account_head,
    )?.label;
    // Fall back to a live lookup (handles the doc-name vs legacy custom-id
    // ambiguity) whenever the pre-fetched options didn't resolve it.
    const accountHeadLabel =
      linkedAccountHeadLabel && linkedAccountHeadLabel !== formData.ta_da_account_head
        ? linkedAccountHeadLabel
        : await resolveBudgetHeadLabel(formData.ta_da_account_head);
    const activityLogHtml = await fetchActivityLogHtml(
      "TA DA Settlement",
      editDocName || formData.name || "",
    );
    const html = generateTadaSettlementHtml(formData, accountHeadLabel, activityLogHtml);
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);
    }
  };

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
  const { call: fetchBudgetHeadList } = useFrappePostCall<{ message: any[] }>(
    "frappe.client.get_list",
  );

  // --- LEDGER HELPER: fetch committed amount for a Travel app ---
  const fetchAdvanceTakenFromLedger = useCallback(
    async (
      travelAppId: string,
      projectCode: string,
      getBudgetHeads: () => Promise<{ message: any[] }>,
    ): Promise<number | null> => {
      if (!travelAppId || !projectCode) return null;
      try {
        const headsResult = await getBudgetHeads();
        const rawHeads: any[] = headsResult?.message || [];
        for (const h of rawHeads) {
          const headId = h.id ?? h.uid;
          if (!headId) continue;
          try {
            const url = `/ledger-api/commit-payment-transactions?projectNumber=${encodeURIComponent(projectCode)}&accountHeadId=${encodeURIComponent(String(headId))}`;
            const res = await fetch(url);
            if (!res.ok) continue;
            const entries: any[] = await res.json().then((d) => (Array.isArray(d) ? d : []));
            const match = entries.find((e: any) => e.frapAppId === travelAppId);
            if (match != null) {
              const val = match.committed ?? match.commitAmount ?? match.amount;
              if (val != null) return parseFloat(val);
            }
          } catch { /* try next head */ }
        }
      } catch (err) {
        console.error("[AdvanceTaken] Error:", err);
      }
      return null;
    },
    [],
  );

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
          child_table_meta,
        } = formDataResult.message;

        // Merge child_table_meta into Table fields as child_fields (same
        // pattern as AdvanceSettlementForm.tsx) — without this, Table fields
        // (Other Expenses, Journey Particulars, Local Conveyance) render nothing.
        const fieldsWithChildren = (apiFields || []).map((field: FormField) => {
          if (field.fieldtype === "Table" && field.fieldname && child_table_meta?.[field.fieldname]) {
            const childFields = child_table_meta[field.fieldname].fields.map((cf: any) => ({
              ...cf,
              label: cf.label || cf.fieldname || "",
            }));
            return { ...field, child_fields: childFields };
          }
          return field;
        });
        setFields(fieldsWithChildren);

        let baseLinkOptions = { ...(link_options || {}) };
        try {
          const headsRes = await fetchBudgetHeadList({
            doctype: "Budget Head",
            fields: ["name", "budget_head", "id", "uid"],
            limit_page_length: 0,
          });
          if (headsRes?.message) {
            const budgetHeadOptions = headsRes.message.map((h: any) => ({
              value: h.name,
              label: h.budget_head || h.title || h.name,
            }));
            baseLinkOptions = {
              ...baseLinkOptions,
              "Budget Head": budgetHeadOptions,
              ta_da_account_head: budgetHeadOptions,
              account_head: budgetHeadOptions,
            };
          }
        } catch (err) {
          console.error("Error fetching TA DA budget heads:", err);
        }
        setLinkOptions(baseLinkOptions);

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
              initialData.ta_da_project_code =
                projectName ||
                initialData.ta_da_project_code ||
                travelDoc.travel_project_number ||
                "";
              initialData.ta_da_account_head =
                travelDoc.account_head ||
                travelDoc.ta_da_account_head ||
                initialData.ta_da_account_head ||
                "";

              // Populate Advance Taken from the Travel app's committed amount in ledger
              const resolvedProject =
                initialData.project_no || travelDoc.travel_project_number || "";
              const advanceTaken = await fetchAdvanceTakenFromLedger(
                travelRef,
                resolvedProject,
                () => fetchBudgetHeadList({ doctype: "Budget Head", fields: ["name", "id", "uid"], limit_page_length: 50 }),
              );
              if (advanceTaken != null) {
                initialData.ta_da_advance_taken = advanceTaken;
              } else if (
                initialData.ta_da_advance_taken == null ||
                initialData.ta_da_advance_taken === ""
              ) {
                initialData.ta_da_advance_taken =
                  parseFloat(travelDoc.total_estimate || 0) || 0;
              }

              if (travelDoc.webmail_id_travel) {
                // Full fetch for user fields
                const userMapped = await fetchAndMapUserDetails(
                  travelDoc.webmail_id_travel,
                  {
                  ta_da_project_code:
                      projectName || travelDoc.travel_project_number || "",
                  ta_da_account_head: travelDoc.account_head || "",
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
                initialData.ta_da_account_head = travelDoc.account_head || "";
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
    fetchBudgetHeadList,
  ]);

  // --- CALCULATE TOTALS ---
  useEffect(() => {
    // Calculate net claimed amount
    const totalClaimed = parseFloat(formData.ta_da_total_claimed || 0);
    const advanceTaken = parseFloat(formData.ta_da_advance_taken || 0);
    const netClaimed = totalClaimed - advanceTaken;

    if (formData.ta_da_net_claimed !== netClaimed) {
      setFormData((prev) => ({
        ...prev,
        ta_da_net_claimed: netClaimed,
      }));
    }
  }, [formData.ta_da_total_claimed, formData.ta_da_advance_taken]);

  // --- CALCULATE "FOR OFFICE USE" TOTALS (staff, RnD entry only) ---
  useEffect(() => {
    if (!canEditOfficeUse) return;
    const totalAdmissible = OFFICE_USE_CHARGE_FIELDNAMES.reduce(
      (sum, fieldname) => sum + (parseFloat(formData[fieldname]) || 0),
      0,
    );
    if (formData.total_admissible_amount !== totalAdmissible) {
      setFormData((prev) => ({ ...prev, total_admissible_amount: totalAdmissible }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    canEditOfficeUse,
    ...OFFICE_USE_CHARGE_FIELDNAMES.map((f) => formData[f]),
  ]);

  useEffect(() => {
    if (!canEditOfficeUse) return;
    const totalAdmissible = parseFloat(formData.total_admissible_amount) || 0;
    const advancePaid = parseFloat(formData.less_advance_paid_to_applicant) || 0;
    const net = totalAdmissible - advancePaid;
    if (formData.net_amount !== net) {
      setFormData((prev) => ({ ...prev, net_amount: net }));
    }
  }, [canEditOfficeUse, formData.total_admissible_amount, formData.less_advance_paid_to_applicant]);

  // --- APPLY ROLE-BASED VISIBILITY/EDITABILITY TO "FOR OFFICE USE" FIELDS ---
  const processedFields = useMemo(() => {
    return fields.map((field) => {
      // "Select Travel Application" links the settlement to a specific Travel
      // record (prefilled from the travel_ref URL param / editing an existing
      // doc) — users should never be able to change it after the fact.
      if (field.fieldname === "ta_da_travel_application") {
        return { ...field, read_only: 1 };
      }

      if (
        field.fieldname !== OFFICE_USE_SECTION_FIELDNAME &&
        !OFFICE_USE_FIELDNAMES.has(field.fieldname)
      ) {
        // The global `readOnly` prop is turned off while staff, RnD is
        // editing the office-use section (so those fields unlock) — force
        // every other field to stay locked instead of unlocking with it.
        return canEditOfficeUse ? { ...field, read_only: 1 } : field;
      }

      const f = { ...field };
      if (!isOfficeUseViewer) {
        // Applicant / anyone else who isn't staff or an approver: never shown.
        f.hidden = 1;
        return f;
      }

      f.hidden = 0;
      if (OFFICE_USE_COMPUTED_FIELDNAMES.includes(field.fieldname)) {
        // Total Admissible Amount / Net Amount are always computed, never hand-typed.
        f.read_only = 1;
      } else {
        f.read_only = canEditOfficeUse ? 0 : 1;
      }
      return f;
    });
  }, [fields, isOfficeUseViewer, canEditOfficeUse]);

  // Auto-fill Total Amount Claimed as the sum of Fare (Journey) + Fare (Local
  // Conveyance) + Amount (Other Expenses) — a convenience default, still
  // editable by hand afterward. Only reacts to the three source tables
  // changing, not to ta_da_total_claimed itself, otherwise typing directly
  // into the field immediately re-triggers this effect and reverts the
  // user's own edit back to the computed sum, making the field feel
  // non-editable.
  useEffect(() => {
    const sumField = (rows: any, fieldname: string) =>
      Array.isArray(rows)
        ? rows.reduce((sum: number, row: any) => sum + (parseFloat(row?.[fieldname]) || 0), 0)
        : 0;

    const tableTotal =
      sumField(formData.ta_da_journey_particulars_table, "fare") +
      sumField(formData.ta_da_local_conveyance_table, "fare") +
      sumField(formData.ta_da_other_expenses_p, "ta_da_amount_other_expense");

    setFormData((prev) =>
      prev.ta_da_total_claimed === tableTotal
        ? prev
        : { ...prev, ta_da_total_claimed: tableTotal },
    );
  }, [
    formData.ta_da_journey_particulars_table,
    formData.ta_da_local_conveyance_table,
    formData.ta_da_other_expenses_p,
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

      if (fieldname === "ta_da_travel_application" && value) {
        try {
          const result = await fetchTravelDetails({
            doctype: "Travel",
            name: value,
          });

          if (result?.message) {
            const travelDoc = result.message;

            // Fetch advance taken from ledger for the selected travel app
            const travelProjectCode =
              travelDoc.travel_project_number || "";
            const advanceTaken = await fetchAdvanceTakenFromLedger(
              value,
              travelProjectCode,
              () => fetchBudgetHeadList({ doctype: "Budget Head", fields: ["name", "id", "uid"], limit_page_length: 50 }),
            );

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
                ta_da_purpose_of_journey:
                  travelDoc.purpose_of_journey_travel ||
                  travelDoc.purpose_of_journey ||
                  travelDoc.purpose ||
                  "",
                ta_da_bank_account_holder:
                  travelDoc.bank_account_holder_name_travel ||
                  travelDoc.bank_account_holder ||
                  "",
                ta_da_bank_account_number:
                  travelDoc.bank_account_number_travel ||
                  travelDoc.bank_account_number ||
                  "",
                ta_da_account_head: travelDoc.account_head || "",
                ...(advanceTaken != null ? { ta_da_advance_taken: advanceTaken } : {}),
                ...(advanceTaken == null
                  ? { ta_da_advance_taken: parseFloat(travelDoc.total_estimate || 0) || 0 }
                  : {}),
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
                ta_da_purpose_of_journey:
                  travelDoc.purpose_of_journey_travel ||
                  travelDoc.purpose_of_journey ||
                  travelDoc.purpose ||
                  "",
                ta_da_bank_account_holder:
                  travelDoc.bank_account_holder_name_travel ||
                  travelDoc.bank_account_holder ||
                  "",
                ta_da_bank_account_number:
                  travelDoc.bank_account_number_travel ||
                  travelDoc.bank_account_number ||
                  "",
                ta_da_account_head: travelDoc.account_head || "",
                ...(advanceTaken != null ? { ta_da_advance_taken: advanceTaken } : {}),
                ...(advanceTaken == null
                  ? { ta_da_advance_taken: parseFloat(travelDoc.total_estimate || 0) || 0 }
                  : {}),
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
      fetchAdvanceTakenFromLedger,
      fetchBudgetHeadList,
    ],
  );

  const handleTableRowChange = useCallback(
    (tableName: string, rowIndex: number, fieldname: string, value: any) => {
      // Note: ta_da_total_claimed is kept in sync by the dedicated useEffect
      // above (sums Fare from both particulars tables + Amount from Other
      // Expenses) whenever any of these tables changes — not here.
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
      if (file && tableName === SUPPORTING_DOCS_TABLE) {
        const validationError = validateSupportingDocFile(file);
        if (validationError) {
          alert(validationError);
          return;
        }
      }
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
    // Note: ta_da_total_claimed is kept in sync by the dedicated useEffect
    // above whenever any of the three source tables changes — not here.
    setFormData((prev) => {
      const newTable = (prev[tableName] || []).filter(
        (_: any, i: number) => i !== rowIndex,
      );
      return { ...prev, [tableName]: newTable };
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
        // Track the returned docname so Submit can reuse the same document
        if (res.message.docname && !editDocName) {
          setSavedDocName(res.message.docname);
        }
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
      // 1. Save first — include existing docname so we don't create a duplicate
      const effectiveName = editDocName || savedDocName;
      const data = await prepareFormDataForApi(formData);
      if (effectiveName) {
        data.name = effectiveName;
      }
      const saveRes = await saveForm({ doc_data: JSON.stringify(data) });

      if (saveRes?.message?.status !== "success") {
        throw new Error(
          saveRes?.message?.message || "Save failed during submission",
        );
      }

      const docname = saveRes.message.docname || effectiveName;

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
      <div className="flex items-center justify-center min-h-screen bg-[#FAFAF9] dark:bg-[#18181B]">
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
    <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen">
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
          {editDocName && <ViewProjectButton doctype="TA DA Settlement" data={formData} />}
          {showPrintButton && (
            <FrappeButton
              onClick={handlePrintTada}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:bg-zinc-800/50"
            >
              <Printer className="w-4 h-4" />
              Print
            </FrappeButton>
          )}
          {editDocName &&
            isSubmitted && (
              <TADASettlementActionButtons
                docName={editDocName}
                onActionComplete={() => window.location.reload()}
              />
            )}
        </PageHeader>

        {editDocName && (
          <div className="mt-6 mb-6">
            <TadaWorkflowTimeline
              currentState={formData?.workflow_state || "Draft"}
            />
          </div>
        )}

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
              fields={processedFields}
              formData={formData}
              linkOptions={linkOptions}
              onChange={handleChange}
              onFileChange={handleFileChange}
              onTableRowChange={handleTableRowChange}
              onTableFileChange={handleTableFileChange}
              onAddTableRow={addTableRow}
              onDeleteTableRow={deleteTableRow}
              onFieldChangeWithSideEffects={handleFieldChangeWithSideEffects}
              readOnly={isSubmitted && !canEditOfficeUse}
            />
          </FrappeCard>

          {canEditOfficeUse ? (
            <div className="mt-8 flex flex-col items-end gap-2">
              <FrappeButton
                onClick={handleSave}
                disabled={isSubmitting}
                className="bg-[#D97757] text-white hover:bg-[#D97757]"
              >
                {isSubmitting ? "Saving..." : "Save Office Use Details"}
              </FrappeButton>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Save the "For Office Use" figures before forwarding this settlement.
              </p>
            </div>
          ) : (
            (!editDocName || !isSubmitted) && (
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
            )
          )}
        </form>
      </main>
    </div>
  );
};

export default TADASettlementForm;
