import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useFrappeAuth, useFrappeGetCall, useFrappePostCall, useFrappeGetDoc } from "frappe-react-sdk";
import { AppSidebar } from "@/components/RndSidebar";
import { CommitPayment } from "@/components/CommitPayment";
import { useUserRoles } from "@/components/UserRole";
import { useProjectBudget } from "@/hooks/useProjectBudget";
import { extensionAPI } from "@/services/apiService";
import ViewProjectButton from "@/components/ViewProjectButton";
import { ActivityLog } from "@/components/ActivityLog";
import { getActionButtonStyle } from "@/utils/workflowUtils";
import {
  User as UserIcon, IdCard, Mail, Building2, Briefcase,
  FolderOpen, CalendarDays, FileText, AlertCircle, CheckCircle2,
  ChevronLeft, Loader2, MessageSquare, Clock,
  ArrowRightCircle, CheckCircle, XCircle, IndianRupee,
  UserCheck, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BasicDetails {
  erp_mail?: string;
  ps_first_name?: string;
  ps_middle_name?: string;
  ps_last_name?: string;
  ps_emp_id?: string;
  project_no?: string;
  project_name?: string;
  ps_designation?: string;
  ps_department?: string;
  ps_department_name?: string;
  ps_joining_date?: string;
  ps_term_completion_date?: string;
  ps_basic_salary?: string;
  no_of_months_worked?: number;
  no_of_days_worked?: number;
  ex_last_ex_date?: string;
}

interface ExtensionDoc {
  name: string;
  docstatus: number;
  workflow_state?: string;
  ex_proj_name?: string;
  ex_proj_no?: string;
  ex_name?: string;
  ex_emp_id?: string;
  ex_designation?: string;
  department?: string;
  ex_doj?: string;
  ex_date_of_expiry?: string;
  ex_last_ex_date?: string;
  ex_no_of_mon_worked?: string;
  ex_no_of_days_worked?: string;
  ex_period?: string;
  ex_current_basic?: string;
  ex_period_pi?: string;
  ex_period_staff?: string;
  increment_by_pi?: string;
  increment_by_staff?: string;
}

interface WorkflowActionsResponse {
  message: {
    status: string;
    actions: string[];
    workflow_state: string;
    docstatus: number;
  };
}

// ── Workflow state definitions ────────────────────────────────────────────────
const WORKFLOW_STAGES = [
  "Draft",
  "Pending PI Approval",
  "Pending Staff Approval",
  "Pending HoS Approval",
  "Approved",
];

const getStageStatus = (stageName: string, currentState: string) => {
  const stageIdx = WORKFLOW_STAGES.indexOf(stageName);
  const currentIdx = WORKFLOW_STAGES.indexOf(currentState);
  if (currentState === "Rejected" || currentState === "Cancelled") {
    return stageName === currentState ? "failed" : stageIdx < currentIdx ? "completed" : "pending";
  }
  if (stageIdx < currentIdx) return "completed";
  if (stageIdx === currentIdx) return "in-progress";
  return "pending";
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value?: React.ReactNode }) => (
  <div className="flex items-start gap-3">
    <div className="mt-0.5 flex-shrink-0 text-[#A1A1AA]">{icon}</div>
    <div className="min-w-0 flex-1">
      <p className="text-xs text-[#71717A] dark:text-[#A1A1AA]">{label}</p>
      <div className="text-sm font-medium text-[#27272A] dark:text-[#E4E4E7] truncate">{value || "—"}</div>
    </div>
  </div>
);

const stateBadgeClass = (state: string) => {
  const s = state.toLowerCase();
  if (s === "approved") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
  if (s === "rejected" || s === "cancelled") return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  if (s === "draft") return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
  return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
};

const actionIcon = (action: string) => {
  const a = action.toLowerCase();
  if (a.includes("approve") || a.includes("submit")) return <CheckCircle className="h-4 w-4" />;
  if (a.includes("reject") || a.includes("cancel")) return <XCircle className="h-4 w-4" />;
  return <ArrowRightCircle className="h-4 w-4" />;
};

const getErrorText = (error: unknown, fallback = "") => {
  if (typeof error === "string") return error;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null) {
    const errorLike = error as Partial<Record<"message" | "_server_messages" | "exception", unknown>>;
    const value = errorLike.message || errorLike._server_messages || errorLike.exception;
    if (typeof value === "string" && value) return value;
  }
  return fallback;
};

// ── Workflow Timeline ─────────────────────────────────────────────────────────

