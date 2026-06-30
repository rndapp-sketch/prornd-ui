import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useFrappeAuth, useFrappeGetCall, useFrappePostCall } from "frappe-react-sdk";
import { AppSidebar } from "@/components/RndSidebar";
import { CommitPayment } from "@/components/CommitPayment";
import { useUserRoles } from "@/components/UserRole";
import ViewProjectButton from "@/components/ViewProjectButton";
import { useProjectBudget } from "@/hooks/useProjectBudget";
import { resignationAPI } from "@/services/apiService";
import { getActionButtonStyle } from "@/utils/workflowUtils";
import {
  User as UserIcon, IdCard, Mail, Building2, Briefcase,
  FolderOpen, CalendarDays, FileText, AlertCircle, CheckCircle2,
  ChevronLeft, Loader2, MessageSquare,
  ArrowRightCircle, CheckCircle, XCircle,
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
  ps_designation?: string;
  ps_department?: string;
  ps_department_name?: string;
}

interface ResignationDoc {
  name: string;
  docstatus: number;
  workflow_state?: string;
  resignation_date?: string;
  reason?: string;
  applicant_email_id?: string;
  applicant_name?: string;
  applicant_emp_id?: string;
  applicant_prj_num?: string;
  applicant_designation?: string;
  applicant_department?: string;
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
// Order matches the typical resignation approval chain.
const WORKFLOW_STAGES = [
  "Draft",
  "Pending PI Approval",
  "Pending Staff Approval",
  "Pending HoS Approval",
  "Pending Dean Approval",
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

const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) => (
  <div className="flex items-start gap-3">
    <div className="mt-0.5 flex-shrink-0 text-[#A1A1AA]">{icon}</div>
    <div className="min-w-0">
      <p className="text-xs text-[#71717A] dark:text-[#A1A1AA]">{label}</p>
      <p className="text-sm font-medium text-[#27272A] dark:text-[#E4E4E7] truncate">{value || "—"}</p>
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

const ProjectStaffResignationForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editDocName = searchParams.get("edit");
  const projectParam = searchParams.get("project") || "";
  const { currentUser } = useFrappeAuth();
  const { roles } = useUserRoles(currentUser ?? null);

  const [resignationDate, setResignationDate] = useState("");
  const [reason, setReason] = useState("");
  const [docName, setDocName] = useState<string | null>(null);
  const [docstatus, setDocstatus] = useState(0);
  const [workflowState, setWorkflowState] = useState("Draft");
  const [loadedResignation, setLoadedResignation] = useState<ResignationDoc | null>(null);
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [workflowComment, setWorkflowComment] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [isCommittedForGate, setIsCommittedForGate] = useState<boolean | null>(null);
  // For new docs the form is editable on mount; loading an existing draft
  // shows a read-only view until the user clicks "Edit".
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
  const projectNo = basic?.project_no || loadedResignation?.applicant_prj_num || projectParam;
  const fullName = basic
    ? [basic.ps_first_name, basic.ps_middle_name, basic.ps_last_name].filter(Boolean).join(" ")
    : loadedResignation?.applicant_name || currentUser || "";
  const { heads: budgetHeads, actualBalance } = useProjectBudget(projectNo);

  const { call: fetchDoc, loading: editDocLoading } = useFrappePostCall<{ message: ResignationDoc }>(
    "frappe.client.get",
  );

  const { data: listResp, isLoading: listLoading } = useFrappeGetCall<{
    message: { status: string; data: ResignationDoc[] };
  }>(
    resignationAPI.getList,
    undefined,
    currentUser ? undefined : null,
    { revalidateOnFocus: false },
  );

  // Hydrate form from existing resignation record
  useEffect(() => {
    if (editDocName) return;
    if (!listResp?.message?.data || !basic?.erp_mail) return;
    const mine = listResp.message.data.find((r) => r.applicant_email_id === basic.erp_mail);
    if (mine) {
      setLoadedResignation(mine);
      setDocName(mine.name);
      setDocstatus(mine.docstatus ?? 0);
      setWorkflowState(mine.workflow_state ?? "Draft");
      setResignationDate(mine.resignation_date ?? "");
      setReason(mine.reason ?? "");
      setIsEditing(false);
    }
  }, [listResp, basic, editDocName]);

  useEffect(() => {
    if (!editDocName) return;
    let cancelled = false;

    const loadEditDoc = async () => {
      try {
        const res = await fetchDoc({
          doctype: "Project Staff Resignation",
          name: editDocName,
        });
        const doc = res?.message;
        if (!doc || cancelled) return;
        setLoadedResignation(doc);
        setDocName(doc.name);
        setDocstatus(doc.docstatus ?? 0);
        setWorkflowState(doc.workflow_state ?? "Draft");
        setResignationDate(doc.resignation_date ?? "");
        setReason(doc.reason ?? "");
        setIsEditing(false);
      } catch (error: unknown) {
        if (!cancelled) showToast("error", getErrorText(error, "Failed to load resignation."));
      }
    };

    loadEditDoc();
    return () => {
      cancelled = true;
    };
  }, [editDocName, fetchDoc]);

  // Fetch workflow actions whenever the doc or its state changes
  const { call: fetchWorkflowActions } = useFrappePostCall<WorkflowActionsResponse>(
    resignationAPI.getWorkflowActions,
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

  const { call: saveResignation } = useFrappePostCall<{
    message: { status: string; docname: string };
  }>(resignationAPI.save);

  const { call: performAction } = useFrappePostCall<{
    message: { status: string; message?: string; workflow_state?: string; docstatus?: number; next_actions?: string[] };
  }>(resignationAPI.performAction);

  const { call: directSubmit } = useFrappePostCall<{
    message: { status: string; docstatus?: number };
  }>(resignationAPI.submit);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4500);
  };

