import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { AppSidebar } from "../../components/RndSidebar";
import {
  useFrappePostCall,
  useFrappeGetCall,
  useFrappeAuth,
} from "frappe-react-sdk";
import { cn } from "@/lib/utils";
import {
  FileTextIcon,
  CalendarIcon,
  UserIcon,
  DownloadIcon,
  FileSpreadsheetIcon as LedgerIcon,
  ChevronDown,
  ChevronRight,
  CheckCircle2 as CheckCircleIcon,
  XCircle as XCircleIcon,
  Pencil as PencilIcon,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { GlobalLoader } from "@/components/ui/global-loader";
import { useProjectBudget } from "@/hooks/useProjectBudget";
import { useUserRoles } from "../../components/UserRole";
import { ProjectLedgerModal } from "../../components/ProjectLedgerModal";
import { DeclarationFields } from "@/components/DeclarationFields";
import { CommitPayment } from "@/components/CommitPayment";
import { FloatingActivityLogButton } from "@/components/FloatingActivityLogButton";
import ViewProjectButton from "@/components/ViewProjectButton";
import { CharLimitAlert } from "@/components/CharLimitAlert";
import { FIELD_CHAR_LIMITS } from "@/utils/fieldLimits";
import { ErrorModal } from "../../components/ErrorModal";
import { parseFrappeError } from "../../utils/errorUtils";

// --- TYPE DEFINITIONS ---
interface ReimbursementData {
  name: string;
  owner: string;
  creation: string;
  modified: string;
  workflow_state: string;
  self_other: string | null;
  reimbursement_for_id: string;
  reimbursement_for_department: string;
  reimbursement_for_designation: string;
  applicant_webmail: string;
  applicant_department: string;
  applicant_designation: string;
  bank_name: string;
  account_holder_name: string;
  bank_account_number: string;
  ifsc_code: string;
  project_number: string;
  project_name: string;
  account_head: string;
  other_head: string;
  comment: string;
  dec1: number;
  dec2: number;
  dec3: number;
  dec4: number;
  [key: string]: any;
}

// --- DESIGN SYSTEM ---
const FrappeCard = ({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl shadow-sm overflow-hidden",
      className,
    )}
  >
    {title && (
      <div className="px-[22px] py-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A]">
        <h3 className="text-[12px] font-extrabold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA]">
          {title}
        </h3>
      </div>
    )}
    <div className="p-[18px] md:p-6">{children}</div>
  </div>
);

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
  variant?: "primary" | "ghost" | "outline" | "action";
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-150",
      "focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500",
      variant === "primary" &&
      "bg-[#D97757] text-white hover:bg-[#D97757] shadow-md hover:shadow-lg border border-[#C66A4E]",
      variant === "ghost" &&
      "bg-transparent text-[#3F3F46] dark:text-[#E4E4E7] hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46]",
      variant === "outline" &&
      "bg-white border border-[#E4E4E7] text-[#3F3F46] hover:bg-[#FAFAF9] rounded-lg dark:bg-[#27272A] dark:border-[#3F3F46] dark:text-[#E4E4E7] dark:hover:bg-[#3F3F46]",
      variant === "action" &&
      "bg-[#D97757] text-white font-bold hover:bg-[#D97757] shadow-md hover:shadow-lg border-2 border-[#C66A4E]",
      "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
      className,
    )}
  >
    {children}
  </button>
);

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-[11px] font-bold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA] mb-1">
    {children}
  </label>
);

const FieldValue = ({ children }: { children: React.ReactNode }) => (
  <div className="font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">
    {children}
  </div>
);

// --- COMMENT MODAL ---
const CommentModal = ({
  isOpen,
  onClose,
  onSubmit,
  action,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (comment: string) => void;
  action: string;
  isLoading: boolean;
}) => {
  const [comment, setComment] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] p-6 rounded-2xl shadow-lg w-full max-w-md">
        <h3 className="text-lg font-semibold text-[#3F3F46] dark:text-[#E4E4E7] mb-4">
          Confirm {action}
        </h3>
        <textarea
          className="w-full border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] text-[#3F3F46] dark:text-[#E4E4E7] p-3 rounded-lg text-sm mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
          rows={4}
          placeholder="Add a comment (optional)..."
          maxLength={FIELD_CHAR_LIMITS.Text}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <CharLimitAlert value={comment} maxLength={FIELD_CHAR_LIMITS.Text} className="-mt-3 mb-3" />
        <div className="flex justify-end gap-2">
          <FrappeButton variant="outline" onClick={onClose} disabled={isLoading}>Cancel</FrappeButton>
          <FrappeButton variant="primary" onClick={() => onSubmit(comment)} disabled={isLoading}>
            {isLoading ? "Processing..." : "Confirm"}
          </FrappeButton>
        </div>
      </div>
    </div>
  );
};