const WorkflowTimeline: React.FC<{ currentState: string }> = ({ currentState }) => {
  const stages = WORKFLOW_STAGES.includes(currentState)
    ? WORKFLOW_STAGES
    : [...WORKFLOW_STAGES.slice(0, -1), currentState, "Approved"];

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex items-center min-w-max">
        {stages.map((stage, idx) => {
          const status = getStageStatus(stage, currentState);
          return (
            <React.Fragment key={stage}>
              <div className="flex flex-col items-center gap-1.5 min-w-[80px]">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0",
                  status === "completed" && "bg-emerald-500",
                  status === "in-progress" && "bg-[#4A6CF7]",
                  status === "pending" && "bg-zinc-300 dark:bg-zinc-600",
                  status === "failed" && "bg-red-500",
                )}>
                  {status === "completed" ? "✓" : status === "failed" ? "✗" : idx + 1}
                </div>
                <span className={cn(
                  "text-[10px] font-medium text-center leading-tight",
                  status === "in-progress" && "text-[#4A6CF7]",
                  status === "completed" && "text-emerald-600 dark:text-emerald-400",
                  status === "failed" && "text-red-500",
                  status === "pending" && "text-[#A1A1AA]",
                )}>
                  {stage}
                </span>
              </div>
              {idx < stages.length - 1 && (
                <div className={cn(
                  "h-0.5 flex-1 mx-2 min-w-[20px]",
                  getStageStatus(stages[idx + 1], currentState) !== "pending"
                    ? "bg-emerald-400"
                    : "bg-zinc-200 dark:bg-zinc-700",
                )} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

const ProjectStaffExtensionForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editDocName = searchParams.get("edit");
  const projectParam = searchParams.get("project") || "";
  const { currentUser } = useFrappeAuth();
  const { roles } = useUserRoles(currentUser ?? null);

  // Editable Form fields
  const [lastExtensionDate, setLastExtensionDate] = useState("");
  const [noOfMonthsWorked, setNoOfMonthsWorked] = useState("");
  const [noOfDaysWorked, setNoOfDaysWorked] = useState("");
  const [extensionPeriod, setExtensionPeriod] = useState("");
  const [extensionPeriodPI, setExtensionPeriodPI] = useState("");
  const [extensionPeriodStaff, setExtensionPeriodStaff] = useState("");
  const [incrementPI, setIncrementPI] = useState("");
  const [incrementStaff, setIncrementStaff] = useState("");

  const [savedPIPeriod, setSavedPIPeriod] = useState("");
  const [savedPIIncrement, setSavedPIIncrement] = useState("");
  const [savedStaffPeriod, setSavedStaffPeriod] = useState("");
  const [savedStaffIncrement, setSavedStaffIncrement] = useState("");

  const [docName, setDocName] = useState<string | null>(null);
  const [docstatus, setDocstatus] = useState(0);
  const [workflowState, setWorkflowState] = useState("Draft");
  const [loadedExtension, setLoadedExtension] = useState<ExtensionDoc | null>(null);
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [workflowComment, setWorkflowComment] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [isCommittedForGate, setIsCommittedForGate] = useState<boolean | null>(null);
  const [isEditing, setIsEditing] = useState(true);

  // ── Data fetching ───────────────────────────────────────────────────────────

  const { data: basicResp, isLoading: basicLoading } = useFrappeGetCall<{
    message: BasicDetails | null;
  }>(
    "rndopsapp.rndopsapp.doctype.project_staff_details.project_staff_details.get_my_basic_details",
    undefined,
    currentUser ? undefined : null,
    { revalidateOnFocus: false },
  );
  const basic = basicResp?.message ?? null;
  const projectNo = basic?.project_no || loadedExtension?.ex_proj_no || projectParam;
  
  // Fetch Project Details (for project title)
  const { data: projectList } = useFrappeGetCall<{ message: { project_title: string }[] }>(
    "frappe.client.get_list",
    {
      doctype: "Project Registration",
      filters: [["project_no", "=", projectNo]],
      fields: ["project_title"],
      limit_page_length: 1,
    },
    projectNo ? undefined : null,
    { revalidateOnFocus: false }
  );
  const projectTitle = basic?.project_name || (projectList?.message as any)?.[0]?.project_title || loadedExtension?.ex_proj_name || "";

  const fullName = basic
    ? [basic.ps_first_name, basic.ps_middle_name, basic.ps_last_name].filter(Boolean).join(" ")
    : loadedExtension?.ex_name || currentUser || "";
  const { heads: budgetHeads, actualBalance } = useProjectBudget(projectNo);

  const { call: fetchDoc, loading: editDocLoading } = useFrappePostCall<{ message: ExtensionDoc }>(
    "frappe.client.get",
  );

  const { data: listResp, isLoading: listLoading } = useFrappeGetCall<{
    message: { status: string; data: ExtensionDoc[] };
  }>(
    extensionAPI.getList,
    undefined,
    currentUser ? undefined : null,
    { revalidateOnFocus: false },
  );

  const [isCreatingNew, setIsCreatingNew] = useState(searchParams.get("new") === "true");

  // Filter user applications (both Draft and Submitted/In-progress)
  const userApplications = React.useMemo(() => {
    if (!listResp?.message?.data || !currentUser) return [];
    return listResp.message.data.filter((r) => {
      const isMine =
        (basic?.ps_emp_id && r.ex_emp_id === basic.ps_emp_id) ||
        r.owner === currentUser ||
        (currentUser && r.owner?.toLowerCase() === currentUser.toLowerCase());
      return isMine && r.docstatus !== 2;
    });
  }, [listResp, basic, currentUser]);

  useEffect(() => {
    if (editDocName) return;
    if (basic) {
      setNoOfMonthsWorked(basic.no_of_months_worked !== undefined && basic.no_of_months_worked !== null ? String(basic.no_of_months_worked) : "");
      setNoOfDaysWorked(basic.no_of_days_worked !== undefined && basic.no_of_days_worked !== null ? String(basic.no_of_days_worked) : "");
      setLastExtensionDate(basic.ex_last_ex_date ?? "");
    }
  }, [basic, editDocName]);

  useEffect(() => {
    if (!editDocName) return;
    let cancelled = false;

    const loadEditDoc = async () => {
      try {
        const res = await fetchDoc({
          doctype: "Project Staff Extension",
          name: editDocName,
        });
        const doc = res?.message;
        if (!doc || cancelled) return;
        setLoadedExtension(doc);
        setDocName(doc.name);
        setDocstatus(doc.docstatus ?? 0);
        setWorkflowState(doc.workflow_state ?? "Draft");
        setLastExtensionDate(doc.ex_last_ex_date ?? "");
        setNoOfMonthsWorked(doc.ex_no_of_mon_worked ?? "");
        setNoOfDaysWorked(doc.ex_no_of_days_worked ?? "");
        setExtensionPeriod(doc.ex_period ?? "");
        setExtensionPeriodPI(doc.ex_period_pi ?? "");
        setExtensionPeriodStaff(doc.ex_period_staff ?? "");
        setIncrementPI(doc.increment_by_pi ?? "");
        setIncrementStaff(doc.increment_by_staff ?? "");
        setSavedPIPeriod(doc.ex_period_pi ?? "");
        setSavedPIIncrement(doc.increment_by_pi ?? "");
        setSavedStaffPeriod(doc.ex_period_staff ?? "");
        setSavedStaffIncrement(doc.increment_by_staff ?? "");
        setIsEditing(false);
      } catch (error: unknown) {
        if (!cancelled) showToast("error", getErrorText(error, "Failed to load extension."));
      }
    };

    loadEditDoc();
    return () => {
      cancelled = true;
    };
  }, [editDocName, fetchDoc]);

  // Fetch workflow actions whenever the doc or its state changes
  const { call: fetchWorkflowActions } = useFrappePostCall<WorkflowActionsResponse>(
    extensionAPI.getWorkflowActions,
  );

  const refreshActions = useCallback(async (name: string) => {
    const res = await fetchWorkflowActions({ docname: name });
    if (res?.message?.status === "success") {
      setAvailableActions(res.message.actions ?? []);
      setWorkflowState((current) => res.message.workflow_state ?? current);
      setDocstatus((current) => res.message.docstatus ?? current);
    }
  }, [fetchWorkflowActions]);

  useEffect(() => {
    if (docName) refreshActions(docName);
  }, [docName, refreshActions]);

  // ── API hooks ───────────────────────────────────────────────────────────────

  const { call: saveExtension } = useFrappePostCall<{
    message: { status: string; docname: string };
  }>(extensionAPI.save);

  const { call: performAction } = useFrappePostCall<{
    message: { status: string; message?: string; workflow_state?: string; docstatus?: number; next_actions?: string[] };
  }>(extensionAPI.performAction);

  const { call: directSubmit } = useFrappePostCall<{
    message: { status: string; docstatus?: number };
  }>(extensionAPI.submit);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4500);
  };

  const buildPayload = () => ({
    ...(docName ? { name: docName } : {}),
    ex_proj_name: projectTitle,
    ex_proj_no: projectNo,
    ex_name: fullName,
    ex_emp_id: basic?.ps_emp_id || loadedExtension?.ex_emp_id || "",
    ex_designation: basic?.ps_designation || loadedExtension?.ex_designation || "",
    department: basic?.ps_department_name || basic?.ps_department || loadedExtension?.department || "",
    ex_doj: basic?.ps_joining_date || loadedExtension?.ex_doj || "",
    ex_date_of_expiry: basic?.ps_term_completion_date || loadedExtension?.ex_date_of_expiry || "",
    ex_current_basic: basic?.ps_basic_salary || loadedExtension?.ex_current_basic || "",
    ex_last_ex_date: lastExtensionDate || null,
    ex_no_of_mon_worked: noOfMonthsWorked,
    ex_no_of_days_worked: noOfDaysWorked,
    ex_period: extensionPeriod,
    ex_period_pi: extensionPeriodPI,
    ex_period_staff: extensionPeriodStaff,
    increment_by_pi: incrementPI,
    increment_by_staff: incrementStaff,
  });

  const handleSave = async () => {
    if (!extensionPeriod) { showToast("error", "Please select the period of extension."); return; }
    setIsBusy(true);
    try {
      const res = await saveExtension({ doc_data: JSON.stringify(buildPayload()) });
      if (res?.message?.status === "success") {
        const newName = res.message.docname;
        setDocName(newName);
        if (!docName) {
          setDocstatus(0);
          setWorkflowState("Draft");
        }
        setSavedPIPeriod(extensionPeriodPI);
        setSavedPIIncrement(incrementPI);
        setSavedStaffPeriod(extensionPeriodStaff);
        setSavedStaffIncrement(incrementStaff);
        setIsEditing(false);
        showToast("success", "Extension saved successfully as Draft.");
        await refreshActions(newName);
      } else {
        showToast("error", "Save failed. Please try again.");
      }
    } catch (e: unknown) {
      showToast("error", getErrorText(e, "Save failed."));
    } finally {
      setIsBusy(false);
    }
  };

  const handleActionConfirm = async (comment: string, actionToRun: string) => {
    if (!docName) {
      showToast("error", "Please Save as draft before submitting");
      return;
    }

    if (workflowState === "Draft" && !extensionPeriod) {
      showToast("error", "Please select the extension period before submitting.");
      setPendingAction(null);
      return;
    }

    const actionLower = actionToRun.toLowerCase();
    const isPositiveAction = actionLower.includes("approve") || actionLower.includes("forward") || actionLower.includes("submit");

    if (isPositiveAction && workflowState === "Pending PI Approval" && !extensionPeriodPI) {
      showToast("error", "Please select the extension period suggested by PI.");
      setPendingAction(null);
      return;
    }

    if (isPositiveAction && workflowState === "Pending Staff Approval" && !extensionPeriodStaff) {
      showToast("error", "Please select the extension period allowed by Staff.");
      setPendingAction(null);
      return;
    }

    setIsBusy(true);
    try {
      if (
        workflowState === "Draft" ||
        workflowState === "Pending PI Approval" ||
        workflowState === "Pending Staff Approval"
      ) {
        await saveExtension({ doc_data: JSON.stringify(buildPayload()) });
      }

      let succeeded = false;
      let actionError: unknown = null;
      let actionStatusMsg = "";

      try {
        const res = await performAction({ docname: docName, action: actionToRun, comment });
        if (res?.message?.status === "success") {
          setWorkflowState(res.message.workflow_state ?? workflowState);
          setDocstatus(res.message.docstatus ?? docstatus);
          setAvailableActions(res.message.next_actions ?? []);
          showToast("success", res.message.message ?? `Action '${actionToRun}' completed.`);
          succeeded = true;
        } else {
          // Endpoint responded but did not complete the transition — keep the reason.
          actionStatusMsg = res?.message?.message ?? "";
        }
      } catch (err: unknown) {
        actionError = err;
      }

      const errMsg = getErrorText(actionError);
      if (!succeeded && errMsg.includes("Illegal Document Status")) {
        showToast(
          "error",
          "Document state is out of sync. Refreshing — please retry if needed.",
        );
        await refreshActions(docName);
        return;
      }

      // Fallback: any submit/forward-style action out of Draft should still push the
      // document into the workflow via a plain submit when the workflow endpoint could
      // not resolve the named transition (action-label mismatch, or the workflow not yet
      // reloaded on the backend). Previously this only fired for an exact "Submit" label,
      // so a differently-named Draft action left the applicant stuck on "Action failed".
      const isSubmitLike =
        actionToRun.toLowerCase().includes("submit") ||
        actionToRun.toLowerCase().includes("forward");
      if (!succeeded && workflowState === "Draft" && isSubmitLike) {
        try {
          const fallback = await directSubmit({ docname: docName });
          if (
            fallback?.message?.status === "success" ||
            fallback?.message?.status === "info" ||
            fallback?.message?.docstatus === 1
          ) {
            setDocstatus(1);
            setWorkflowState("Pending PI Approval");
            setAvailableActions([]);
            showToast("success", "Extension application submitted successfully.");
            succeeded = true;
            await refreshActions(docName);
          }
        } catch (err: unknown) {
          if (!actionError) actionError = err;
        }
      }

      if (!succeeded) {
        const detail = actionStatusMsg || getErrorText(actionError);
        showToast("error", detail ? `Submission failed: ${detail}` : "Action failed. Please try again.");
      } else {
        setWorkflowComment("");
      }
    } catch (e: unknown) {
      showToast("error", getErrorText(e, "Action failed."));
    } finally {
      setIsBusy(false);
      setPendingAction(null);
    }
  };

  const handleWorkflowAction = async (action: string) => {
    if (workflowState === "Draft" && !docName) {
      showToast("error", "Please Save as draft before submitting");
      return;
    }
    const comment = workflowComment.trim();
    if (!comment) {
      showToast("error", "Please enter a comment before performing this action.");
      return;
    }
    setPendingAction(action);
    await handleActionConfirm(comment, action);
  };

  // ── Derived state ────────────────────────────────────────────────────────────
  const isLoading = basicLoading || listLoading || editDocLoading;
  const isEditMode = !!editDocName;
  const hasFormData = !!basic || !!loadedExtension || (!isEditMode && !!currentUser);
  const applicantEmpId = basic?.ps_emp_id || loadedExtension?.ex_emp_id || "";
  const applicantDesignation = basic?.ps_designation || loadedExtension?.ex_designation || "";
  const applicantDepartment = basic?.ps_department_name || basic?.ps_department || loadedExtension?.department || "";
  const dateOfJoining = basic?.ps_joining_date || loadedExtension?.ex_doj || "";
  const expiryOfTenure = basic?.ps_term_completion_date || loadedExtension?.ex_date_of_expiry || "";
  const currentBasic = basic?.ps_basic_salary || loadedExtension?.ex_current_basic || "";

  const isTerminal = workflowState === "Approved" || workflowState === "Rejected" || workflowState === "Cancelled";
  const isEditable = workflowState === "Draft" && docstatus === 0;
  const canEdit = isEditable && isEditing;
  
  const isRnDStaff = roles.some((r) => {
    const lower = r.toLowerCase();
    return (
      lower.includes("rnd staff") ||
      lower.includes("r&d staff") ||
      lower.includes("research and development staff") ||
      lower.includes("staff, rnd") ||
      lower.includes("system manager")
    );
  });

  const isPI = roles.some((r) => {
    const lower = r.toLowerCase();
    return (
      lower.includes("pi") ||
      lower.includes("principal investigator") ||
      lower.includes("faculty") ||
      lower.includes("system manager")
    );
  });

  const isFromRegistry = searchParams.get("fromRegistry") === "true";

  // User can act on PI Approval if they have PI role OR backend returns available actions
  const isPIActor = workflowState === "Pending PI Approval" && (isPI || availableActions.length > 0);

  // User can act on Staff Approval if they have Staff role OR backend returns available actions
  const isStaffActor = workflowState === "Pending Staff Approval" && (isRnDStaff || availableActions.length > 0);

  // User can act on other non-terminal workflow states if backend returns available actions
  const isOtherActor =
    !isTerminal &&
    workflowState !== "Draft" &&
    workflowState !== "Pending PI Approval" &&
    workflowState !== "Pending Staff Approval" &&
    availableActions.length > 0;

  const canUserActOnCurrentState = Boolean(
    !isFromRegistry &&
    !isTerminal &&
      ((workflowState === "Draft" && isEditable) ||
        isPIActor ||
        isStaffActor ||
        isOtherActor)
  );

  const canEditPIFields = !isFromRegistry && isPIActor;
  const canEditStaffFields = !isFromRegistry && isStaffActor;

  const hasUnsavedEvaluationChanges =
    (canEditPIFields && (extensionPeriodPI !== savedPIPeriod || incrementPI !== savedPIIncrement)) ||
    (canEditStaffFields && (extensionPeriodStaff !== savedStaffPeriod || incrementStaff !== savedStaffIncrement));
  
  const showCommitSection =
    !!docName &&
    !!projectNo &&
    isStaffActor &&
    workflowState === "Pending Staff Approval";
  const commitRequired = showCommitSection && isCommittedForGate === false;
  const projectData = { applicant_prj_num: projectNo };

  const workflowActions = canUserActOnCurrentState
    ? availableActions.length > 0
      ? availableActions
      : workflowState === "Draft"
        ? ["Submit"]
        : isPIActor
          ? ["Forward", "Reject"]
          : isStaffActor
            ? ["Forward", "Reject"]
            : []
    : [];

  // ── Render ───────────────────────────────────────────────────────────────────

  // Loading state when initial list is fetching and user hasn't selected a doc
  if (!editDocName && listLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#18181B] flex items-center justify-center">
        <AppSidebar />
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#4A6CF7]" />
          <p className="text-sm font-medium text-[#71717A] dark:text-[#A1A1AA]">
            Loading Extension Applications...
          </p>
        </div>
      </div>
    );
  }

  // If user has existing applications (Submitted or Draft) and is not opening a specific doc or creating new
  if (!editDocName && !isCreatingNew && userApplications.length > 0) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#18181B]">
        <AppSidebar />
        <main className="flex-1 p-4 md:p-8">
          <div className="w-full max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <button
                  onClick={() => navigate("/project-staff-dashboard")}
                  className="flex items-center gap-1.5 text-sm text-[#71717A] hover:text-[#3F3F46] dark:text-[#A1A1AA] dark:hover:text-[#E4E4E7] mb-2 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" /> Back to Dashboard
                </button>
                <h1 className="text-2xl font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] tracking-tight">
                  Project Staff Extension — My Applications
                </h1>
                <p className="text-sm text-[#71717A] dark:text-[#A1A1AA] mt-1">
                  You have existing extension applications. Click <strong>Edit</strong> to view or edit an application.
                </p>
              </div>
            </div>

            {/* List Table */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-[#4A6CF7]/10 rounded-lg">
                    <FileText className="h-4 w-4 text-[#4A6CF7]" />
                  </div>
                  <h2 className="font-bold text-[#3F3F46] dark:text-[#E4E4E7] text-sm uppercase tracking-wide">
                    My Extension Applications ({userApplications.length})
                  </h2>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-xs font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700">
                    <tr>
                      <th className="px-5 py-3.5">Application ID</th>
                      <th className="px-5 py-3.5">Project No</th>
                      <th className="px-5 py-3.5">Extension Period</th>
                      <th className="px-5 py-3.5">Workflow State</th>
                      <th className="px-5 py-3.5">Last Saved</th>
                      <th className="px-5 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                    {userApplications.map((app) => {
                      const stateText = app.workflow_state || (app.docstatus === 1 ? "Submitted" : "Draft");
                      const isDraft = app.docstatus === 0 && (!app.workflow_state || app.workflow_state === "Draft");
                      return (
                        <tr key={app.name} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-700/30 transition-colors">
                          <td className="px-5 py-4 font-semibold text-[#27272A] dark:text-[#E4E4E7]">
                            {app.name}
                          </td>
                          <td className="px-5 py-4 text-[#71717A] dark:text-[#A1A1AA]">
                            {app.ex_proj_no || projectNo || "—"}
                          </td>
                          <td className="px-5 py-4 text-[#71717A] dark:text-[#A1A1AA]">
                            {app.ex_period ? `${app.ex_period} Months` : "—"}
                          </td>
                          <td className="px-5 py-4">
                            <span className={cn(
                              "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
                              stateBadgeClass(stateText)
                            )}>
                              {stateText}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-[#71717A] dark:text-[#A1A1AA] text-xs">
                            {new Date((app as any).modified || (app as any).creation || Date.now()).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => navigate(`/project-staff-extension?edit=${app.name}`)}
                              className={cn(
                                "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm",
                                isDraft
                                  ? "text-white bg-[#4A6CF7] hover:bg-[#3b5cf6]"
                                  : "text-[#3F3F46] dark:text-[#E4E4E7] bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600"
                              )}
                            >
                              {isDraft ? "Edit" : "View"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#18181B]">
      <AppSidebar />
      <main className="flex-1 p-4 md:p-8">
        <div className="w-full max-w-9xl mx-auto">

          {/* Back + Header */}
          <div className="mb-6">
            <button
              onClick={() => navigate("/project-staff-dashboard")}
              className="flex items-center gap-1.5 text-sm text-[#71717A] hover:text-[#3F3F46] dark:text-[#A1A1AA] dark:hover:text-[#E4E4E7] mb-3 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" /> Back to Dashboard
            </button>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h1 className="text-2xl font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] tracking-tight">
                  Extension Form
                </h1>
                <p className="text-sm text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
                  Project Staff Re-Engagement / Extension Request
                </p>
              </div>
              {workflowState && (
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-semibold",
                  stateBadgeClass(workflowState),
                )}>
                  {workflowState}
                </span>
              )}
            </div>
          </div>

          {/* Toast */}
          {toast && (
            <div className={cn(
              "flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-medium mb-5 shadow-sm",
              toast.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800"
                : "bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
            )}>
              {toast.type === "success"
                ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
              {toast.msg}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-[#4A6CF7]" />
            </div>
          ) : !hasFormData ? (
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm p-8 text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-amber-400" />
              <p className="text-sm font-medium text-[#3F3F46] dark:text-[#E4E4E7]">
                {isEditMode
                  ? "No extension record could be loaded."
                  : "Project staff details could not be loaded."}
              </p>
              <p className="text-xs text-[#71717A] dark:text-[#A1A1AA] mt-1">
                Contact your administrator if this is incorrect.
              </p>
            </div>
          ) : (
            <div className={cn((showCommitSection || docName) ? "grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6" : "space-y-5")}>
              <div className="space-y-5 min-w-0">

                {/* Workflow Timeline */}
                {docName && (
                  <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm p-5">
                    <h2 className="font-bold text-[#3F3F46] dark:text-[#E4E4E7] text-sm uppercase tracking-wide mb-4">
                      Approval Status
                    </h2>
                    <WorkflowTimeline currentState={workflowState} />
                  </div>
                )}

                {/* Applicant Details — read-only, prefilled */}
                <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-[#4A6CF7]/10 rounded-lg">
                      <UserIcon className="h-4 w-4 text-[#4A6CF7]" />
                    </div>
                    <h2 className="font-bold text-[#3F3F46] dark:text-[#E4E4E7] text-sm uppercase tracking-wide">
                      Applicant Details
                    </h2>
                    <span className="ml-auto text-[10px] text-[#A1A1AA] italic">Auto-filled from your profile</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoRow icon={<UserIcon className="h-4 w-4" />} label="Full Name" value={fullName} />
                    <InfoRow icon={<IdCard className="h-4 w-4" />} label="Employee ID" value={applicantEmpId} />
                    <InfoRow
                      icon={<FolderOpen className="h-4 w-4" />}
                      label="Project No."
                      value={
                        <div className="flex items-center gap-2 flex-wrap">
                           <span>{projectNo}</span>
                           {isRnDStaff && projectNo && (
                             <ViewProjectButton
                               doctype="Project Staff Extension"
                               data={loadedExtension || { ex_proj_no: projectNo }}
                             />
                           )}
                        </div>
                      }
                    />
                    <InfoRow icon={<FileText className="h-4 w-4" />} label="Project Name" value={projectTitle} />
                    <InfoRow icon={<Briefcase className="h-4 w-4" />} label="Designation" value={applicantDesignation} />
                    <InfoRow icon={<Building2 className="h-4 w-4" />} label="Department" value={applicantDepartment} />
                    <InfoRow icon={<CalendarDays className="h-4 w-4" />} label="Date of Joining" value={dateOfJoining} />
                    <InfoRow icon={<Clock className="h-4 w-4" />} label="Date of Expiry of Tenure" value={expiryOfTenure} />
                    <InfoRow icon={<IndianRupee className="h-4 w-4" />} label="Current Basic Pay" value={currentBasic} />
                  </div>
                </div>

                {/* Extension Details — editable in Draft only */}
                <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-[#4A6CF7]/10 rounded-lg">
                      <CalendarDays className="h-4 w-4 text-[#4A6CF7]" />
                    </div>
                    <h2 className="font-bold text-[#3F3F46] dark:text-[#E4E4E7] text-sm uppercase tracking-wide">
                      Extension Details
                    </h2>
                  </div>

                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center gap-1.5 text-sm font-medium text-[#3F3F46] dark:text-[#E4E4E7] mb-1.5">
                          Date of Last Extension
                        </label>
                        {canEdit ? (
                          <input
                            type="date"
                            value={lastExtensionDate}
                            onChange={(e) => setLastExtensionDate(e.target.value)}
                            disabled={isBusy}
                            className={cn(
                              "w-full px-3 py-2 text-sm rounded-lg border transition-colors",
                              "bg-white dark:bg-zinc-900 text-[#27272A] dark:text-[#E4E4E7]",
                              "border-zinc-200 dark:border-zinc-700",
                              "focus:outline-none focus:ring-2 focus:ring-[#4A6CF7]/30 focus:border-[#4A6CF7]",
                              "disabled:opacity-60 disabled:cursor-not-allowed",
                            )}
                          />
                        ) : (
                          <p className="text-sm font-medium text-[#27272A] dark:text-[#E4E4E7]">
                            {lastExtensionDate || "—"}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="flex items-center gap-1.5 text-sm font-medium text-[#3F3F46] dark:text-[#E4E4E7] mb-1.5">
                          Number of Months Worked
                        </label>
                        {canEdit ? (
                          <input
                            type="text"
                            value={noOfMonthsWorked}
                            onChange={(e) => setNoOfMonthsWorked(e.target.value)}
                            disabled={isBusy}
                            placeholder="e.g. 12"
                            className={cn(
                              "w-full px-3 py-2 text-sm rounded-lg border transition-colors",
                              "bg-white dark:bg-zinc-900 text-[#27272A] dark:text-[#E4E4E7]",
                              "border-zinc-200 dark:border-zinc-700",
                              "focus:outline-none focus:ring-2 focus:ring-[#4A6CF7]/30 focus:border-[#4A6CF7]",
                              "disabled:opacity-60 disabled:cursor-not-allowed",
                            )}
                          />
                        ) : (
                          <p className="text-sm font-medium text-[#27272A] dark:text-[#E4E4E7]">
                            {noOfMonthsWorked || "—"}
                          </p>
                        )}
                      </div>

                      {((noOfMonthsWorked && parseInt(noOfMonthsWorked, 10) < 1) || noOfMonthsWorked === "0" || !noOfMonthsWorked) && (
                        <div>
                          <label className="flex items-center gap-1.5 text-sm font-medium text-[#3F3F46] dark:text-[#E4E4E7] mb-1.5">
                            Number of Days Worked
                          </label>
                          {canEdit ? (
                            <input
                              type="text"
                              value={noOfDaysWorked}
                              onChange={(e) => setNoOfDaysWorked(e.target.value)}
                              disabled={isBusy}
                              placeholder="e.g. 15"
                              className={cn(
                                "w-full px-3 py-2 text-sm rounded-lg border transition-colors",
                                "bg-white dark:bg-zinc-900 text-[#27272A] dark:text-[#E4E4E7]",
                                "border-zinc-200 dark:border-zinc-700",
                                "focus:outline-none focus:ring-2 focus:ring-[#4A6CF7]/30 focus:border-[#4A6CF7]",
                                "disabled:opacity-60 disabled:cursor-not-allowed",
                              )}
                            />
                          ) : (
                            <p className="text-sm font-medium text-[#27272A] dark:text-[#E4E4E7]">
                              {noOfDaysWorked || "—"}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#3F3F46] dark:text-[#E4E4E7] mb-1.5">
                        Period Of Re-Engagement / Extension Sought (Months)
                        {canEdit && <span className="text-red-500 ml-0.5">*</span>}
                      </label>
                      {canEdit ? (
                        <select
                          value={extensionPeriod}
                          onChange={(e) => setExtensionPeriod(e.target.value)}
                          disabled={isBusy}
                          required
                          className={cn(
                            "w-full sm:w-64 px-3 py-2 text-sm rounded-lg border transition-colors",
                            "bg-white dark:bg-zinc-900 text-[#27272A] dark:text-[#E4E4E7]",
                            "border-zinc-200 dark:border-zinc-700",
                            "focus:outline-none focus:ring-2 focus:ring-[#4A6CF7]/30 focus:border-[#4A6CF7]",
                            "disabled:opacity-60 disabled:cursor-not-allowed",
                          )}
                        >
                          <option value="">Select Months...</option>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((m) => (
                            <option key={m} value={String(m)}>
                              {m} {m === 1 ? "Month" : "Months"}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-sm font-medium text-[#27272A] dark:text-[#E4E4E7]">
                          {extensionPeriod ? `${extensionPeriod} Months` : "—"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* PI Evaluation — visible if not in Draft state or if it already has values */}
                {(workflowState !== "Draft" || extensionPeriodPI || incrementPI || isEditing) && (
                  <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 bg-[#4A6CF7]/10 rounded-lg">
                        <UserCheck className="h-4 w-4 text-[#4A6CF7]" />
                      </div>
                      <h2 className="font-bold text-[#3F3F46] dark:text-[#E4E4E7] text-sm uppercase tracking-wide">
                        PI Recommendation / Evaluation
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#3F3F46] dark:text-[#E4E4E7] mb-1.5">
                          Period Of Re-Engagement / Extension Suggested by PI (Months)
                          {canEditPIFields && <span className="text-red-500 ml-0.5">*</span>}
                        </label>
                        {canEditPIFields ? (
                          <select
                            value={extensionPeriodPI}
                            onChange={(e) => setExtensionPeriodPI(e.target.value)}
                            disabled={isBusy}
                            required
                            className={cn(
                              "w-full px-3 py-2 text-sm rounded-lg border transition-colors",
                              "bg-white dark:bg-zinc-900 text-[#27272A] dark:text-[#E4E4E7]",
                              "border-zinc-200 dark:border-zinc-700",
                              "focus:outline-none focus:ring-2 focus:ring-[#4A6CF7]/30 focus:border-[#4A6CF7]",
                              "disabled:opacity-60 disabled:cursor-not-allowed",
                            )}
                          >
                            <option value="">Select Months...</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((m) => (
                              <option key={m} value={String(m)}>
                                {m} {m === 1 ? "Month" : "Months"}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-sm font-medium text-[#27272A] dark:text-[#E4E4E7]">
                            {extensionPeriodPI ? `${extensionPeriodPI} Months` : "—"}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[#3F3F46] dark:text-[#E4E4E7] mb-1.5">
                          Increment Recommended by PI (Rs.)
                        </label>
                        {canEditPIFields ? (
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-zinc-400 text-sm">₹</span>
                            <input
                              type="text"
                              value={incrementPI}
                              onChange={(e) => setIncrementPI(e.target.value)}
                              disabled={isBusy}
                              placeholder="e.g. 2000 (enter 0 for no increment)"
                              className={cn(
                                "w-full pl-7 pr-3 py-2 text-sm rounded-lg border transition-colors",
                                "bg-white dark:bg-zinc-900 text-[#27272A] dark:text-[#E4E4E7]",
                                "border-zinc-200 dark:border-zinc-700",
                                "focus:outline-none focus:ring-2 focus:ring-[#4A6CF7]/30 focus:border-[#4A6CF7]",
                                "disabled:opacity-60 disabled:cursor-not-allowed",
                              )}
                            />
                          </div>
                        ) : (
                          <p className="text-sm font-medium text-[#27272A] dark:text-[#E4E4E7]">
                            {incrementPI ? `₹${incrementPI}` : "—"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Staff Evaluation — visible if not in Draft/Pending PI states or if it already has values */}
                {((workflowState !== "Draft" && workflowState !== "Pending PI Approval") || extensionPeriodStaff || incrementStaff || isEditing) && (
                  <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="p-1.5 bg-[#4A6CF7]/10 rounded-lg">
                        <TrendingUp className="h-4 w-4 text-[#4A6CF7]" />
                      </div>
                      <h2 className="font-bold text-[#3F3F46] dark:text-[#E4E4E7] text-sm uppercase tracking-wide">
                        R&D Staff Decision / Evaluation
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#3F3F46] dark:text-[#E4E4E7] mb-1.5">
                          Period Of Re-Engagement / Extension Allowed by Staff (Months)
                          {canEditStaffFields && <span className="text-red-500 ml-0.5">*</span>}
                        </label>
                        {canEditStaffFields ? (
                          <select
                            value={extensionPeriodStaff}
                            onChange={(e) => setExtensionPeriodStaff(e.target.value)}
                            disabled={isBusy}
                            required
                            className={cn(
                              "w-full px-3 py-2 text-sm rounded-lg border transition-colors",
                              "bg-white dark:bg-zinc-900 text-[#27272A] dark:text-[#E4E4E7]",
                              "border-zinc-200 dark:border-zinc-700",
                              "focus:outline-none focus:ring-2 focus:ring-[#4A6CF7]/30 focus:border-[#4A6CF7]",
                              "disabled:opacity-60 disabled:cursor-not-allowed",
                            )}
                          >
                            <option value="">Select Months...</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((m) => (
                              <option key={m} value={String(m)}>
                                {m} {m === 1 ? "Month" : "Months"}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <p className="text-sm font-medium text-[#27272A] dark:text-[#E4E4E7]">
                            {extensionPeriodStaff ? `${extensionPeriodStaff} Months` : "—"}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[#3F3F46] dark:text-[#E4E4E7] mb-1.5">
                          Increment Allowed by Staff (Rs.)
                        </label>
                        {canEditStaffFields ? (
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-zinc-400 text-sm">₹</span>
                            <input
                              type="text"
                              value={incrementStaff}
                              onChange={(e) => setIncrementStaff(e.target.value)}
                              disabled={isBusy}
                              placeholder="e.g. 2000 (enter 0 for no increment)"
                              className={cn(
                                "w-full pl-7 pr-3 py-2 text-sm rounded-lg border transition-colors",
                                "bg-white dark:bg-zinc-900 text-[#27272A] dark:text-[#E4E4E7]",
                                "border-zinc-200 dark:border-zinc-700",
                                "focus:outline-none focus:ring-2 focus:ring-[#4A6CF7]/30 focus:border-[#4A6CF7]",
                                "disabled:opacity-60 disabled:cursor-not-allowed",
                              )}
                            />
                          </div>
                        ) : (
                          <p className="text-sm font-medium text-[#27272A] dark:text-[#E4E4E7]">
                            {incrementStaff ? `₹${incrementStaff}` : "—"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Terminal state notice */}
                {isTerminal && (
                  <div className={cn(
                    "flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm border",
                    workflowState === "Approved"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300"
                      : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300",
                  )}>
                    {workflowState === "Approved"
                      ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                      : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
                    {workflowState === "Approved"
                      ? "Your extension request has been approved."
                      : `Your extension request has been ${workflowState.toLowerCase()}. No further actions are available.`}
                  </div>
                )}

                {/* Action Row — Save Draft (editable only) + Workflow actions */}
                {(!isTerminal && !isFromRegistry) && (
                  <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm p-5">
                    <h2 className="font-bold text-[#3F3F46] dark:text-[#E4E4E7] text-sm uppercase tracking-wide mb-4">
                      Actions
                    </h2>
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Edit — switch from read-only to edit mode while in Draft */}
                      {isEditable && !isEditing && (
                        <button
                          type="button"
                          onClick={() => setIsEditing(true)}
                          disabled={isBusy}
                          className={cn(
                            "inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all",
                            "bg-[#4A6CF7] text-white hover:bg-[#3b5cf6] shadow-sm",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                          )}
                        >
                          Edit
                        </button>
                      )}

                      {/* Save Draft — only while actively editing */}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={handleSave}
                          disabled={isBusy}
                          className={cn(
                            "inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all",
                            "bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600",
                            "text-[#3F3F46] dark:text-[#E4E4E7] hover:bg-zinc-50 dark:hover:bg-zinc-600",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                          )}
                        >
                          {isBusy && !pendingAction && <Loader2 className="h-4 w-4 animate-spin" />}
                          Save Draft
                        </button>
                      )}

                      {/* Save Changes button for PI or Staff evaluations */}
                      {(canEditPIFields || canEditStaffFields) && (
                        <button
                          type="button"
                          onClick={handleSave}
                          disabled={isBusy}
                          className={cn(
                            "inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all",
                            "bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600",
                            "text-[#3F3F46] dark:text-[#E4E4E7] hover:bg-zinc-50 dark:hover:bg-zinc-600",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                          )}
                        >
                          {isBusy && !pendingAction && <Loader2 className="h-4 w-4 animate-spin" />}
                          Save Changes
                        </button>
                      )}

                      {workflowActions.length > 0 && (
                        <div className="basis-full">
                          <label className="flex items-center gap-1.5 text-sm font-medium text-[#3F3F46] dark:text-[#E4E4E7] mb-1.5">
                            <MessageSquare className="h-4 w-4 text-[#A1A1AA]" />
                            Workflow Comment
                            <span className="text-red-500 ml-0.5">*</span>
                          </label>
                          <textarea
                             value={workflowComment}
                             onChange={(e) => setWorkflowComment(e.target.value)}
                             disabled={isBusy}
                             rows={3}
                             placeholder="Add a comment for the workflow audit trail..."
                             className={cn(
                               "w-full px-3 py-2 text-sm rounded-lg border transition-colors resize-none",
                               "bg-white dark:bg-zinc-900 text-[#27272A] dark:text-[#E4E4E7]",
                               "border-zinc-200 dark:border-zinc-700 placeholder:text-[#A1A1AA]",
                               "focus:outline-none focus:ring-2 focus:ring-[#4A6CF7]/30 focus:border-[#4A6CF7]",
                               "disabled:opacity-60 disabled:cursor-not-allowed",
                             )}
                          />
                        </div>
                      )}

                      {/* Workflow action buttons */}
                      {workflowActions.map((action) => {
                        const isForwardOrApprove =
                          action.toLowerCase().includes("forward") ||
                          action.toLowerCase().includes("approve") ||
                          action.toLowerCase().includes("submit");

                        const evaluationUnsaved = isForwardOrApprove && hasUnsavedEvaluationChanges;
                        const isDraftUnsaved = isForwardOrApprove && workflowState === "Draft" && !docName;
                        const isDisabled = isBusy || commitRequired || !workflowComment.trim() || evaluationUnsaved || isDraftUnsaved;

                        let tooltipText: string | undefined = undefined;
                        if (isDraftUnsaved) {
                          tooltipText = "Please Save as draft before submitting";
                        } else if (evaluationUnsaved) {
                          tooltipText = "Please Click save changes before forwarding";
                        } else if (commitRequired) {
                          tooltipText = "Submit a commitment first";
                        } else if (!workflowComment.trim()) {
                          tooltipText = "Enter a workflow comment first";
                        }

                        return (
                          <span key={action} title={tooltipText} className="inline-block">
                            <button
                              type="button"
                              onClick={() => handleWorkflowAction(action)}
                              disabled={isDisabled}
                              className={cn(
                                "inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all shadow-sm",
                                getActionButtonStyle(action),
                                "disabled:opacity-50 disabled:cursor-not-allowed",
                              )}
                            >
                              {actionIcon(action)}
                              {action}
                            </button>
                          </span>
                        );
                      })}

                      {/* Fallback Submit */}
                      {docName && isEditable && !availableActions.some(
                        (a) => a.toLowerCase().includes("submit") || a.toLowerCase().includes("forward"),
                      ) && (
                          <button
                            type="button"
                            onClick={() => {
                              setPendingAction("Submit");
                              handleActionConfirm(workflowComment.trim() || "Submitted for approval", "Submit");
                            }}
                            disabled={isBusy}
                            className={cn(
                              "inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all shadow-sm",
                              "bg-[#4A6CF7] hover:bg-[#3b5cf6] text-white",
                              "disabled:opacity-50 disabled:cursor-not-allowed",
                            )}
                          >
                            <CheckCircle className="h-4 w-4" />
                            Submit
                          </button>
                        )}

                      {workflowActions.length === 0 && !isEditable && (
                        <p className="text-sm text-[#71717A] dark:text-[#A1A1AA]">
                          No actions available for your role in this state.
                        </p>
                      )}
                    </div>

                    {commitRequired && (
                      <p className="mt-3 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                        A commitment must be submitted before forwarding this application.
                      </p>
                    )}
                    {hasUnsavedEvaluationChanges && (
                      <p className="mt-3 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                        Please click "Save Changes" before forwarding.
                      </p>
                    )}
                    {workflowState === "Draft" && !docName && (
                      <p className="mt-3 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                        Please Save as draft before submitting.
                      </p>
                    )}
                    {workflowActions.length > 0 && (
                      <p className="mt-3 text-[11px] text-[#A1A1AA] flex items-center gap-1.5">
                        <MessageSquare className="h-3 w-3" />
                        A comment is required for every workflow action to maintain an audit trail.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Right Sidebar Column: Commit window + Activity Log */}
              {(showCommitSection || docName) && (
                <aside className="space-y-5">
                  {showCommitSection && (
                    <CommitPayment
                      doctype="Project Staff Extension"
                      docName={docName || ""}
                      projectName={projectNo}
                      budgetHeads={budgetHeads}
                      actualBalance={actualBalance}
                      title="Release Extension Commitment"
                      description="Stage the project commitment required before forwarding this extension request."
                      onCommitSuccess={() => showToast("success", "Commitment staged successfully.")}
                      onStagingStatusChange={(committed) => setIsCommittedForGate(committed)}
                    />
                  )}

                  {docName && (
                    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm p-5">
                      <ActivityLog doctype="Project Staff Extension" docname={docName} maxHeight="600px" onlyComments />
                    </div>
                  )}
                </aside>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ProjectStaffExtensionForm;