  const buildPayload = () => ({
    ...(docName ? { name: docName } : {}),
    applicant_email_id: basic?.erp_mail || loadedResignation?.applicant_email_id || currentUser || "",
    applicant_name: fullName,
    applicant_emp_id: basic?.ps_emp_id || loadedResignation?.applicant_emp_id || "",
    applicant_prj_num: projectNo,
    applicant_designation: basic?.ps_designation || loadedResignation?.applicant_designation || "",
    applicant_department: basic?.ps_department_name || basic?.ps_department || loadedResignation?.applicant_department || "",
    resignation_date: resignationDate,
    reason,
  });

  const handleSave = async () => {
    if (!resignationDate) { showToast("error", "Please enter the date of resignation."); return; }
    if (!reason.trim()) { showToast("error", "Please enter the reason for resignation."); return; }
    setIsBusy(true);
    try {
      const res = await saveResignation({ doc_data: JSON.stringify(buildPayload()) });
      if (res?.message?.status === "success") {
        const newName = res.message.docname;
        setDocName(newName);
        setDocstatus(0);
        setWorkflowState("Draft");
        await refreshActions(newName);
        showToast("success", docName ? "Draft updated successfully." : "Draft saved successfully.");
      } else {
        showToast("error", "Save failed. Please try again.");
      }
    } catch (e: unknown) {
      showToast("error", getErrorText(e, "Save failed."));
    } finally {
      setIsBusy(false);
    }
  };

