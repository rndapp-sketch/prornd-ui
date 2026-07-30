import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useFrappeAuth, useFrappeGetCall, useFrappePostCall } from "frappe-react-sdk";
import { AppSidebar } from "@/components/RndSidebar";
import { CommitPayment } from "@/components/CommitPayment";
import { useUserRoles } from "@/components/UserRole";
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

  const [isCreatingNew, setIsCreatingNew] = useState(searchParams.get("new") === "true");

  // Filter user draft resignations
  const userDrafts = React.useMemo(() => {
    if (!listResp?.message?.data || !currentUser) return [];
    return listResp.message.data.filter((r) => {
      const isMine =
        (basic?.erp_mail && r.applicant_email_id === basic.erp_mail) ||
        r.owner === currentUser ||
        (currentUser && r.owner?.toLowerCase() === currentUser.toLowerCase());
      return isMine && r.docstatus === 0 && (r.workflow_state === "Draft" || !r.workflow_state);
    });
  }, [listResp, basic, currentUser]);

  useEffect(() => {
    if (editDocName) return;
  }, [editDocName]);

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
  const showCommitSection =
    !!docName &&
    !!projectNo &&
    isRnDStaff &&
    workflowState === "Pending Staff Approval";
  const commitRequired = showCommitSection && isCommittedForGate === false;
  const projectData = { applicant_prj_num: projectNo };
  const isFromRegistry = searchParams.get("fromRegistry") === "true";

  const isPI = roles.some((r) => {
    const lower = r.toLowerCase();
    return (
      lower.includes("pi") ||
      lower.includes("principal investigator") ||
      lower.includes("faculty") ||
      lower.includes("system manager")
    );
  });

  const isPIActor = workflowState === "Pending PI Approval" && (isPI || availableActions.length > 0);
  const isStaffActor = workflowState === "Pending Staff Approval" && (isRnDStaff || availableActions.length > 0);
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
  if (!editDocName && !isCreatingNew && !listLoading && userDrafts.length > 0) {
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
                  Project Staff Resignation — Draft Applications
                </h1>
                <p className="text-sm text-[#71717A] dark:text-[#A1A1AA] mt-1">
                  You have saved draft applications. Click <strong>Edit</strong> to open a draft, or create a new application.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingNew(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-[#4A6CF7] hover:bg-[#3b5cf6] transition-all shadow-sm"
              >
                + Create New Application
              </button>
            </div>

            {/* Draft List Table */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-[#4A6CF7]/10 rounded-lg">
                    <FileText className="h-4 w-4 text-[#4A6CF7]" />
                  </div>
                  <h2 className="font-bold text-[#3F3F46] dark:text-[#E4E4E7] text-sm uppercase tracking-wide">
                    Saved Drafts ({userDrafts.length})
                  </h2>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-xs font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-700">
                    <tr>
                      <th className="px-5 py-3.5">Application ID</th>
                      <th className="px-5 py-3.5">Project No</th>
                      <th className="px-5 py-3.5">Resignation Date</th>
                      <th className="px-5 py-3.5">Workflow State</th>
                      <th className="px-5 py-3.5">Last Saved</th>
                      <th className="px-5 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                    {userDrafts.map((draft) => (
                      <tr key={draft.name} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-700/30 transition-colors">
                        <td className="px-5 py-4 font-semibold text-[#27272A] dark:text-[#E4E4E7]">
                          {draft.name}
                        </td>
                        <td className="px-5 py-4 text-[#71717A] dark:text-[#A1A1AA]">
                          {draft.applicant_prj_num || projectNo || "—"}
                        </td>
                        <td className="px-5 py-4 text-[#71717A] dark:text-[#A1A1AA]">
                          {draft.resignation_date || "—"}
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                            Draft
                          </span>
                        </td>
                        <td className="px-5 py-4 text-[#71717A] dark:text-[#A1A1AA] text-xs">
                          {new Date((draft as any).modified || (draft as any).creation || Date.now()).toLocaleDateString("en-IN", {
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
                            onClick={() => navigate(`/project-staff-resignation?edit=${draft.name}`)}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#4A6CF7] hover:bg-[#3b5cf6] transition-all shadow-sm"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
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
            <div className={cn(showCommitSection ? "grid grid-cols-1 lg:grid-cols-4 gap-6" : "space-y-5")}>
              <div className={cn("space-y-5", showCommitSection && "lg:col-span-3")}>

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
                    <InfoRow icon={<FolderOpen className="h-4 w-4" />} label="Project No." value={projectNo} />
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

              {/* Commit window — R&D staff must stage a commitment before forwarding */}
              {showCommitSection && (
                <aside className="lg:col-span-1 space-y-5">
                  <CommitPayment
                    doctype="Project Staff Resignation"
                    docName={docName}
                    projectName={projectNo}
                    budgetHeads={budgetHeads}
                    actualBalance={actualBalance}
                    title="Release Resignation Commitment"
                    description="Stage the project commitment required before forwarding this resignation."
                    onCommitSuccess={() => showToast("success", "Commitment staged successfully.")}
                    onStagingStatusChange={(committed) => setIsCommittedForGate(committed)}
                  />
                </aside>
              )}
            </div>
          )}
        </div>
      </main>

    </div>
  );
};

export default ProjectStaffResignationForm;
