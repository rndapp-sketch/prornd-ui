import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useFrappeAuth, useFrappeGetCall, useFrappePostCall } from "frappe-react-sdk";
import { CommitPayment } from "@/components/CommitPayment";
import { DecommitWizard } from "@/components/DecommitWizard";
import { DepartmentName } from "@/components/DepartmentName";
import { useUserRoles } from "@/components/UserRole";
import { useProjectBudget } from "@/hooks/useProjectBudget";
import { resignationAPI } from "@/services/apiService";
import ViewProjectButton from "@/components/ViewProjectButton";
import { PageHeader } from "@/components/common/PageHeader";
import ResignationActionButtons from "@/components/ResignationActionButtons";
import { FloatingActivityLogButton } from "@/components/FloatingActivityLogButton";
import {
  User as UserIcon, IdCard, Mail, Building2, Briefcase,
  FolderOpen, CalendarDays, FileText, AlertCircle, CheckCircle2,
  Loader2, RefreshCw,
} from "lucide-react";
import { fetchOverheadLedger, isOverheadProjectNo } from "@/services/overheadLedger";
import type { LedgerRow } from "@/utils/decommitCalc";
import { cn } from "@/lib/utils";
import { CharLimitAlert } from "@/components/CharLimitAlert";
import { FIELD_CHAR_LIMITS } from "@/utils/fieldLimits";

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
  owner?: string;
  creation?: string;
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

// ── Shared card/button primitives (mirrors TravelDetails / other application forms) ────

type Accent = "blue" | "red" | "emerald" | "violet" | "teal" | "amber";

const ACCENTS: Record<Accent, { head: string; icon: string; title: string }> = {
  blue:    { head: "bg-gradient-to-r from-[#4A6CF7]/10 to-transparent", icon: "bg-[#4A6CF7]/15 text-[#4A6CF7]", title: "text-[#3451C7] dark:text-[#8FA5FF]" },
  red:     {   head: "bg-gradient-to-r from-red-500/10 to-transparent",   icon: "bg-red-500/15 text-red-500",   title: "text-red-700 dark:text-red-400" },
  emerald: { head: "bg-gradient-to-r from-emerald-500/10 to-transparent", icon: "bg-emerald-500/15 text-emerald-600", title: "text-emerald-700 dark:text-emerald-400" },
  violet:  { head: "bg-gradient-to-r from-violet-500/10 to-transparent", icon: "bg-violet-500/15 text-violet-600", title: "text-violet-700 dark:text-violet-400" },
  teal:    {  head: "bg-gradient-to-r from-teal-500/10 to-transparent",  icon: "bg-teal-500/15 text-teal-600", title: "text-teal-700 dark:text-teal-400" },
  amber:   { head: "bg-gradient-to-r from-amber-500/10 to-transparent", icon: "bg-amber-500/15 text-amber-600", title: "text-amber-700 dark:text-amber-400" },
};