  const handleActionConfirm = async (comment: string, actionOverride?: string) => {
    const actionToRun = actionOverride || pendingAction;
    if (!actionToRun || !docName) return;
    if (workflowState === "Draft" && !reason.trim()) {
      showToast("error", "Please enter the reason for resignation before submitting.");
      setPendingAction(null);
      return;
    }
    setIsBusy(true);
    try {
      // Always save the latest edits first when acting from Draft
      if (workflowState === "Draft") {
        await saveResignation({ doc_data: JSON.stringify(buildPayload()) });
      }

      let succeeded = false;
      let actionError: unknown = null;

      try {
        const res = await performAction({ docname: docName, action: actionToRun, comment });
        if (res?.message?.status === "success") {
          setWorkflowState(res.message.workflow_state ?? workflowState);
          setDocstatus(res.message.docstatus ?? docstatus);
          setAvailableActions(res.message.next_actions ?? []);
          showToast("success", res.message.message ?? `Action '${actionToRun}' completed.`);
          succeeded = true;
        }
      } catch (err: unknown) {
        actionError = err;
      }

      // "Illegal Document Status" means the doc's docstatus / workflow_state
      // is out of sync with the server. Refresh from the list so the UI
      // shows the real state instead of letting the user retry into a loop.
      const errMsg = getErrorText(actionError);
      if (!succeeded && errMsg.includes("Illegal Document Status")) {
        showToast(
          "error",
          "Document state is out of sync. Refreshing — please retry if needed.",
        );
        await refreshActions(docName);
        return;
      }

      // Fallback: if the workflow perform endpoint failed and this is a Submit action,
      // use the simple direct submit so the user is never stuck on Draft.
      if (!succeeded && actionToRun.toLowerCase() === "submit") {
        const fallback = await directSubmit({ docname: docName });
        if (
          fallback?.message?.status === "success" ||
          fallback?.message?.status === "info" ||
          fallback?.message?.docstatus === 1
        ) {
          setDocstatus(1);
          setWorkflowState("Pending PI Approval");
          setAvailableActions([]);
          showToast("success", "Resignation submitted successfully.");
          succeeded = true;
        }
      }

      if (!succeeded) {
        showToast("error", "Action failed. Please try again.");
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
  const hasFormData = !!basic || !!loadedResignation || (!isEditMode && !!currentUser);
  const applicantEmail = basic?.erp_mail || loadedResignation?.applicant_email_id || currentUser || "";
  const applicantEmpId = basic?.ps_emp_id || loadedResignation?.applicant_emp_id || "";
  const applicantDesignation = basic?.ps_designation || loadedResignation?.applicant_designation || "";
  const applicantDepartment =
    basic?.ps_department_name ||
    basic?.ps_department ||
    loadedResignation?.applicant_department ||
    "";
  const isTerminal = workflowState === "Approved" || workflowState === "Rejected" || workflowState === "Cancelled";
  const isEditable = workflowState === "Draft" && docstatus === 0;
  const canEdit = isEditable && isEditing;
  const isRnDStaff = roles.some((r) =>
    [
      "RnD Staff",
      "R&D Staff",
      "Research and Development Staff",
      "System Manager",
      "staff, RnD",
      "Hos, RnD (Head of Section, RnD)",
    ].includes(r),
  );
  const showCommitSection =
    !!docName &&
    !!projectNo &&
    isRnDStaff &&
    workflowState === "Pending Staff Approval";
  const commitRequired = showCommitSection && isCommittedForGate === false;
  const projectData = { applicant_prj_num: projectNo };
  const hasForwardAction = availableActions.some((action) =>
    action.toLowerCase().includes("forward"),
  );
  const workflowActions =
    docName && !isEditable && !isTerminal && !hasForwardAction
      ? [...availableActions, "Forward"]
      : availableActions;

  // ── Render ───────────────────────────────────────────────────────────────────
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
                  Resignation Form
                </h1>
                <p className="text-sm text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
                  Project Staff Resignation Application
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
                  ? "No resignation record could be loaded."
                  : "Project staff details could not be loaded."}
              </p>
              <p className="text-xs text-[#71717A] dark:text-[#A1A1AA] mt-1">
                Contact your administrator if this is incorrect.
              </p>
            </div>
          ) : (
            <div className="space-y-5">

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
                  <InfoRow icon={<Mail className="h-4 w-4" />} label="ERP Email" value={applicantEmail} />
                  <InfoRow icon={<IdCard className="h-4 w-4" />} label="Employee ID" value={applicantEmpId} />
                  <div className="flex items-start justify-between gap-3">
                    <InfoRow icon={<FolderOpen className="h-4 w-4" />} label="Project No." value={projectNo} />
                    {projectNo && (
                      <ViewProjectButton doctype="Project Staff Resignation" data={projectData} />
                    )}
                  </div>
                  <InfoRow icon={<Briefcase className="h-4 w-4" />} label="Designation" value={applicantDesignation} />
                  <InfoRow
                    icon={<Building2 className="h-4 w-4" />}
                    label="Department"
                    value={applicantDepartment}
                  />
                </div>
              </div>

              {/* Resignation Details — editable in Draft only */}
              <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-1.5 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <FileText className="h-4 w-4 text-red-500 dark:text-red-400" />
                  </div>
                  <h2 className="font-bold text-[#3F3F46] dark:text-[#E4E4E7] text-sm uppercase tracking-wide">
                    Resignation Details
                  </h2>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-medium text-[#3F3F46] dark:text-[#E4E4E7] mb-1.5">
                      <CalendarDays className="h-4 w-4 text-[#A1A1AA]" />
                      Date of Resignation
                      {canEdit && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    {canEdit ? (
                      <input
                        type="date"
                        value={resignationDate}
                        onChange={(e) => setResignationDate(e.target.value)}
                        disabled={isBusy}
                        required
                        className={cn(
                          "w-full sm:w-64 px-3 py-2 text-sm rounded-lg border transition-colors",
                          "bg-white dark:bg-zinc-900 text-[#27272A] dark:text-[#E4E4E7]",
                          "border-zinc-200 dark:border-zinc-700",
                          "focus:outline-none focus:ring-2 focus:ring-[#4A6CF7]/30 focus:border-[#4A6CF7]",
                          "disabled:opacity-60 disabled:cursor-not-allowed",
                        )}
                      />
                    ) : (
                      <p className="text-sm font-medium text-[#27272A] dark:text-[#E4E4E7]">
                        {resignationDate || "—"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#3F3F46] dark:text-[#E4E4E7] mb-1.5">
                      Reason
                    </label>
                    {canEdit ? (
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        disabled={isBusy}
                        rows={4}
                        placeholder="Mention the reason for your resignation…"
                        className={cn(
                          "w-full px-3 py-2 text-sm rounded-lg border transition-colors resize-none",
                          "bg-white dark:bg-zinc-900 text-[#27272A] dark:text-[#E4E4E7]",
                          "border-zinc-200 dark:border-zinc-700 placeholder:text-[#A1A1AA]",
                          "focus:outline-none focus:ring-2 focus:ring-[#4A6CF7]/30 focus:border-[#4A6CF7]",
                          "disabled:opacity-60 disabled:cursor-not-allowed",
                        )}
                      />
                    ) : (
                      <p className="text-sm text-[#27272A] dark:text-[#E4E4E7] whitespace-pre-wrap">
                        {reason || "—"}
                      </p>
                    )}
                  </div>
                </div>
              </div>

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
                    ? "Your resignation has been approved."
                    : `Your resignation has been ${workflowState.toLowerCase()}. No further actions are available.`}
                </div>
              )}

              {/* Commit window — R&D staff must stage a commitment before forwarding */}
              {showCommitSection && (
                <CommitPayment
                  doctype="Project Staff Resignation"
                  docName={docName}
                  projectName={projectNo}
                  budgetHeads={budgetHeads}
                  actualBalance={actualBalance}
                  title="Make Resignation Commitment"
                  description="Stage the project commitment required before forwarding this resignation."
                  onCommitSuccess={() => showToast("success", "Commitment staged successfully.")}
                  onStagingStatusChange={(committed) => setIsCommittedForGate(committed)}
                />
              )}

              {/* Action Row — Save Draft (editable only) + Workflow actions */}
              {(!isTerminal) && (
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

                    {/* Workflow action buttons — every actor must provide a comment */}
                    {workflowActions.map((action) => (
                      <button
                        key={action}
                        type="button"
                        onClick={() => handleWorkflowAction(action)}
                        disabled={isBusy || commitRequired || !workflowComment.trim()}
                        title={
                          commitRequired
                            ? "Submit a commitment first"
                            : !workflowComment.trim()
                              ? "Enter a workflow comment first"
                              : undefined
                        }
                        className={cn(
                          "inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all shadow-sm",
                          getActionButtonStyle(action),
                          "disabled:opacity-50 disabled:cursor-not-allowed",
                        )}
                      >
                        {actionIcon(action)}
                        {action}
                      </button>
                    ))}

                    {/*
                      Fallback Submit — shown when the doc is saved in Draft state but
                      the workflow endpoint hasn't returned a "Submit"-like action yet
                      (e.g. bench not yet restarted, or workflow not configured).
                    */}
                    {docName && isEditable && !availableActions.some(
                      (a) => a.toLowerCase().includes("submit") || a.toLowerCase().includes("forward"),
                    ) && (
                      <button
                        type="button"
                        onClick={() => setPendingAction("Submit")}
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

                  {/* Helper note */}
                  {commitRequired && (
                    <p className="mt-3 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                      A commitment must be submitted before forwarding this application.
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
          )}
        </div>
      </main>

    </div>
  );
};

export default ProjectStaffResignationForm;