// --- ACTIONS DROPDOWN ---
const ActionsDropdown = ({
  docname,
  workflowState,
  onActionComplete,
  onEdit,
  onSubmit,
  onDownload,
  isSubmitting,
  commitRequired = false,
  onError,
}: {
  docname: string;
  workflowState: string;
  onActionComplete: () => void;
  onEdit: () => void;
  onSubmit: () => void;
  onDownload: () => void;
  isSubmitting: boolean;
  commitRequired?: boolean;
  onError: (message: string) => void;
}) => {
  const { data, isLoading: actionsLoading } = useFrappeGetCall<{ message: string[] }>(
    "rndopsapp.rndopsapp.doctype.reimbursement.reimbursement.get_reimbursement_workflow_actions",
    { docname },
  );
  const { call: performAction, loading: actionLoading, error: performActionError } = useFrappePostCall(
    "rndopsapp.rndopsapp.doctype.reimbursement.reimbursement.perform_reimbursement_action",
  );

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState("");
  const toggleBtnRef = React.useRef<HTMLButtonElement>(null);
  const dropdownPortalRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!dropdownOpen) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!toggleBtnRef.current?.contains(target) && !dropdownPortalRef.current?.contains(target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [dropdownOpen]);

  const handleToggleDropdown = () => {
    if (!dropdownOpen && toggleBtnRef.current) {
      const rect = toggleBtnRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + window.scrollY + 4, right: window.innerWidth - rect.right });
    }
    setDropdownOpen((o) => !o);
  };

  const handleWorkflowClick = (action: string) => {
    setDropdownOpen(false);
    setSelectedAction(action);
    setModalOpen(true);
  };

  const handleConfirmAction = async (comment: string) => {
    try {
      await performAction({ docname, action: selectedAction, comment });
      setModalOpen(false);
      onActionComplete();
    } catch (error) {
      console.error("Error performing action:", error);
      onError(parseFrappeError(performActionError, error));
    }
  };

  const isDraft = workflowState === "Draft" || !workflowState;
  // workflow actions from API, excluding "Submit" (handled by our own submit logic)
  const workflowActions = (data?.message || []).filter((a) => a.toLowerCase() !== "submit");

  const categorise = (action: string) => {
    const a = action.toLowerCase();
    if (a.includes("forward") || a.includes("approve")) return "forward";
    if (a.includes("reject")) return "reject";
    return "neutral";
  };

  const forwardActions = workflowActions.filter((a) => categorise(a) === "forward");
  const neutralActions = workflowActions.filter((a) => categorise(a) === "neutral");
  const rejectActions = workflowActions.filter((a) => categorise(a) === "reject");

  const itemStyle = (action: string) => {
    const cat = categorise(action);
    if (cat === "forward") return {
      icon: <CheckCircleIcon className="h-3.5 w-3.5" />,
      cls: "text-[#D97757] hover:bg-orange-50 dark:hover:bg-orange-900/20",
      iconCls: "text-[#D97757]",
    };
    if (cat === "reject") return {
      icon: <XCircleIcon className="h-3.5 w-3.5" />,
      cls: "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20",
      iconCls: "text-red-500",
    };
    return {
      icon: <ChevronRight className="h-3.5 w-3.5" />,
      cls: "text-[#3F3F46] dark:text-[#E4E4E7] hover:bg-zinc-50 dark:hover:bg-zinc-700",
      iconCls: "text-zinc-400 dark:text-zinc-500",
    };
  };

  const isLoading = actionsLoading || actionLoading || isSubmitting;

  return (
    <>
      <div className="relative">
        <button
          ref={toggleBtnRef}
          onClick={handleToggleDropdown}
          disabled={isLoading}
          className={cn(
            "inline-flex items-center gap-2 h-9 px-4 text-xs font-bold uppercase tracking-wide rounded-lg shadow-sm transition-all disabled:opacity-50",
            dropdownOpen
              ? "bg-[#D97757] text-white border border-[#c66a4e]"
              : "bg-[#FFF7ED] dark:bg-[#D97757]/15 text-[#D97757] border border-[#D97757]/40 hover:bg-[#D97757] hover:text-white dark:hover:bg-[#D97757]/30",
          )}
        >
          {isLoading ? "Processing…" : "Actions"}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-150", dropdownOpen && "rotate-180")} />
        </button>

        {dropdownOpen && createPortal(
          <div
            ref={dropdownPortalRef}
            style={{ position: "absolute", top: dropdownPos.top, right: dropdownPos.right, zIndex: 9999 }}
            className="min-w-[210px] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-100 dark:border-zinc-700">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Actions
              </span>
            </div>

            {/* Commit gate warning */}
            {commitRequired && (
              <div className="mx-3 mt-3 mb-1 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                A commitment must be submitted before proceeding.
              </div>
            )}

            {/* Draft actions: Edit + Submit */}
            {isDraft && (
              <>
                <button
                  onClick={() => { setDropdownOpen(false); onEdit(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-semibold text-left text-[#3F3F46] dark:text-[#E4E4E7] hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                >
                  <span className="text-zinc-400"><PencilIcon className="h-3.5 w-3.5" /></span>
                  Edit
                </button>
                <button
                  onClick={() => { setDropdownOpen(false); onSubmit(); }}
                  disabled={isSubmitting}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-semibold text-left text-[#D97757] hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors disabled:opacity-50"
                >
                  <span className="text-[#D97757]"><CheckCircleIcon className="h-3.5 w-3.5" /></span>
                  Submit
                </button>
              </>
            )}

            {/* Workflow actions from API */}
            {(forwardActions.length > 0 || neutralActions.length > 0 || rejectActions.length > 0) && (
              <>
                {isDraft && <div className="h-px bg-zinc-100 dark:bg-zinc-700 mx-3" />}
                {[forwardActions, neutralActions, rejectActions]
                  .filter((g) => g.length > 0)
                  .map((group, gi) => (
                    <React.Fragment key={gi}>
                      {gi > 0 && <div className="h-px bg-zinc-100 dark:bg-zinc-700 mx-3" />}
                      {group.map((action) => {
                        const a = action.toLowerCase();
                        const exempt = categorise(action) === "reject" || a.includes("put back");
                        const blocked = commitRequired && !exempt;
                        const { icon, cls, iconCls } = itemStyle(action);
                        return (
                          <div key={action} className="relative group/item">
                            <button
                              onClick={() => { if (!blocked) handleWorkflowClick(action); }}
                              disabled={actionLoading || blocked}
                              className={cn(
                                "w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-semibold text-left transition-colors disabled:cursor-not-allowed",
                                blocked ? "opacity-40" : cls,
                              )}
                            >
                              <span className={iconCls}>{icon}</span>
                              {action}
                              {blocked && (
                                <span className="ml-auto text-[10px] font-normal text-zinc-400">blocked</span>
                              )}
                            </button>
                            {blocked && (
                              <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 hidden group-hover/item:block z-[9999]">
                                <div className="bg-zinc-900 text-white text-[11px] rounded-lg px-3 py-1.5 shadow-lg whitespace-nowrap">
                                  A commitment must be submitted before proceeding.
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
              </>
            )}

            {/* Download — always visible */}
            <div className="h-px bg-zinc-100 dark:bg-zinc-700 mx-3" />
            <button
              onClick={() => { setDropdownOpen(false); onDownload(); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-semibold text-left text-[#3F3F46] dark:text-[#E4E4E7] hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
            >
              <span className="text-zinc-400"><DownloadIcon className="h-3.5 w-3.5" /></span>
              Download / Print
            </button>
          </div>,
          document.body,
        )}
      </div>

      <CommentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleConfirmAction}
        action={selectedAction}
        isLoading={actionLoading}
      />
    </>
  );
};

const ReimbursementDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ReimbursementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedNames, setResolvedNames] = useState<Record<string, string>>({});
  const [projectNo, setProjectNo] = useState<string>("");
  const [errorModal, setErrorModal] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({ open: false, title: "Submission Failed", message: "" });

  const { call: fetchDoc } = useFrappePostCall<{ message: ReimbursementData }>(
    "frappe.client.get",
  );
  const { call: fetchLinkValue } = useFrappePostCall<{ message: any }>(
    "frappe.client.get_value",
  );
  const { call: submitDoc } = useFrappePostCall<{ message: any }>(
    "rndopsapp.rndopsapp.doctype.reimbursement.reimbursement.submit_reimbursement",
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const resolveLinkName = async (
    doctype: string,
    docId: string,
    fieldname: string,
  ) => {
    if (!docId) return "";
    try {
      const result = await fetchLinkValue({
        doctype,
        filters: { name: docId },
        fieldname,
      });
      return result?.message?.[fieldname] || docId;
    } catch {
      return docId;
    }
  };

  const { currentUser } = useFrappeAuth();
  const { roles } = useUserRoles(currentUser ?? null);

  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [commitHead, setCommitHead] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isCommittedForGate, setIsCommittedForGate] = useState<boolean | null>(null);

  const { call: submitPayment, loading: isPaying } = useFrappePostCall(
    "rndopsapp.rndopsapp.commitPayment.submit_payment_data",
  );

  const projectTitle = projectNo || data?.project_number || "";
  const [budgetHeadList, setBudgetHeadList] = useState<{ name: string; id: string }[]>([]);

  useEffect(() => {
    const fetchBudgetHeads = async () => {
      try {
        const response = await fetch(
          '/api/resource/Budget%20Head?fields=["budget_head","id"]&order_by=id%20asc&limit_page_length=0',
        );
        const result = await response.json();
        if (result?.data) {
          setBudgetHeadList(
            result.data.map((item: any) => ({ name: item.budget_head, id: item.id })),
          );
        }
      } catch (err) {
        console.error("Failed to fetch Budget Heads:", err);
      }
    };
    fetchBudgetHeads();
  }, []);

  const { budgetData, heads: budgetHeads, actualBalance, commitableBalance } = useProjectBudget(projectTitle);

  const balanceApiParams = React.useMemo(() => ({ project_number: projectTitle }), [projectTitle]);
  const balanceApiOptions = React.useMemo(
    () => ({ revalidateOnFocus: false, isPaused: () => !projectTitle }),
    [projectTitle],
  );
  const { data: projectAmountsData } = useFrappeGetCall<{
    message: { status: string; data: { availableCommitAmount: number; availablePaymentAmount: number } };
  }>(
    "rndopsapp.rndopsapp.commitPayment.get_project_available_amounts",
    balanceApiParams,
    balanceApiOptions,
  );
  const projectAmountsResult =
    (projectAmountsData as any)?.message?.data ?? (projectAmountsData as any)?.data ?? {};
  const totalCommitableBalance = projectAmountsResult?.availableCommitAmount ?? 0;

  const linkedCommitment = budgetData.find(
    (e) => (e.ref === (id || "") || e.frapAppId === (id || "")) && e.type === "commitment",
  );
  const isCommitted = !!linkedCommitment;

  const { data: cancellationStatus } = useFrappeGetCall<{
    message: {
      has_pending: boolean;
      has_cancellation: boolean;
      cancellation_requests: any[];
    };
  }>(
    "rndopsapp.rndopsapp.cancellation_api.get_cancellation_status",
    {
      reference_doctype: "Reimbursement",
      reference_name: id,
    },
    id ? undefined : null
  );

  useEffect(() => {
    if (budgetHeads.length > 0 && !commitHead) setCommitHead(budgetHeads[0]);
  }, [budgetHeads]);

  useEffect(() => {
    if (linkedCommitment) {
      setCommitHead(linkedCommitment.head || "");
      if (!paymentAmount) setPaymentAmount(String(linkedCommitment.committed));
    }
  }, [linkedCommitment]);

  const isRnDStaff = roles.some(
    (r) =>
      r === "RnD Staff" ||
      r === "R&D Staff" ||
      r === "Research and Development Staff" ||
      r === "System Manager" ||
      r === "staff, RnD" ||
      r === "Hos, RnD (Head of Section, RnD)",
  );

  const handlePayment = async () => {
    if (!paymentAmount || !commitHead || !id || !data) {
      alert("Please select a budget head and enter an amount.");
      return;
    }
    try {
      await submitPayment({
        doctype: "Reimbursement",
        name: id,
        project_name: data.project_name,
        payment_amount: parseFloat(paymentAmount),
        budget_head: commitHead,
        bmr: "",
      });
      alert("Payment recorded successfully!");
      setPaymentAmount("");
      window.location.reload();
    } catch (error: any) {
      console.error("Payment failed:", error);
      setErrorModal({
        open: true,
        title: "Payment Failed",
        message: parseFrappeError(error),
      });
    }
  };

  const handleSubmit = async () => {
    if (!data || isSubmitting) return;
    if (!confirm("Are you sure you want to submit this reimbursement application? This action cannot be undone.")) return;

    setIsSubmitting(true);
    try {
      await submitDoc({ docname: data.name });
      alert("Reimbursement submitted successfully!");
      const refreshed = await fetchDoc({ doctype: "Reimbursement", name: data.name });
      if (refreshed?.message) setData(refreshed.message);
    } catch (err: any) {
      console.error("Error submitting reimbursement:", err);
      setErrorModal({
        open: true,
        title: "Submission Failed",
        message: parseFrappeError(err),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (!id) {
        setError("No reimbursement ID provided");
        setLoading(false);
        return;
      }
      try {
        const response = await fetchDoc({ doctype: "Reimbursement", name: id });
        if (response?.message) {
          const docData = response.message;
          setData(docData);

          const nameMap: Record<string, string> = {};
          if (docData.reimbursement_for_department) {
            nameMap.reimbursement_for_department = await resolveLinkName(
              "Department_prornd", docData.reimbursement_for_department, "dept_name",
            );
          }
          if (docData.applicant_department) {
            nameMap.applicant_department = await resolveLinkName(
              "Department_prornd", docData.applicant_department, "dept_name",
            );
          }
          if (docData.account_head) {
            nameMap.account_head = await resolveLinkName("Budget Head", docData.account_head, "budget_head");
          }
          if (docData.applicant_webmail) {
            nameMap.applicant_name = await resolveLinkName("User", docData.applicant_webmail, "full_name");
          }
          if (docData.project_name) {
            nameMap.project_name = await resolveLinkName("Project Registration", docData.project_name, "project_title");
            if (nameMap.project_name === docData.project_name) {
              const altTitle = await resolveLinkName("Project Registration", docData.project_name, "title");
              if (altTitle !== docData.project_name) nameMap.project_name = altTitle;
            }
          }
          setResolvedNames(nameMap);
        } else {
          setError("Reimbursement not found");
        }
      } catch (err) {
        console.error("Error fetching reimbursement:", err);
        setError("Failed to load reimbursement details");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  useEffect(() => {
    const fetchProjectNo = async () => {
      if (!data?.project_name) return;
      try {
        const response = await fetch(
          `/api/v2/document/Project%20Proposal/${data.project_name}?fields=["project_no","project_title"]`,
        );
        if (response.ok) {
          const json = await response.json();
          if (json.data?.project_no) { setProjectNo(json.data.project_no); return; }
        }
        if (data.project_number) setProjectNo(data.project_number);
      } catch {
        if (data.project_number) setProjectNo(data.project_number);
      }
    };
    fetchProjectNo();
  }, [data?.project_name, data?.project_number]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const generateDownloadHTML = () => {
    if (!data) return "";
    const now = new Date();
    const formattedDate = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const formattedTime = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
    const applicationDate = data.creation
      ? new Date(data.creation).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
      })
      : "-";

    const totalAmount = data.table_bosk?.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0) || 0;

    const expenditureRows =
      data.table_bosk
        ?.map(
          (item: any, index: number) => `
            <tr>
                <td style="text-align: center;">${index + 1}</td>
                <td>${item.r_date ? new Date(item.r_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-"}</td>
                <td>${item.particulars || "-"}</td>
                <td>${item.vendors_name || "-"}</td>
                <td style="text-align: center;">${(parseFloat(item.amount) || 0).toLocaleString("en-IN")}</td>
                <td style="color: blue; text-decoration: underline;">${item.uploads ? "Attached" : "No file"}</td>
            </tr>
        `,
        )
        .join("") ||
      '<tr><td colspan="6" style="text-align: center;">No items</td></tr>';

    const declarations = [
      "None of the items are purchased or under rate contract.",
      "The items purchased were approved by the funding agency and I have enclosed the original cash memo/ retail invoice/ money receipt initialed by the Drawer.",
      '"I, am personally satisfied that goods purchased are of the requisite quality and specification and have been purchased from a reliable supplier at a reasonable price."',
      "I stock entered the items, and entered the stock entry details on the reverse side of the cash memo/ money receipt with my signature.",
    ];
    const acceptedDeclarations = declarations
      .filter((_, i) => data[`dec${i + 1}`])
      .map((dec) => `<li>${dec}</li>`)
      .join("");

    const applicantName = resolvedNames.applicant_name || data.applicant_webmail || "-";

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reimbursement - ${data.name}</title>
    <style>
        @page { size: A4; margin: 12mm 14mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Arial', sans-serif; font-size: 10.5px; line-height: 1.45; color: #1a1a2e; background: #e8e8e8; padding: 12px; }
        .page { width: 182mm; max-width: 100%; margin: 0 auto; background: #fff; padding: 18px 22px 60px; box-shadow: 0 2px 16px rgba(0,0,0,0.13); position: relative; min-height: 257mm; }

        /* Header */
        .header { display: flex; align-items: center; border-bottom: 3px solid #1a3a6b; padding-bottom: 10px; margin-bottom: 10px; }
        .logo-img { width: 58px; height: 58px; object-fit: contain; margin-right: 14px; flex-shrink: 0; }
        .header-text { flex: 1; }
        .header-text .inst-hi { font-size: 13.5px; font-weight: 700; color: #1a3a6b; letter-spacing: 0.3px; }
        .header-text .inst-en { font-size: 12px; font-weight: 700; color: #1a3a6b; letter-spacing: 0.5px; text-transform: uppercase; }
        .header-text .dept { font-size: 9.5px; color: #555; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase; margin-top: 2px; }
        .header-right { text-align: right; flex-shrink: 0; }
        .header-right .doc-id { font-size: 9px; font-weight: 700; color: #1a3a6b; letter-spacing: 0.5px; border: 1.5px solid #1a3a6b; padding: 3px 8px; border-radius: 4px; display: inline-block; }
        .header-right .doc-date { font-size: 9px; color: #666; margin-top: 4px; }

        /* Title band */
        .title-band { background: #1a3a6b; color: #fff; text-align: center; padding: 7px 0; font-size: 13px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; border-radius: 4px; margin: 10px 0; }

        /* Status badge */
        .status-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .status-badge { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; padding: 3px 10px; border-radius: 20px; background: #e8f0fe; color: #1a3a6b; border: 1.5px solid #1a3a6b; }
        .app-date { font-size: 9px; color: #666; }

        /* Two-column info grid */
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
        .info-card { border: 1px solid #dde2ee; border-radius: 6px; overflow: hidden; }
        .info-card-full { grid-column: span 2; border: 1px solid #dde2ee; border-radius: 6px; overflow: hidden; }
        .card-header { background: #f0f4fb; border-bottom: 1px solid #dde2ee; padding: 5px 10px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #1a3a6b; }
        .card-body { padding: 8px 10px; }
        .field-row { display: flex; align-items: baseline; margin-bottom: 5px; }
        .field-row:last-child { margin-bottom: 0; }
        .field-label { width: 110px; flex-shrink: 0; font-size: 9px; color: #666; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; }
        .field-value { font-size: 10px; font-weight: 600; color: #1a1a2e; flex: 1; }
        .field-value.highlight { color: #1a3a6b; font-weight: 700; font-size: 11px; }
        .field-value.mono { font-family: 'Courier New', monospace; letter-spacing: 0.5px; }

        /* Expenditure table */
        .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #1a3a6b; border-bottom: 2px solid #1a3a6b; padding-bottom: 4px; margin: 12px 0 6px; }
        table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
        thead tr { background: #1a3a6b; color: #fff; }
        thead th { padding: 5px 7px; font-weight: 700; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #1a3a6b; }
        thead th.center { text-align: center; }
        thead th.right { text-align: right; }
        tbody tr { border-bottom: 1px solid #e8eaf0; }
        tbody tr:nth-child(even) { background: #f7f9fc; }
        tbody td { padding: 5px 7px; border: 1px solid #dde2ee; vertical-align: top; }
        tbody td.center { text-align: center; }
        tbody td.right { text-align: right; font-weight: 600; }
        tfoot tr { background: #f0f4fb; font-weight: 700; }
        tfoot td { padding: 5px 7px; border: 1px solid #dde2ee; }
        tfoot td.right { text-align: right; color: #1a3a6b; font-size: 11px; }

        /* Declaration */
        .declaration-box { border: 1px solid #dde2ee; border-radius: 6px; overflow: hidden; margin-top: 10px; }
        .decl-header { background: #f0f4fb; border-bottom: 1px solid #dde2ee; padding: 5px 10px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #1a3a6b; }
        .decl-body { padding: 7px 10px; font-size: 9px; color: #333; }
        .decl-body ol { padding-left: 16px; }
        .decl-body li { margin-bottom: 4px; line-height: 1.4; }

        /* Comments */
        .comment-box { border: 1px solid #dde2ee; border-radius: 6px; margin-top: 10px; overflow: hidden; }
        .comment-header { background: #fffbea; border-bottom: 1px solid #e8d96a; padding: 5px 10px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #7a6100; }
        .comment-body { padding: 7px 10px; font-size: 9.5px; color: #333; font-style: italic; }

        /* Footer */
        .page-footer { position: absolute; bottom: 12px; left: 22px; right: 22px; border-top: 1px solid #dde2ee; padding-top: 6px; display: flex; justify-content: space-between; align-items: center; }
        .footer-note { font-size: 8.5px; color: #888; font-style: italic; }
        .footer-meta { font-size: 8.5px; color: #999; text-align: right; }

        @media print {
            body { background: none; padding: 0; }
            .page { box-shadow: none; margin: 0; width: 100%; padding: 0; min-height: auto; }
        }
    </style>
</head>
<body>
<div class="page">

    <!-- Header -->
    <div class="header">
        <img src="http://${import.meta.env.VITE_ASSET_HOST || '172.16.117.39'}:${import.meta.env.VITE_ASSET_PORT || '8000'}/files/IITG_logo.png" alt="IITG Logo" class="logo-img" />
        <div class="header-text">
            <div class="inst-hi">भारतीय प्रौद्योगिकी संस्थान गुवाहाटी</div>
            <div class="inst-en">Indian Institute of Technology Guwahati</div>
            <div class="dept">Research and Development Cell</div>
        </div>
        <div class="header-right">
            <div class="doc-id">${data.name}</div>
            <div class="doc-date">Date: ${formattedDate}</div>
        </div>
    </div>

    <!-- Title Band -->
    <div class="title-band">Application for Reimbursement</div>

    <!-- Status Row -->
    <div class="status-row">
        <span class="status-badge">${data.workflow_state || "Draft"}</span>
        <span class="app-date">Submitted: ${applicationDate}</span>
    </div>

    <!-- Info Grid -->
    <div class="info-grid">

        <!-- Applicant Details -->
        <div class="info-card">
            <div class="card-header">Applicant Details</div>
            <div class="card-body">
                <div class="field-row">
                    <div class="field-label">Name</div>
                    <div class="field-value highlight">${applicantName}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Department</div>
                    <div class="field-value">${resolvedNames.applicant_department || data.applicant_department || "-"}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Designation</div>
                    <div class="field-value">${data.applicant_designation || "-"}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Email ID</div>
                    <div class="field-value mono">${data.applicant_webmail || "-"}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Initiated by</div>
                    <div class="field-value mono">${data.owner || "-"}</div>
                </div>
            </div>
        </div>

        <!-- Project Details -->
        <div class="info-card">
            <div class="card-header">Project Details</div>
            <div class="card-body">
                <div class="field-row">
                    <div class="field-label">Project No.</div>
                    <div class="field-value mono">${data.project_number || "-"}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Project Name</div>
                    <div class="field-value">${resolvedNames.project_name || data.project_name || "-"}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Account Head</div>
                    <div class="field-value">${resolvedNames.account_head || data.account_head || "-"}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Own / Other</div>
                    <div class="field-value">${data.self_other || "Own"}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Total Amount</div>
                    <div class="field-value highlight">₹ ${totalAmount.toLocaleString("en-IN")}</div>
                </div>
            </div>
        </div>

        <!-- Bank Details -->
        <div class="info-card info-card-full">
            <div class="card-header">Bank Details</div>
            <div class="card-body" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0 20px;">
                <div class="field-row">
                    <div class="field-label">Bank Name</div>
                    <div class="field-value">${data.bank_name || "-"}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Account Holder</div>
                    <div class="field-value">${data.account_holder_name || "-"}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Account No.</div>
                    <div class="field-value mono">${data.bank_account_number || "-"}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">IFSC Code</div>
                    <div class="field-value mono">${data.ifsc_code || "-"}</div>
                </div>
            </div>
        </div>

    </div>

    <!-- Expenditure Table -->
    <div class="section-title">Expenditure Details</div>
    <table>
        <thead>
            <tr>
                <th class="center" style="width: 28px;">Sl.</th>
                <th style="width: 70px;">Date</th>
                <th>Particulars</th>
                <th>Vendor's Name</th>
                <th class="right" style="width: 80px;">Amount (₹)</th>
                <th class="center" style="width: 70px;">Attachment</th>
            </tr>
        </thead>
        <tbody>${expenditureRows}</tbody>
        <tfoot>
            <tr>
                <td colspan="4" style="text-align: right; font-weight: 700; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #555;">Total Amount</td>
                <td class="right" style="color: #1a3a6b; font-size: 11px;">₹ ${totalAmount.toLocaleString("en-IN")}</td>
                <td></td>
            </tr>
        </tfoot>
    </table>

    ${acceptedDeclarations ? `
    <div class="declaration-box">
        <div class="decl-header">Applicant's Declaration</div>
        <div class="decl-body"><ol>${acceptedDeclarations}</ol></div>
    </div>` : ""}

    ${data.comment ? `
    <div class="comment-box">
        <div class="comment-header">Remarks / Comments</div>
        <div class="comment-body">${data.comment}</div>
    </div>` : ""}

    <!-- Footer -->
    <div class="page-footer">
        <div class="footer-note">N.B. This is a system-generated document. No signature required.</div>
        <div class="footer-meta">
            <div>rndops.iitg.ac.in</div>
            <div>${formattedDate}, ${formattedTime}</div>
        </div>
    </div>

</div>
</body>
</html>`;
  };

  const handleDownload = () => {
    const htmlContent = generateDownloadHTML();
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setTimeout(() => { printWindow.print(); }, 500);
    }
  };

  if (loading) return <GlobalLoader isLoading={true} />;

  if (error || !data) {
    return (
      <div className="bg-claude-bg dark:bg-zinc-900 min-h-screen">
        <AppSidebar />
        <main className="flex-1 p-4 md:p-8">
          <FrappeCard className="text-center py-16">
            <FileTextIcon className="w-16 h-16 mx-auto text-zinc-400 dark:text-zinc-500 mb-4" />
            <h2 className="text-xl font-bold text-[#3F3F46] dark:text-[#E4E4E7] mb-2 uppercase">
              Error Loading Reimbursement
            </h2>
            <p className="text-[#3F3F46] dark:text-[#E4E4E7] mb-6">{error || "Reimbursement not found"}</p>
            <FrappeButton variant="primary" onClick={() => navigate(-1)}>Go Back</FrappeButton>
          </FrappeCard>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-claude-bg dark:bg-zinc-900 min-h-screen">
      <GlobalLoader isLoading={isSubmitting} />
      <AppSidebar />
      <main className="flex-1 p-4 md:p-8">
        {/* Header */}
        <PageHeader
          title={data.name}
          status={data.workflow_state || "Draft"}
          projectName={data.project_name}
          projectNumber={projectNo || data.project_number}
        >
          <div className="flex items-center gap-3">
            <ViewProjectButton doctype="Reimbursement" data={data} />
            <div className="text-right text-sm text-[#3F3F46] dark:text-[#E4E4E7] hidden md:block">
              <div className="flex items-center gap-1 font-medium justify-end">
                <CalendarIcon className="w-4 h-4" />
                Created: {formatDate(data.creation)}
              </div>
              <div className="flex items-center gap-1 mt-1 font-medium justify-end">
                <UserIcon className="w-4 h-4" />
                By: {data.owner}
              </div>
            </div>
            {!cancellationStatus?.message?.has_pending && (
              <ActionsDropdown
                docname={data.name}
                workflowState={data.workflow_state || "Draft"}
                onActionComplete={() => window.location.reload()}
                onEdit={() => navigate(`/reimbursement?edit=${data.name}`)}
                onSubmit={handleSubmit}
                onDownload={handleDownload}
                isSubmitting={isSubmitting}
                commitRequired={
                  isRnDStaff &&
                  isCommittedForGate === false &&
                  data.workflow_state === "Pending Staff Approval"
                }
                onError={(message) =>
                  setErrorModal({ open: true, title: "Action Failed", message })
                }
              />
            )}
            {cancellationStatus?.message?.has_pending && (
              <FrappeButton variant="outline" onClick={handleDownload}>
                <DownloadIcon className="w-4 h-4" />
              </FrappeButton>
            )}
          </div>
        </PageHeader>

        {/* Warning Banner if there's a pending cancellation */}
        {cancellationStatus?.message?.has_pending && (
          <div className="mb-6 p-4 rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 flex items-center gap-3 shadow-sm">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
            <div className="text-sm font-medium">
              This application has a pending cancellation request. No further workflow actions can be performed on it.
            </div>
          </div>
        )}
        {/* Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Content (3 cols) */}
          <div className="xl:col-span-3 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Applicant Details */}
              <FrappeCard
                title="Applicant Details"
                className={
                  !(data.reimbursement_for_id || data.reimbursement_for_department || data.reimbursement_for_designation)
                    ? "lg:col-span-2"
                    : ""
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <FieldLabel>Name</FieldLabel>
                    <FieldValue>{resolvedNames.applicant_name || data.applicant_webmail || "-"}</FieldValue>
                  </div>
                  <div>
                    <FieldLabel>Applicant Webmail</FieldLabel>
                    <FieldValue>{data.applicant_webmail || "-"}</FieldValue>
                  </div>
                  <div>
                    <FieldLabel>Department</FieldLabel>
                    <FieldValue>
                      {resolvedNames.applicant_department || data.applicant_department || "-"}
                    </FieldValue>
                  </div>
                  <div>
                    <FieldLabel>Designation</FieldLabel>
                    <FieldValue>{data.applicant_designation || "-"}</FieldValue>
                  </div>
                </div>
              </FrappeCard>

              {/* Reimbursement For */}
              {(data.reimbursement_for_id || data.reimbursement_for_department || data.reimbursement_for_designation) && (
                <FrappeCard title="Reimbursement For">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <FieldLabel>Webmail ID</FieldLabel>
                      <FieldValue>{data.reimbursement_for_id || "-"}</FieldValue>
                    </div>
                    <div>
                      <FieldLabel>Department</FieldLabel>
                      <FieldValue>
                        {resolvedNames.reimbursement_for_department || data.reimbursement_for_department || "-"}
                      </FieldValue>
                    </div>
                    <div>
                      <FieldLabel>Designation</FieldLabel>
                      <FieldValue>{data.reimbursement_for_designation || "-"}</FieldValue>
                    </div>
                  </div>
                </FrappeCard>
              )}

              {/* Bank Details */}
              <FrappeCard title="Bank Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <FieldLabel>Bank Name</FieldLabel>
                    <FieldValue>{data.bank_name || "-"}</FieldValue>
                  </div>
                  <div>
                    <FieldLabel>Account Holder</FieldLabel>
                    <FieldValue>{data.account_holder_name || "-"}</FieldValue>
                  </div>
                  <div>
                    <FieldLabel>Account Number</FieldLabel>
                    <FieldValue>
                      <span className="font-mono">{data.bank_account_number || "-"}</span>
                    </FieldValue>
                  </div>
                  <div>
                    <FieldLabel>IFSC Code</FieldLabel>
                    <FieldValue>
                      <span className="font-mono">{data.ifsc_code || "-"}</span>
                    </FieldValue>
                  </div>
                </div>
              </FrappeCard>

              {/* Project Details */}
              <FrappeCard title="Project Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <FieldLabel>Project Number</FieldLabel>
                    <FieldValue>{data.project_number || "-"}</FieldValue>
                  </div>
                  <div>
                    <FieldLabel>Project Name</FieldLabel>
                    <FieldValue>{resolvedNames.project_name || data.project_name || "-"}</FieldValue>
                  </div>
                  <div>
                    <FieldLabel>Account Head</FieldLabel>
                    <FieldValue>{resolvedNames.account_head || data.account_head || "-"}</FieldValue>
                  </div>
                  {data.other_head && (
                    <div>
                      <FieldLabel>Other Head</FieldLabel>
                      <FieldValue>{data.other_head}</FieldValue>
                    </div>
                  )}
                  <div>
                    <FieldLabel>Own / Other Project</FieldLabel>
                    <FieldValue>{data.self_other || "Own"}</FieldValue>
                  </div>
                </div>
              </FrappeCard>

              {/* Expenditure Table */}
              {data.table_bosk && data.table_bosk.length > 0 && (
                <FrappeCard title="Particulars of Items" className="lg:col-span-2">
                  <div className="overflow-x-auto border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl">
                    <table className="min-w-full divide-y divide-[#E4E4E7] dark:divide-[#3F3F46]">
                      <thead className="bg-[#FAFAF9] dark:bg-[#18181B]">
                        <tr className="divide-x divide-[#E4E4E7] dark:divide-[#3F3F46]">
                          <th className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA]">Date</th>
                          <th className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA]">Vendor's Name</th>
                          <th className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA]">Particulars</th>
                          <th className="px-4 py-3 text-right text-[11px] font-extrabold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA]">Amount</th>
                          <th className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA]">Attachment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E4E4E7] dark:divide-[#3F3F46] bg-white dark:bg-[#27272A]">
                        {data.table_bosk.map((item: any, index: number) => (
                          <tr key={item.name || index} className="hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] divide-x divide-[#E4E4E7] dark:divide-[#3F3F46]">
                            <td className="px-4 py-3 text-sm text-[#3F3F46] dark:text-[#E4E4E7] font-mono">
                              {item.r_date ? new Date(item.r_date).toLocaleDateString("en-IN") : "-"}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">{item.vendors_name || "-"}</td>
                            <td className="px-4 py-3 text-sm text-[#3F3F46] dark:text-[#E4E4E7]">{item.particulars || "-"}</td>
                            <td className="px-4 py-3 text-sm font-bold text-right text-[#3F3F46] dark:text-[#E4E4E7]">
                              ₹{(parseFloat(item.amount) || 0).toLocaleString("en-IN")}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {item.uploads ? (
                                <a href={item.uploads} target="_blank" rel="noopener noreferrer" className="text-[#D97757] font-bold hover:underline">
                                  View File
                                </a>
                              ) : (
                                <span className="text-[#71717A] dark:text-[#A1A1AA]">No file</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-[#FAFAF9] dark:bg-[#18181B] border-t-2 border-[#E4E4E7] dark:border-[#3F3F46]">
                        <tr>
                          <td colSpan={3} className="px-4 py-3 text-sm font-bold text-[#3F3F46] dark:text-[#E4E4E7] text-right uppercase tracking-wider">
                            Total Amount:
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-[#3F3F46] dark:text-[#E4E4E7] text-right">
                            ₹{data.table_bosk.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0).toLocaleString("en-IN")}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </FrappeCard>
              )}

              {/* Comments */}
              {data.comment && (
                <FrappeCard title="Comments" className="lg:col-span-2">
                  <p className="text-[#3F3F46] dark:text-[#E4E4E7] whitespace-pre-wrap font-medium">
                    {data.comment}
                  </p>
                </FrappeCard>
              )}

              {/* Declarations */}
              <div className="lg:col-span-2">
                <DeclarationFields doctype="Reimbursement" />
              </div>

              {/* Meta Information */}
              <FrappeCard title="Meta Information" className="lg:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <FieldLabel>Created</FieldLabel>
                    <FieldValue>
                      <span className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-zinc-400" />
                        {formatDate(data.creation)}
                      </span>
                    </FieldValue>
                  </div>
                  <div>
                    <FieldLabel>Last Modified</FieldLabel>
                    <FieldValue>
                      <span className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-zinc-400" />
                        {formatDate(data.modified)}
                      </span>
                    </FieldValue>
                  </div>
                  <div>
                    <FieldLabel>Owner</FieldLabel>
                    <FieldValue>
                      <span className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-zinc-400" />
                        {data.owner}
                      </span>
                    </FieldValue>
                  </div>
                </div>
              </FrappeCard>
            </div>
          </div>

          {/* Right Sidebar */}
          <aside className="xl:col-span-1 space-y-6">
            {/* Project Budget */}
            <div className="bg-white dark:bg-[#27272A] p-5 rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm">
              <h3 className="text-[12px] font-extrabold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA] mb-4">
                Project Budget
              </h3>
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center bg-[#FAFAF9] dark:bg-[#18181B] p-3 rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46]">
                  <p className="text-sm font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">
                    Commitable Balance
                  </p>
                  <p className="text-xl font-bold text-[#D97757]">
                    ₹ {totalCommitableBalance.toLocaleString("en-IN")}
                  </p>
                </div>
                <button
                  onClick={() => setIsLedgerOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FAFAF9] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] text-[#D97757] font-bold text-sm hover:bg-[#F4F4F5] dark:hover:bg-[#27272A] transition-colors"
                >
                  <LedgerIcon className="w-4 h-4" />
                  View Project Ledger
                </button>
              </div>
            </div>

            {/* Commit & Payment (Staff only) */}
            {(data.workflow_state === "Approved" || data.workflow_state === "Pending Staff Approval") && isRnDStaff && (
              <>
                <CommitPayment
                  doctype="Reimbursement"
                  docName={id || ""}
                  projectName={data.project_name}
                  budgetHeads={budgetHeads}
                  actualBalance={actualBalance}
                  commitableBalance={commitableBalance}
                  onCommitSuccess={() => window.location.reload()}
                  onStagingStatusChange={(status) => setIsCommittedForGate(status)}
                />

                <div className="bg-white dark:bg-[#27272A] p-5 rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm">
                  <h3 className="text-[12px] font-extrabold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA] mb-4">
                    Record Payment
                  </h3>
                  {isCommitted ? (
                    <div className="space-y-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800 flex flex-col gap-1">
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wide">
                          Linked Commitment
                        </p>
                        <div className="flex justify-between items-end">
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-200">{linkedCommitment?.head}</p>
                          <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                            ₹ {linkedCommitment?.committed.toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                      <div>
                        <FieldLabel>Payment Amount (₹)</FieldLabel>
                        <input
                          type="number"
                          className="w-full px-3 py-2 border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl text-sm bg-white dark:bg-[#27272A] text-[#3F3F46] dark:text-[#E4E4E7] focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757] mt-1"
                          placeholder="e.g., 5000"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          max={linkedCommitment?.committed}
                        />
                        <p className="text-xs text-[#71717A] dark:text-[#A1A1AA] mt-1">
                          Max: ₹{linkedCommitment?.committed.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <FrappeButton
                        className="w-full"
                        variant="outline"
                        onClick={handlePayment}
                        disabled={isPaying || !paymentAmount || parseFloat(paymentAmount) > (linkedCommitment?.committed || 0)}
                      >
                        {isPaying ? "Processing..." : "Submit Payment"}
                      </FrappeButton>
                    </div>
                  ) : (
                    <div className="text-center py-6 px-4 bg-[#FAFAF9] dark:bg-[#18181B] rounded-xl border border-dashed border-[#E4E4E7] dark:border-[#3F3F46]">
                      <div className="mx-auto w-10 h-10 bg-[#F4F4F5] dark:bg-[#3F3F46] rounded-full flex items-center justify-center mb-3 text-[#71717A] dark:text-[#A1A1AA]">
                        <LedgerIcon className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">Commitment Required</p>
                      <p className="text-xs text-[#71717A] dark:text-[#A1A1AA] mt-1">
                        Please make a commitment above before recording payment.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Meta Info (sidebar) */}
            <FrappeCard>
              <div className="space-y-4">
                <div>
                  <FieldLabel>Created On</FieldLabel>
                  <FieldValue>
                    <span className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-zinc-400" />
                      {formatDate(data.creation)}
                    </span>
                  </FieldValue>
                </div>
                <div>
                  <FieldLabel>Last Modified</FieldLabel>
                  <FieldValue>
                    <span className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-zinc-400" />
                      {formatDate(data.modified)}
                    </span>
                  </FieldValue>
                </div>
                <div>
                  <FieldLabel>Owner</FieldLabel>
                  <FieldValue>
                    <span className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-zinc-400" />
                      {data.owner}
                    </span>
                  </FieldValue>
                </div>
              </div>
            </FrappeCard>
          </aside>
        </div>
      </main>

      {/* Budget Ledger Modal */}
      {isLedgerOpen && (
        <ProjectLedgerModal
          isOpen={isLedgerOpen}
          onClose={() => setIsLedgerOpen(false)}
          projectName={projectTitle}
          budgetHeadList={budgetHeadList}
        />
      )}

      {/* Floating Activity Log */}
      {id && <FloatingActivityLogButton doctype="Reimbursement" docname={id} />}

      <ErrorModal
        open={errorModal.open}
        title={errorModal.title}
        message={errorModal.message}
        onClose={() => setErrorModal((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
};

export default ReimbursementDetails;