const FrappeCard = ({
  title,
  icon,
  hint,
  children,
  className = "",
  accent = "blue",
}: {
  title?: string;
  icon?: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  accent?: Accent;
}) => {
  const c = ACCENTS[accent];
  return (
    <div
      className={cn(
        "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm",
        className,
      )}
    >
      {title && (
        <div className={cn("px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2.5", c.head)}>
          {icon && <div className={cn("p-1.5 rounded-lg [&_svg]:text-current", c.icon)}>{icon}</div>}
          <h3 className={cn("text-sm font-bold uppercase tracking-wider", c.title)}>
            {title}
          </h3>
          {hint && <span className="ml-auto text-[10px] text-[#A1A1AA] italic">{hint}</span>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};

const FrappeButton = ({
  children,
  onClick,
  disabled,
  className,
  variant = "ghost",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  variant?: "primary" | "ghost" | "outline";
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-150",
      "focus:outline-none focus:ring-2 focus:ring-zinc-400 disabled:opacity-50 disabled:cursor-not-allowed",
      variant === "primary" &&
        "bg-[#D97757] text-white hover:bg-[#c66a4e] shadow-md border border-[#C66A4E]",
      variant === "ghost" &&
        "bg-transparent text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700",
      variant === "outline" &&
        "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800",
      className,
    )}
  >
    {children}
  </button>
);

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

interface StaffCommitDetails {
  status: string;
  total_committed_amount?: number;
  staff_share?: {
    designation?: string;
    monthly_amount?: number;
    duration_months?: number;
    share_amount?: number;
    paid_amount?: number;
    pending_amount?: number;
    remaining_share?: number;
    unraised_share?: number;
    post_row?: string;
  } | null;
  ledger_commits?: Array<{
    transactionCommitNumber?: number;
    accountHeadId?: number | string;
    commitDate?: string;
    commitAmount?: number;
    status?: string;
    frapAppId?: string;
  }>;
  ledger_payments?: {
    payments_count?: number;
    paid_count?: number;
    total_payment_amount?: number;
    total_paid_amount?: number;
    count_by_status?: Record<string, number>;
    payments?: Array<{
      transactionPaymentNumber?: number;
      paymentDate?: string;
      paymentAmount?: number;
      bmr?: string;
      paymentStatus?: string;
      bankTransactionNumber?: string | null;
    }>;
  };
  tenure_history?: {
    joining_date?: string;
    current_term_completion_date?: string;
    total_months_worked?: number;
    total_gap_days?: number;
    tenures?: any[];
    extensions?: any[];
    resignations?: any[];
  };
  leave_details?: {
    leave_balance?: Record<string, any> | null;
    applications?: any[];
    approved_days_by_type?: Record<string, number>;
    applications_by_state?: Record<string, number>;
  };
  warnings?: string[];
}

const formatCreated = (creation: string) =>
  new Date(creation.replace(" ", "T")).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const formatINR = (n?: number | null) =>
  n == null ? "—" : `₹${Number(n).toLocaleString("en-IN")}`;

const InfoRow = ({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value?: React.ReactNode; hint?: string }) => (
  <div className="flex items-start gap-3">
    <div className="mt-0.5 flex-shrink-0 p-1.5 rounded-lg bg-[#4A6CF7]/10 text-[#4A6CF7]">{icon}</div>
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#71717A] dark:text-[#A1A1AA]">{label}</p>
      <p className="text-sm font-medium text-[#27272A] dark:text-[#E4E4E7] truncate">{value || "—"}</p>
      {hint && <p className="text-[11px] leading-snug text-[#71717A] dark:text-[#A1A1AA] mt-0.5">{hint}</p>}
    </div>
  </div>
);

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
  const { heads: budgetHeads, actualBalance, headBalances } = useProjectBudget(projectNo);

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

  const { call: addComment } = useFrappePostCall(
    "rndopsapp.rndopsapp.api.add_project_comment",
  );

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
        setIsEditing(false);
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
    if (!actionToRun) return;
    if (!docName) {
      showToast("error", "Please save the draft before performing this action.");
      setPendingAction(null);
      return;
    }
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
        // Like Project Staff Extension, Project Staff Resignation's own
        // perform_project_staff_resignation_action hard-requires a non-empty `comment`
        // param server-side (frappe.throw "A comment is required before performing this
        // action"), so it can't be posted after the fact the way the uniform-comment-
        // persistence doctypes do — every action here fails outright without it.
        const res = await performAction({ docname: docName, action: actionToRun, comment: comment.trim() });
        if (res?.message?.status === "success") {
          setWorkflowState(res.message.workflow_state ?? workflowState);
          setDocstatus(res.message.docstatus ?? docstatus);
          setAvailableActions(res.message.next_actions ?? []);
          showToast("success", res.message.message ?? `Action '${actionToRun}' completed.`);
          succeeded = true;
          if (comment.trim()) {
            try {
              await addComment({
                doctype: "Project Staff Resignation",
                docname: docName,
                content: comment.trim(),
              });
            } catch {
              // comment failure is non-fatal
            }
          }
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
      }
    } catch (e: unknown) {
      showToast("error", getErrorText(e, "Action failed."));
    } finally {
      setIsBusy(false);
      setPendingAction(null);
    }
  };

  const handleWorkflowAction = async (action: string, comment: string) => {
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
  // `ps_department`/`ps_department_name` may come back from the backend as the raw
  // department code/docname rather than the human-readable label — resolve it the
  // same way the rest of the app does (see DepartmentName) instead of displaying
  // whatever raw value the API happened to send.
  const applicantDepartmentRaw =
    basic?.ps_department ||
    basic?.ps_department_name ||
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
  // Opened from the Salary Module's Resigned tab: R&D staff get the read-only commitment and
  // payment details in every workflow state, without the decommit/forward gating above.
  const showCommitDetails =
    showCommitSection ||
    (!!docName && !!projectNo && isRnDStaff && searchParams.get("fromSalary") === "true");

  // Trace the staff member to the ledger commit that funds them, to prefill the decommit.
  const { data: staffCommitResp } = useFrappeGetCall<{ message: StaffCommitDetails }>(
    "rndopsapp.rndopsapp.commitPayment.get_staff_commit_details",
    { ps_emp_id: applicantEmpId, project_no: projectNo },
    showCommitDetails && applicantEmpId ? undefined : null,
    { revalidateOnFocus: false },
  );
  const staffCommit = staffCommitResp?.message?.status === "success" ? staffCommitResp.message : null;
  const staffCommitAmount = Math.round(
    staffCommit?.staff_share?.unraised_share ??
      staffCommit?.staff_share?.share_amount ??
      staffCommit?.total_committed_amount ??
      0,
  );
  const ledgerCommit = staffCommit?.ledger_commits?.[0];
  const staffCommitHead =
    Object.entries(headBalances || {}).find(
      ([, hb]) => String(hb.id) === String(ledgerCommit?.accountHeadId),
    )?.[0] || undefined;
  // Decommitment already staged against this resignation (shown in every state, not just while staff act on it).
  const { call: fetchStagedDecommit } = useFrappePostCall<{ message: { status: string; data?: any[] } }>(
    "rndopsapp.rndopsapp.commitPayment.get_commit_staging_status",
  );
  const [stagedDecommit, setStagedDecommit] = useState<{ amount: number; head?: string; status?: string; particular?: string; refDetails?: string; stagedAt?: string } | null>(null);
  useEffect(() => {
    if (!docName) return;
    let cancelled = false;
    fetchStagedDecommit({ reference_name: docName })
      .then((res) => {
        const rec = res?.message?.status === "success" ? res.message.data?.[0] : null;
        if (!rec || cancelled) return;
        let payload: any = {};
        try {
          const raw = rec.payload ?? rec.commit_payload ?? "{}";
          payload = typeof raw === "string" ? JSON.parse(raw) : raw;
        } catch { /* ignore malformed payload */ }
        const amount = Math.abs(Number(payload.commit_amount ?? payload.commitAmount ?? payload.bill_amount ?? 0));
        if (!amount) return;
        setStagedDecommit({
          amount,
          head: payload.budget_head ?? payload.budgetHead,
          status: rec.status === "PUBLISHED" ? "Committed" : rec.status,
          particular: payload.commit_particular ?? payload.commitParticular,
          refDetails: String(payload.refDetails ?? payload.ref_details ?? "").trim() || undefined,
          stagedAt: rec.creation ?? rec.modified ?? undefined,
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [docName, workflowState]);
  // Has the ledger actually consumed the staged decommitment? "Committed" only means it was published to the
  // queue; a matching negative commit row in the ledger (pointing at the same TID) proves it was consumed.
  type LedgerSync =
    | { state: "idle" | "checking" }
    | { state: "consumed"; tid?: string | number | null; date?: string }
    | { state: "pending" }
    | { state: "error"; message: string };
  const [ledgerSync, setLedgerSync] = useState<LedgerSync>({ state: "idle" });
  const checkLedgerSync = useCallback(async () => {
    if (!stagedDecommit || !projectNo) return;
    setLedgerSync({ state: "checking" });
    try {
      let rows: LedgerRow[];
      if (isOverheadProjectNo(projectNo)) {
        rows = (await fetchOverheadLedger(projectNo)) as LedgerRow[];
      } else {
        const headId = stagedDecommit.head ? headBalances?.[stagedDecommit.head]?.id : undefined;
        if (headId === undefined) throw new Error("Budget head id not available yet.");
        const res = await fetch(
          `/ledger-api/commit-payment-transactions?projectNumber=${encodeURIComponent(projectNo)}&accountHeadId=${encodeURIComponent(String(headId))}`,
        );
        if (!res.ok) throw new Error(`Ledger service returned ${res.status}.`);
        const data = await res.json();
        rows = Array.isArray(data) ? data : [];
      }
      const ref = stagedDecommit.refDetails;
      const match = rows.find((r) => {
        const amt = Number(r.commitAmount ?? 0);
        const isCancelled = (r.status || "").toUpperCase().includes("CANCEL");
        const sameRef = ref ? String(r.refDetails ?? "").trim() === ref : r.frapAppId === docName;
        return !isCancelled && amt < 0 && Math.round(Math.abs(amt)) === Math.round(stagedDecommit.amount) && sameRef;
      });
      setLedgerSync(match ? { state: "consumed", tid: match.transactionId, date: match.transactionDate } : { state: "pending" });
    } catch (e) {
      setLedgerSync({ state: "error", message: e instanceof Error ? e.message : "Could not read the ledger." });
    }
  }, [stagedDecommit, projectNo, headBalances, docName]);
  useEffect(() => {
    if (stagedDecommit && headBalances) checkLedgerSync();
  }, [stagedDecommit, headBalances, checkLedgerSync]);
  const stagedMinutes = stagedDecommit?.stagedAt ? (Date.now() - new Date(stagedDecommit.stagedAt).getTime()) / 60000 : null;

  const showSidebar = showCommitSection || !!stagedDecommit;
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
    ((workflowState === "Draft" && isEditable && !isEditing && !!docName) ||
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
        <main className="flex-1 p-0">
          <div className="w-full max-w-7xl mx-auto">
            <PageHeader
              title="Resignation — Draft Applications"
              status="Draft"
            >
              <FrappeButton variant="primary" onClick={() => setIsCreatingNew(true)}>
                + Create New Application
              </FrappeButton>
            </PageHeader>

            <FrappeCard
              title={`Saved Drafts (${userDrafts.length})`}
              icon={<FileText className="h-4 w-4 text-[#4A6CF7]" />}
              className="overflow-hidden"
            >
              <p className="text-sm text-[#71717A] dark:text-[#A1A1AA] -mt-2 mb-4">
                You have saved draft applications. Click <strong>Edit</strong> to open a draft, or create a new application.
              </p>
              <div className="overflow-x-auto -mx-6">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-xs font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-wider border-y border-zinc-200 dark:border-zinc-700">
                    <tr>
                      <th className="px-6 py-3.5">Application ID</th>
                      <th className="px-6 py-3.5">Project No</th>
                      <th className="px-6 py-3.5">Resignation Date</th>
                      <th className="px-6 py-3.5">Workflow State</th>
                      <th className="px-6 py-3.5">Last Saved</th>
                      <th className="px-6 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                    {userDrafts.map((draft) => (
                      <tr key={draft.name} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-700/30 transition-colors">
                        <td className="px-6 py-4 font-semibold text-[#27272A] dark:text-[#E4E4E7]">
                          {draft.name}
                        </td>
                        <td className="px-6 py-4 text-[#71717A] dark:text-[#A1A1AA]">
                          {draft.applicant_prj_num || projectNo || "—"}
                        </td>
                        <td className="px-6 py-4 text-[#71717A] dark:text-[#A1A1AA]">
                          {draft.resignation_date || "—"}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                            Draft
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[#71717A] dark:text-[#A1A1AA] text-xs">
                          {new Date((draft as any).modified || (draft as any).creation || Date.now()).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <FrappeButton
                            variant="primary"
                            className="!px-4 !py-1.5 !text-xs"
                            onClick={() => navigate(`/project-staff-resignation?edit=${draft.name}`)}
                          >
                            Edit
                          </FrappeButton>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </FrappeCard>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#18181B]">
      <main className="flex-1 p-0">
        <div className="w-full max-w-9xl mx-auto">

          <PageHeader
            title="Resignation Form"
            status={workflowState}
            projectNumber={projectNo}
          >
            {projectNo && (
              <ViewProjectButton doctype="Project Staff Resignation" data={{ applicant_prj_num: projectNo }} />
            )}
            {(!isTerminal && !isFromRegistry) && (
              <>
                {isEditable && !isEditing && (
                  <FrappeButton variant="outline" onClick={() => setIsEditing(true)} disabled={isBusy}>
                    Edit
                  </FrappeButton>
                )}
                {canEdit && (
                  <FrappeButton variant="outline" onClick={handleSave} disabled={isBusy}>
                    {isBusy && !pendingAction && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Draft
                  </FrappeButton>
                )}
                {(workflowActions.length > 0 || !!docName) && (
                  <ResignationActionButtons
                    actions={workflowActions}
                    docname={docName || undefined}
                    onPutBackComplete={() => docName && refreshActions(docName)}
                    onAction={handleWorkflowAction}
                    isBusy={isBusy}
                    commitRequired={commitRequired}
                    commitBlockedMessage="A commitment must be submitted before forwarding this application."
                  />
                )}
              </>
            )}
          </PageHeader>

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
            <FrappeCard className="p-8 text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-amber-400" />
              <p className="text-sm font-medium text-[#3F3F46] dark:text-[#E4E4E7]">
                {isEditMode
                  ? "No resignation record could be loaded."
                  : "Project staff details could not be loaded."}
              </p>
              <p className="text-xs text-[#71717A] dark:text-[#A1A1AA] mt-1">
                Contact your administrator if this is incorrect.
              </p>
            </FrappeCard>
          ) : (
            <div className={cn(showSidebar ? "grid grid-cols-1 lg:grid-cols-4 gap-6" : "space-y-5")}>
              <div className={cn("space-y-5", showSidebar && "lg:col-span-3")}>

                {/* Workflow Timeline */}
                {docName && (
                  <FrappeCard title="Approval Status" accent="violet">
                    <WorkflowTimeline currentState={workflowState} />
                  </FrappeCard>
                )}

                {/* Applicant Details — read-only, prefilled */}
                <FrappeCard
                  title="Applicant Details"
                  accent="blue"
                  icon={<UserIcon className="h-4 w-4" />}
                  hint="Auto-filled from your profile"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoRow icon={<UserIcon className="h-4 w-4" />} label="Full Name" value={fullName} />
                    <InfoRow icon={<Mail className="h-4 w-4" />} label="ERP Email" value={applicantEmail} />
                    <InfoRow icon={<IdCard className="h-4 w-4" />} label="Employee ID" value={applicantEmpId} />
                    <InfoRow icon={<FolderOpen className="h-4 w-4" />} label="Project No." value={projectNo} />
                    <InfoRow icon={<Briefcase className="h-4 w-4" />} label="Designation" value={applicantDesignation} />
                    <InfoRow
                      icon={<Building2 className="h-4 w-4" />}
                      label="Department"
                      value={applicantDepartmentRaw ? <DepartmentName name={applicantDepartmentRaw} /> : undefined}
                    />
                  </div>
                </FrappeCard>

                {/* Resignation Details — editable in Draft only */}
                <FrappeCard
                  title="Resignation Details"
                  accent="red"
                  icon={<FileText className="h-4 w-4" />}
                >
                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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

                    {loadedResignation?.creation && (
                      <div>
                        <label className="flex items-center gap-1.5 text-sm font-medium text-[#3F3F46] dark:text-[#E4E4E7] mb-1.5">
                          <CalendarDays className="h-4 w-4 text-[#A1A1AA]" />
                          Form Created On
                        </label>
                        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-sm font-medium text-[#27272A] dark:text-[#E4E4E7]">
                          {formatCreated(loadedResignation.creation)}
                        </div>
                      </div>
                    )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#3F3F46] dark:text-[#E4E4E7] mb-1.5">
                        Reason
                      </label>
                      {canEdit ? (
                        <>
                          <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            disabled={isBusy}
                            rows={4}
                            placeholder="Mention the reason for your resignation…"
                            maxLength={FIELD_CHAR_LIMITS.Text}
                            className={cn(
                              "w-full px-3 py-2 text-sm rounded-lg border transition-colors resize-none",
                              "bg-white dark:bg-zinc-900 text-[#27272A] dark:text-[#E4E4E7]",
                              "border-zinc-200 dark:border-zinc-700 placeholder:text-[#A1A1AA]",
                              "focus:outline-none focus:ring-2 focus:ring-[#4A6CF7]/30 focus:border-[#4A6CF7]",
                              "disabled:opacity-60 disabled:cursor-not-allowed",
                            )}
                          />
                          <CharLimitAlert value={reason} maxLength={FIELD_CHAR_LIMITS.Text} className="mt-1" />
                        </>
                      ) : (
                        <p className="text-sm text-[#27272A] dark:text-[#E4E4E7] whitespace-pre-wrap">
                          {reason || "—"}
                        </p>
                      )}
                    </div>
                  </div>
                </FrappeCard>

                {staffCommit && (
                  <FrappeCard title="Staff Commitment" accent="emerald" icon={<FolderOpen className="h-4 w-4" />}>
                    <div className="space-y-5">
                      <div className="space-y-3">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">1 · Commitment</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <InfoRow icon={<FileText className="h-4 w-4" />} label="Recruitment (Commit Ref.)" value={ledgerCommit?.frapAppId} hint="Recruitment application whose commitment funds this employee's salary." />
                          <InfoRow icon={<Briefcase className="h-4 w-4" />} label="Designation" value={staffCommit.staff_share?.designation} hint="Post this employee was recruited against." />
                          <InfoRow icon={<FolderOpen className="h-4 w-4" />} label="Total committed (whole RAC)" value={formatINR(staffCommit.total_committed_amount)} hint="Commitment for the entire recruitment (all selected staff), not only this employee." />
                          {staffCommit.staff_share && (
                            <InfoRow
                              icon={<CalendarDays className="h-4 w-4" />}
                              label="Monthly × Months"
                              value={`${formatINR(staffCommit.staff_share.monthly_amount)} × ${staffCommit.staff_share.duration_months}`}
                              hint="Monthly salary cost × months of the approved contract."
                            />
                          )}
                          <InfoRow icon={<IdCard className="h-4 w-4" />} label="Staff share" value={formatINR(staffCommit.staff_share?.share_amount)} hint="This employee's own part of the commitment (monthly × months), not the whole recruitment." />
                        </div>
                      </div>
                      {staffCommit.staff_share?.paid_amount != null && (
                        <div className="space-y-3">
                          <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">2 · Staff share — paid and what can be released</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <InfoRow icon={<IdCard className="h-4 w-4" />} label="Staff share" value={formatINR(staffCommit.staff_share.share_amount)} hint="Starting point: this employee's own commitment." />
                            <InfoRow icon={<CheckCircle2 className="h-4 w-4" />} label="Paid (bank txn)" value={formatINR(staffCommit.staff_share.paid_amount)} hint="Salary already paid out — ledger payments that have a bank transaction number." />
                            <InfoRow icon={<IdCard className="h-4 w-4" />} label="Remaining share" value={formatINR(staffCommit.staff_share.remaining_share)} hint="Staff share minus what has actually been paid. Still includes the pending amount." />
                            <InfoRow icon={<AlertCircle className="h-4 w-4" />} label="Pending in ledger" value={formatINR(staffCommit.staff_share.pending_amount)} hint="Salary already raised in the ledger but not yet paid. It stays committed — do not release it." />
                            <InfoRow icon={<IdCard className="h-4 w-4" />} label="Unraised (can decommit)" value={formatINR(staffCommit.staff_share.unraised_share)} hint="Staff share minus paid and pending. This is the amount that can safely be released." />
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                      {!staffCommit.ledger_payments && (
                        <p className="text-xs text-amber-600">
                          Payment history not returned by the server (ledger_payments missing). Restart the Frappe backend and reload.
                        </p>
                      )}
                      {staffCommit.ledger_payments && (
                        <div className="space-y-2 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
                          <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Salary Payments</h4>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 px-2 py-2">
                              <p className="text-[10px] uppercase text-[#71717A] dark:text-[#A1A1AA]">Raised</p>
                              <p className="text-sm font-bold text-[#27272A] dark:text-[#E4E4E7]">{formatINR(staffCommit.ledger_payments.total_payment_amount)}</p>
                              <p className="text-[10px] text-[#71717A] dark:text-[#A1A1AA]">{staffCommit.ledger_payments.payments_count ?? 0} payment(s)</p>
                            </div>
                            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 px-2 py-2">
                              <p className="text-[10px] uppercase text-green-700 dark:text-green-400">Paid</p>
                              <p className="text-sm font-bold text-green-700 dark:text-green-400">{formatINR(staffCommit.ledger_payments.total_paid_amount)}</p>
                              <p className="text-[10px] text-green-700/80 dark:text-green-400/80">{staffCommit.ledger_payments.paid_count ?? 0} payment(s)</p>
                            </div>
                            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 px-2 py-2">
                              <p className="text-[10px] uppercase text-amber-700 dark:text-amber-400">Awaiting</p>
                              <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                                {formatINR((staffCommit.ledger_payments.total_payment_amount ?? 0) - (staffCommit.ledger_payments.total_paid_amount ?? 0))}
                              </p>
                              <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80">
                                {(staffCommit.ledger_payments.payments_count ?? 0) - (staffCommit.ledger_payments.paid_count ?? 0)} payment(s)
                              </p>
                            </div>
                          </div>
                          {!staffCommit.ledger_payments.payments?.length && (
                            <p className="text-xs text-[#A1A1AA] italic">No payments recorded in the ledger.</p>
                          )}
                          <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA]">Raised = salary requests created in the ledger. Awaiting = raised but not yet paid to the employee (status PENDING).</p>
                          {(staffCommit.ledger_payments.payments || []).map((pay) => (
                            <div
                              key={pay.transactionPaymentNumber}
                              className="flex items-center justify-between gap-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-xs"
                            >
                              <div className="min-w-0">
                                <p className="font-medium text-[#27272A] dark:text-[#E4E4E7]">
                                  {pay.paymentDate
                                    ? new Date(pay.paymentDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
                                    : "—"}
                                  {" · "}{formatINR(pay.paymentAmount)}
                                </p>
                                <p className="text-[#71717A] dark:text-[#A1A1AA] truncate">
                                  BMR {pay.bmr || "—"}{pay.bankTransactionNumber ? ` · ${pay.bankTransactionNumber}` : ""}
                                </p>
                              </div>
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0",
                                  pay.bankTransactionNumber
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                                )}
                              >
                                {pay.paymentStatus || "—"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {staffCommit.tenure_history && (
                        <div className="space-y-2 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
                          <h4 className="text-[11px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-400">Tenure</h4>
                          <InfoRow icon={<CalendarDays className="h-4 w-4" />} label="Joined" value={fmtDate(staffCommit.tenure_history.joining_date)} hint="Date this employee joined the project." />
                          <InfoRow icon={<CalendarDays className="h-4 w-4" />} label="Current term ends" value={fmtDate(staffCommit.tenure_history.current_term_completion_date)} hint="Completion date of the present contract term." />
                          <InfoRow
                            icon={<Briefcase className="h-4 w-4" />}
                            label="Months worked"
                            value={`${staffCommit.tenure_history.total_months_worked ?? 0}${staffCommit.tenure_history.total_gap_days ? ` (gap ${staffCommit.tenure_history.total_gap_days} days)` : ""}`} hint="Total months served on the project, excluding any gaps." />
                          <p className="text-xs text-[#71717A] dark:text-[#A1A1AA]">
                            {staffCommit.tenure_history.tenures?.length ?? 0} tenure(s) · {staffCommit.tenure_history.extensions?.length ?? 0} extension(s)
                          </p>
                          {(staffCommit.tenure_history.extensions || []).map((ext: any, i: number) => (
                            <div key={ext.name || i} className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-xs">
                              <p className="font-medium text-[#27272A] dark:text-[#E4E4E7]">
                                {ext.name || "Extension"} · {ext.workflow_state || ext.state || "—"}
                              </p>
                              <p className="text-[#71717A] dark:text-[#A1A1AA]">
                                {fmtDate(ext.final_new_joining_date || ext.new_joining_date)} → {fmtDate(ext.final_new_completion_date || ext.new_completion_date)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                      {staffCommit.leave_details && (
                        <div className="space-y-2 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
                          <h4 className="text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">Leave</h4>
                          {staffCommit.leave_details.leave_balance && (
                            <p className="text-xs text-[#27272A] dark:text-[#E4E4E7]">
                              Leave balance remaining: EL {staffCommit.leave_details.leave_balance.el ?? staffCommit.leave_details.leave_balance.earned_leave ?? staffCommit.leave_details.leave_balance.remaining_el ?? "—"}
                              {" · "}CL {staffCommit.leave_details.leave_balance.cl ?? staffCommit.leave_details.leave_balance.casual_leave ?? staffCommit.leave_details.leave_balance.remaining_cl ?? "—"}
                            </p>
                          )}
                          <p className="text-xs text-[#71717A] dark:text-[#A1A1AA]">
                            Leave days approved and taken:{" "}
                            {Object.keys(staffCommit.leave_details.approved_days_by_type || {}).length
                              ? Object.entries(staffCommit.leave_details.approved_days_by_type!).map(([k, v]) => `${k} ${v}`).join(" · ")
                              : "none"}
                          </p>
                          {(staffCommit.leave_details.applications || []).map((lv: any, i: number) => (
                            <div key={lv.name || i} className="flex items-center justify-between gap-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-xs">
                              <div className="min-w-0">
                                <p className="font-medium text-[#27272A] dark:text-[#E4E4E7]">
                                  {lv.leave_type || lv.type || "Leave"} · {lv.no_of_days ?? lv.days ?? "—"} day(s)
                                </p>
                                <p className="text-[#71717A] dark:text-[#A1A1AA] truncate">
                                  {fmtDate(lv.from_date || lv.start_date)} → {fmtDate(lv.to_date || lv.end_date)}
                                </p>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300 flex-shrink-0">
                                {lv.workflow_state || "—"}
                              </span>
                            </div>
                          ))}
                          {!staffCommit.leave_details.applications?.length && (
                            <p className="text-xs text-[#A1A1AA] italic">No leave applications.</p>
                          )}
                        </div>
                      )}
                      
                      </div>
                      {!!staffCommit.warnings?.length && (
                        <p className="text-xs text-amber-600">{staffCommit.warnings.join("; ")}</p>
                      )}
                    
                    </div>
                  </FrappeCard>
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
                      ? "Your resignation has been approved."
                      : `Your resignation has been ${workflowState.toLowerCase()}. No further actions are available.`}
                  </div>
                )}
              </div>

              {/* Commit window — R&D staff must stage a commitment before forwarding */}
              {showSidebar && (
                <aside className="lg:col-span-1 space-y-5">
                  {/* While staff are staging, CommitPayment shows the committed details itself. */}
                  {stagedDecommit && !showCommitSection && (
                    <FrappeCard title="Decommitted Amount" accent="emerald" icon={<CheckCircle2 className="h-4 w-4" />}>
                      <div className="space-y-4">
                        <InfoRow icon={<IdCard className="h-4 w-4" />} label="Decommitted amount" value={formatINR(stagedDecommit.amount)} hint="Amount released from the project commitment for this resignation." />
                        {stagedDecommit.head && <InfoRow icon={<FolderOpen className="h-4 w-4" />} label="Budget head" value={stagedDecommit.head} />}
                        {stagedDecommit.status && <InfoRow icon={<CheckCircle2 className="h-4 w-4" />} label="Status" value={stagedDecommit.status} />}
                        <InfoRow icon={<FileText className="h-4 w-4" />} label="Ref details" value={stagedDecommit.refDetails ?? "—"} hint="Transaction ID of the commitment this decommitment releases." />
                        <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-zinc-600 dark:text-zinc-300">Ledger status</span>
                            <button
                              type="button"
                              onClick={checkLedgerSync}
                              disabled={ledgerSync.state === "checking"}
                              className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-0.5 text-[11px] font-semibold text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                            >
                              <RefreshCw className={cn("h-3 w-3", ledgerSync.state === "checking" && "animate-spin")} /> Re-check
                            </button>
                          </div>
                          {ledgerSync.state === "checking" || ledgerSync.state === "idle" ? (
                            <p className="mt-1 text-zinc-500">Checking the ledger…</p>
                          ) : ledgerSync.state === "consumed" ? (
                            <p className="mt-1 font-semibold text-emerald-700 dark:text-emerald-400">
                              Consumed: recorded in the ledger{ledgerSync.tid != null ? ` as TID ${ledgerSync.tid}` : ""}.
                            </p>
                          ) : ledgerSync.state === "pending" ? (
                            <p className={cn("mt-1 font-semibold", stagedMinutes != null && stagedMinutes > 15 ? "text-red-600 dark:text-red-400" : "text-amber-700 dark:text-amber-400")}>
                              {stagedMinutes != null && stagedMinutes > 15
                                ? "Not in the ledger after more than 15 minutes. It has probably failed (dead-letter queue); ask the system admin to check the DLQ."
                                : "Published, but not in the ledger yet. It may still be processing; re-check shortly."}
                            </p>
                          ) : ledgerSync.state === "error" ? (
                            <p className="mt-1 text-red-600 dark:text-red-400">Could not check the ledger: {ledgerSync.message}</p>
                          ) : null}
                        </div>
                        {stagedDecommit.particular && <InfoRow icon={<FileText className="h-4 w-4" />} label="Particulars" value={stagedDecommit.particular} />}
                      </div>
                    </FrappeCard>
                  )}
                  {showCommitSection && (
                  <CommitPayment
                    doctype="Project Staff Resignation"
                    docName={docName}
                    projectName={projectNo}
                    budgetHeads={budgetHeads}
                    actualBalance={actualBalance}
                    title="Release Resignation Decommitment"
                    description="Stage the project decommitment required before forwarding this resignation."
                    submitLabel="Submit Decommitment"
                    hideHeadBalance
                    displayHeadBalances={headBalances}
                    defaultBudgetHead={staffCommitHead}
                    billAmount={staffCommitAmount > 0 ? staffCommitAmount : undefined}
                    defaultParticular={
                      staffCommit
                        ? `Decommit on resignation of ${applicantEmpId}${ledgerCommit?.transactionCommitNumber ? ` (commit #${ledgerCommit.transactionCommitNumber})` : ""}`
                        : ""
                    }
                    customForm={({ submit, isSubmitting }) => (
                      <DecommitWizard
                        projectName={projectNo}
                        budgetHeads={budgetHeads}
                        budgetHeadIds={Object.fromEntries(
                          Object.entries(headBalances || {}).map(([name, hb]) => [name, hb.id]),
                        )}
                        defaultBudgetHead={staffCommitHead}
                        preferredTid={ledgerCommit?.transactionCommitNumber}
                        defaultParticular={
                          staffCommit
                            ? `Decommit on resignation of ${applicantEmpId}${ledgerCommit?.transactionCommitNumber ? ` (commit #${ledgerCommit.transactionCommitNumber})` : ""}`
                            : ""
                        }
                        suggestedAmount={staffCommitAmount > 0 ? staffCommitAmount : undefined}
                        isSubmitting={isSubmitting}
                        submit={submit}
                      />
                    )}
                    onCommitSuccess={() => showToast("success", "Decommitment staged successfully.")}
                    onStagingStatusChange={(committed) => setIsCommittedForGate(committed)}
                  />
                  )}
                </aside>
              )}
            </div>
          )}
        </div>
      </main>

      {docName && (
        <FloatingActivityLogButton doctype="Project Staff Resignation" docname={docName} />
      )}
    </div>
  );
};

export default ProjectStaffResignationForm;
