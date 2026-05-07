import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { GlobalLoader } from "@/components/ui/global-loader";
import { useProjectBudget } from "@/hooks/useProjectBudget";
import { useUserRoles } from "../../components/UserRole";
import { ProjectLedgerModal } from "../../components/ProjectLedgerModal";
import { Textarea } from "@/components/ui/textarea"; // Assuming this exists, if not use standard textarea
import { DeclarationFields } from "@/components/DeclarationFields";
import { CommitPayment } from "@/components/CommitPayment";
import { ActivityLog } from "@/components/ActivityLog";
import ViewProjectButton from "@/components/ViewProjectButton";

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

// Frappe-styled components
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
      "bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl shadow-sm",
      className,
    )}
  >
    {title && (
      <div className="px-6 py-4 border-b border-zinc-300 dark:border-zinc-700">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
          {title}
        </h3>
      </div>
    )}
    <div className="p-6">{children}</div>
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
      "bg-transparent text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 hover:text-zinc-900 dark:text-zinc-100",
      variant === "outline" &&
      "bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-lg dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800",
      variant === "action" &&
      "bg-[#D97757] text-white font-bold hover:bg-[#D97757] shadow-md hover:shadow-lg border-2 border-[#C66A4E]",
      "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
      className,
    )}
  >
    {children}
  </button>
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
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow-lg w-full max-w-md">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Confirm {action}
        </h3>
        <textarea
          className="w-full border border-zinc-300 dark:border-zinc-700 p-3 rounded-lg text-sm mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
          rows={4}
          placeholder="Add a comment (optional)..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <FrappeButton
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </FrappeButton>
          <FrappeButton
            variant="primary"
            onClick={() => onSubmit(comment)}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Confirm"}
          </FrappeButton>
        </div>
      </div>
    </div>
  );
};

// --- WORKFLOW ACTIONS COMPONENT ---
const ReimbursementWorkflowActions = ({
  docname,
  onActionComplete,
  commitRequired = false,
}: {
  docname: string;
  onActionComplete: () => void;
  commitRequired?: boolean;
}) => {
  const { data, isLoading: actionsLoading } = useFrappeGetCall<{
    message: string[];
  }>(
    "rndopsapp.rndopsapp.doctype.reimbursement.reimbursement.get_reimbursement_workflow_actions",
    { docname },
  );

  const { call: performAction, loading: actionLoading } = useFrappePostCall(
    "rndopsapp.rndopsapp.doctype.reimbursement.reimbursement.perform_reimbursement_action",
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState("");

  const handleActionClick = (action: string) => {
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
      alert("Failed to perform action. Please try again.");
    }
  };

  // Filter out "Submit" since the header already has a dedicated Submit button for Draft state
  const filteredActions = (data?.message || []).filter(
    (action) => action.toLowerCase() !== "submit",
  );

  if (actionsLoading || !filteredActions.length) return null;

  return (
    <>
      {commitRequired && (
        <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300 font-medium mb-4">
          A commitment must be submitted before forwarding this application.
        </div>
      )}
      <div className="flex gap-2 mb-4">
        {filteredActions.map((action) => (
          <FrappeButton
            key={action}
            onClick={() => handleActionClick(action)}
            disabled={actionLoading || commitRequired}
            variant={commitRequired ? "outline" : "action"}
            className={commitRequired ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500 cursor-not-allowed border-0" : ""}
          >
            {action}
          </FrappeButton>
        ))}
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

// --- Activity Stream Component ---
interface ActivityItem {
  owner: string;
  creation: string;
  content: string;
  comment_type: string;
}

const ActivityStream = ({
  doctype,
  docname,
}: {
  doctype: string;
  docname: string;
}) => {
  const { data: activityData, mutate: refetchActivity } = useFrappeGetCall<{
    message: ActivityItem[];
  }>("rndopsapp.rndopsapp.api.get_project_activity", { doctype, docname });

  // Initial refetch when mounted
  useEffect(() => {
    refetchActivity();
  }, [docname]);

  return (
    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
      {activityData?.message && activityData.message.length > 0 ? (
        activityData.message.map((activity, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center font-bold text-[#D97757] text-xs">
              {activity.owner?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <div
                className="text-sm text-zinc-800 dark:text-zinc-200 line-clamp-2 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: activity.content }}
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {activity.owner} ·{" "}
                {activity.creation
                  ? new Date(activity.creation).toLocaleString()
                  : ""}
              </p>
            </div>
          </div>
        ))
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 italic">
          No recent activity found.
        </p>
      )}
    </div>
  );
};

const ReimbursementDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ReimbursementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvedNames, setResolvedNames] = useState<Record<string, string>>(
    {},
  );
  const [projectNo, setProjectNo] = useState<string>("");

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

  // Function to resolve a link field ID to its display name
  const resolveLinkName = async (
    doctype: string,
    docId: string,
    fieldname: string,
  ) => {
    if (!docId) return "";
    try {
      const result = await fetchLinkValue({
        doctype: doctype,
        filters: { name: docId },
        fieldname: fieldname,
      });
      const resolvedValue = result?.message?.[fieldname] || docId;
      return resolvedValue;
    } catch (err) {
      console.error(`Error resolving ${doctype}/${docId}:`, err);
      return docId;
    }
  };

  // Handle submit for draft reimbursement
  const { currentUser } = useFrappeAuth();
  const { roles } = useUserRoles(currentUser ?? null);

  // Sidebar State
  const [sidebarComment, setSidebarComment] = useState("");
  const [isAddingComment, setIsAddingComment] = useState(false);
  const { call: addComment } = useFrappePostCall(
    "rndopsapp.rndopsapp.api.add_project_comment",
  );

  // Commitment Widget State
  const [commitHead, setCommitHead] = useState("");
  const [paymentAmount, setPaymentAmount] = useState(""); // Payment State
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [isCommittedForGate, setIsCommittedForGate] = useState<boolean | null>(null);

  // API Hooks for Commit/Payment
  // submitCommit moved to CommitPayment component
  const { call: submitPayment, loading: isPaying } = useFrappePostCall(
    "rndopsapp.rndopsapp.commitPayment.submit_payment_data",
  );

  // Fetch Project Budget Data
  const projectTitle = projectNo || data?.project_number || ""; // Use project number for ledger API
  const [budgetHeadList, setBudgetHeadList] = useState<
    { name: string; id: string }[]
  >([]);

  // Fetch Budget Head List for Ledger Modal (needs IDs) matching ProjectDetailsOverview
  useEffect(() => {
    const fetchBudgetHeads = async () => {
      try {
        const response = await fetch(
          '/api/v2/document/Budget%20Head?fields=["budget_head","id"]&order_by=id%20asc',
        );
        const result = await response.json();
        if (result?.data) {
          setBudgetHeadList(
            result.data.map((item: any) => ({
              name: item.budget_head,
              id: item.id,
            })),
          );
        }
      } catch (err) {
        console.error("Failed to fetch Budget Heads:", err);
      }
    };
    fetchBudgetHeads();
  }, []);

  const {
    budgetData,
    heads: budgetHeads,
    actualBalance,
    commitableBalance,
  } = useProjectBudget(projectTitle);

  // Fetch overall project commitable balance from Frappe API
  const balanceApiParams = React.useMemo(
    () => ({ project_number: projectTitle }),
    [projectTitle],
  );
  const balanceApiOptions = React.useMemo(
    () => ({
      revalidateOnFocus: false,
      isPaused: () => !projectTitle,
    }),
    [projectTitle],
  );
  const { data: projectAmountsData } = useFrappeGetCall<{
    message: {
      status: string;
      data: {
        availableCommitAmount: number;
        availablePaymentAmount: number;
      };
    };
  }>(
    "rndopsapp.rndopsapp.commitPayment.get_project_available_amounts",
    balanceApiParams,
    balanceApiOptions,
  );
  const projectAmountsResult =
    (projectAmountsData as any)?.message?.data ??
    (projectAmountsData as any)?.data ??
    {};
  const totalCommitableBalance =
    projectAmountsResult?.availablePaymentAmount ?? 0;

  // Find existing commitment for this document (match by ref or frapAppId)
  const linkedCommitment = budgetData.find(
    (e) =>
      (e.ref === (id || "") || e.frapAppId === (id || "")) &&
      e.type === "commitment",
  );
  const isCommitted = !!linkedCommitment;

  // Set default commit head
  useEffect(() => {
    if (budgetHeads.length > 0 && !commitHead) {
      setCommitHead(budgetHeads[0]);
    }
  }, [budgetHeads]);

  // Set Payment defaults from Commitment
  useEffect(() => {
    if (linkedCommitment) {
      setCommitHead(linkedCommitment.head || ""); // Lock/Prefill head for visibility
      if (!paymentAmount) setPaymentAmount(String(linkedCommitment.committed));
    }
  }, [linkedCommitment]);

  // Role Check
  const isRnDStaff = roles.some(
    (r) =>
      r === "RnD Staff" ||
      r === "R&D Staff" ||
      r === "Research and Development Staff" ||
      r === "System Manager" ||
      r === "staff, RnD" ||
      r === "Hos, RnD (Head of Section, RnD)",
  );
  // console.log("User Roles:", roles, "Is RnD Staff:", isRnDStaff, "Workflow State:", data?.workflow_state);

  const handleSidebarCommentSubmit = async () => {
    if (!sidebarComment.trim() || !id) return;
    setIsAddingComment(true);
    try {
      await addComment({
        doctype: "Reimbursement",
        docname: id,
        content: sidebarComment,
      });
      setSidebarComment("");
      // Ideally refetch activity stream here, but it polls or we can trigger a global verify
      window.location.reload(); // Simple refresh for now to show new comment in activity
    } catch (error) {
      console.error("Failed to add comment:", error);
      alert("Failed to submit comment.");
    } finally {
      setIsAddingComment(false);
    }
  };

  // handleCommit moved to CommitPayment component

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
        bmr: "", // Optional BMR
      });
      alert("Payment recorded successfully!");
      setPaymentAmount("");
      window.location.reload();
    } catch (error: any) {
      console.error("Payment failed:", error);
      alert(`Payment failed: ${error.message || "Unknown error"}`);
    }
  };

  const handleSubmit = async () => {
    if (!data || isSubmitting) return;

    if (
      !confirm(
        "Are you sure you want to submit this reimbursement application? This action cannot be undone.",
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await submitDoc({
        docname: data.name,
      });

      console.log("Submit response:", response);
      alert("Reimbursement submitted successfully!");

      // Reload the data to get updated status
      const refreshed = await fetchDoc({
        doctype: "Reimbursement",
        name: data.name,
      });
      if (refreshed?.message) {
        setData(refreshed.message);
      }
    } catch (err: any) {
      console.error("Error submitting reimbursement:", err);
      alert(`Failed to submit: ${err.message || "Unknown error"}`);
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
        const response = await fetchDoc({
          doctype: "Reimbursement",
          name: id,
        });

        if (response?.message) {
          const docData = response.message;
          setData(docData);

          // Resolve linked field names
          const nameMap: Record<string, string> = {};

          // Resolve department names (Department_prornd doctype with dept_name field)
          if (docData.reimbursement_for_department) {
            nameMap.reimbursement_for_department = await resolveLinkName(
              "Department_prornd",
              docData.reimbursement_for_department,
              "dept_name",
            );
          }
          if (docData.applicant_department) {
            nameMap.applicant_department = await resolveLinkName(
              "Department_prornd",
              docData.applicant_department,
              "dept_name",
            );
          }

          // Resolve account head name (Budget Head doctype with budget_head field)
          if (docData.account_head) {
            nameMap.account_head = await resolveLinkName(
              "Budget Head",
              docData.account_head,
              "budget_head",
            );
          }

          // Resolve project name (Project Registration doctype with project_title field)
          if (docData.project_name) {
            nameMap.project_name = await resolveLinkName(
              "Project Registration",
              docData.project_name,
              "project_title",
            );
            // Fallback to title if project_title is empty
            if (nameMap.project_name === docData.project_name) {
              const altTitle = await resolveLinkName(
                "Project Registration",
                docData.project_name,
                "title",
              );
              if (altTitle !== docData.project_name) {
                nameMap.project_name = altTitle;
              }
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
  }, [id, fetchDoc, fetchLinkValue]);

  // Fetch Project No
  useEffect(() => {
    const fetchProjectNo = async () => {
      if (!data?.project_name) return;
      try {
        // Try fetching from Project Proposal first (most likely)
        const response = await fetch(
          `/api/v2/document/Project%20Proposal/${data.project_name}?fields=["project_no","project_title"]`,
        );
        if (response.ok) {
          const json = await response.json();
          if (json.data?.project_no) {
            setProjectNo(json.data.project_no);
            return;
          }
        }

        // Fallback: Try 'Project' doctype if needed, or check link value
        // For now, assuming Project Proposal is the source for project_no
        if (data.project_number) {
          setProjectNo(data.project_number);
        }
      } catch (error) {
        console.error("Error fetching project no:", error);
        if (data.project_number) setProjectNo(data.project_number);
      }
    };

    fetchProjectNo();
  }, [data?.project_name, data?.project_number]);

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Generate HTML for download/print
  const generateDownloadHTML = () => {
    if (!data) return "";

    const now = new Date();
    const formattedDate = now.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const formattedTime = now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const applicationDate = data.creation
      ? new Date(data.creation).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      : "-";

    // Calculate total amount from items
    const totalAmount =
      data.table_bosk?.reduce(
        (sum: number, item: any) => sum + (parseFloat(item.amount) || 0),
        0,
      ) || 0;

    // Generate expenditure rows
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

    // Declaration items
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

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reimbursement - ${data.name}</title>
    <style>
        @page { size: A4; margin: 10mm; }
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.3; color: #333; margin: 0; padding: 10px; background-color: #f0f0f0; }
        .page { width: 190mm; max-width: 100%; margin: 0 auto; background-color: white; padding: 15px 20px; box-shadow: 0 0 10px rgba(0,0,0,0.1); position: relative; min-height: 277mm; }
        .top-meta { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 8px; color: #666; }
        .header-box { border: 1px solid #000; padding: 8px 12px; display: flex; align-items: center; margin-bottom: 8px; }
        .logo-img { width: 60px; height: 60px; margin-right: 15px; object-fit: contain; }
        .header-text h1 { margin: 0; font-size: 16px; color: #2d3e8b; text-transform: uppercase; }
        .header-text h2 { margin: 0; font-size: 14px; color: #2d3e8b; }
        .header-text p { margin: 2px 0 0; font-weight: bold; font-size: 11px; }
        .barcode-container { margin-top: 5px; text-align: left; font-size: 10px; }
        .barcode { width: 150px; height: 25px; background: linear-gradient(90deg, #000 2%, transparent 2%, transparent 4%, #000 4%, #000 5%, transparent 5%, transparent 7%, #000 7%, #000 10%, transparent 10%, transparent 12%, #000 12%, #000 13%, transparent 13%, transparent 15%, #000 15%); background-size: 15px 100%; }
        .date-line { text-align: right; margin-bottom: 10px; font-size: 11px; }
        h2.main-title { text-align: center; font-weight: normal; font-size: 16px; margin: 10px 0 15px; }
        .details-grid { display: flex; gap: 20px; margin-bottom: 10px; }
        .details-section { flex: 1; }
        .section-header { border: 1px solid #000; text-align: center; font-weight: bold; padding: 4px; margin-bottom: 6px; background-color: #f5f5f5; font-size: 11px; }
        .info-row { display: flex; margin-bottom: 6px; font-size: 10px; }
        .info-label { width: 110px; font-weight: normal; color: #555; }
        .info-value { flex: 1; font-weight: 500; }
        .comments-box { border: 1px solid #000; margin-top: 10px; }
        .comment-content { padding: 6px 8px; font-size: 10px; }
        .comment-timestamp { text-align: right; padding: 2px 8px; color: #666; font-size: 9px; }
        .declaration-box { margin-top: 10px; border: 1px solid #000; }
        .declaration-content { padding: 6px 8px; font-size: 9px; }
        .declaration-content ol { padding-left: 15px; margin: 5px 0; }
        .declaration-content li { margin-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
        th, td { border: 1px solid #000; padding: 5px; text-align: left; vertical-align: top; }
        th { background-color: #f5f5f5; text-align: center; font-size: 10px; }
        .footer-info { margin-top: 15px; font-size: 10px; }
        .footer-info p { margin: 3px 0; }
        .bottom-meta { position: absolute; bottom: 8px; left: 20px; right: 20px; display: flex; justify-content: space-between; font-size: 9px; border-top: 1px solid #ddd; padding-top: 4px; color: #666; }
        @media print {
            body { background: none; padding: 0; }
            .page { box-shadow: none; margin: 0; width: 100%; min-height: auto; padding: 10mm; }
        }
    </style>
</head>
<body>
<div class="page">
    <div class="top-meta">
        <span>${data.name}</span>
        <span>https://rndops.iitg.ac.in</span>
    </div>

    <div class="header-box">
        <img src="http://172.16.117.39:8000/files/IITG_logo.png" alt="IITG Logo" class="logo-img" />
        <div class="header-text">
            <h1>भारतीय प्रौद्योगिकी संस्थान गुवाहाटी</h1>
            <h2>INDIAN INSTITUTE OF TECHNOLOGY GUWAHATI</h2>
            <p>RESEARCH AND DEVELOPMENT CELL</p>
        </div>
    </div>

    <div class="barcode-container">
        <div class="barcode"></div>
        <div>${data.name}</div>
    </div>

    <div class="date-line">Date: ${formattedDate}</div>

    <h2 class="main-title">Application for Reimbursement</h2>

    <div class="details-grid">
        <div class="details-section">
            <div class="section-header">Applicant Details</div>
            <div class="info-row"><div class="info-label">Name:</div><div class="info-value">${data.account_holder_name || data.applicant_webmail || "-"}</div></div>
            <div class="info-row"><div class="info-label">Department:</div><div class="info-value">${resolvedNames.applicant_department || data.applicant_department || "-"}</div></div>
            <div class="info-row"><div class="info-label">Designation:</div><div class="info-value">${data.applicant_designation || "-"}</div></div>
            <div class="info-row"><div class="info-label">Email ID:</div><div class="info-value">${data.applicant_webmail || "-"}</div></div>
            <div class="info-row"><div class="info-label">Application Initiated by:</div><div class="info-value">${data.owner || "-"}</div></div>

            ${data.comment
        ? `
            <div class="comments-box">
                <div class="section-header">Comments</div>
                <div class="comment-content">${data.comment}</div>
                <div class="comment-timestamp">${applicationDate} ➔</div>
            </div>`
        : ""
      }

            ${acceptedDeclarations
        ? `
            <div class="declaration-box">
                <div class="section-header">Applicant's Declaration</div>
                <div class="declaration-content">
                    <ol>${acceptedDeclarations}</ol>
                </div>
            </div>`
        : ""
      }
        </div>

        <div class="details-section">
            <div class="section-header">Form Details</div>
            <div class="info-row"><div class="info-label">Own/ Other Project:</div><div class="info-value">${data.self_other || "Own"}</div></div>
            <div class="info-row"><div class="info-label">Project Number:</div><div class="info-value">${data.project_number || "-"}</div></div>
            <div class="info-row"><div class="info-label">Project Name:</div><div class="info-value">${resolvedNames.project_name || data.project_name || "-"}</div></div>
            <div class="info-row"><div class="info-label">Account Head:</div><div class="info-value">${resolvedNames.account_head || data.account_head || "-"}</div></div>
            <div class="info-row"><div class="info-label">Total Amount (₹):</div><div class="info-value">${totalAmount.toLocaleString("en-IN")}</div></div>
            <div class="info-row"><div class="info-label">Date and Time:</div><div class="info-value">${applicationDate}</div></div>
            <div class="info-row"><div class="info-label">Bank Name:</div><div class="info-value">${data.bank_name || "-"}</div></div>
            <div class="info-row"><div class="info-label">Bank Account Number:</div><div class="info-value">${data.bank_account_number || "-"}</div></div>
            <div class="info-row"><div class="info-label">IFSC Code:</div><div class="info-value">${data.ifsc_code || "-"}</div></div>
            <div class="info-row"><div class="info-label">Status:</div><div class="info-value">${data.workflow_state || "Draft"}</div></div>
        </div>
    </div>

    <h3 style="text-align: center; margin-top: 30px;">Expenditure Details</h3>

    <table>
        <thead>
            <tr>
                <th>Sl No.</th>
                <th>Date</th>
                <th>Particulars</th>
                <th>Vendors Name</th>
                <th>Amount (Rs.)</th>
                <th>Attachments</th>
            </tr>
        </thead>
        <tbody>
            ${expenditureRows}
        </tbody>
    </table>

    <div class="footer-info">
        <p>Application Status: ${data.workflow_state || "Draft"}</p>
        <p>Approved By:</p>
        <p style="margin-top: 20px;">N.B. This is a system generated form. Signature is not required.</p>
    </div>

    <div class="bottom-meta">
        <span>1 of 1</span>
        <span>${formattedDate}, ${formattedTime}</span>
    </div>
</div>
</body>
</html>`;
  };

  // Handle download/print
  const handleDownload = () => {
    const htmlContent = generateDownloadHTML();
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      // Auto-trigger print dialog after a short delay for rendering
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  // Detail row component
  const DetailRow = ({
    label,
    value,
  }: {
    label: string;
    value: string | number | null | undefined;
  }) => (
    <div className="flex justify-between py-2 border-b border-zinc-200 dark:border-zinc-800 last:border-0">
      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {label}
      </span>
      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
        {value || "-"}
      </span>
    </div>
  );

  if (loading) {
    return <GlobalLoader isLoading={true} />;
  }

  if (error || !data) {
    return (
      <div className="bg-claude-bg dark:bg-zinc-900 min-h-screen">
        <AppSidebar />
        <main className="flex-1 p-4 md:p-8">
          <FrappeCard className="text-center py-16">
            <FileTextIcon className="w-16 h-16 mx-auto text-zinc-400 dark:text-zinc-500 mb-4" />
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2 uppercase">
              Error Loading Reimbursement
            </h2>
            <p className="text-zinc-900 dark:text-zinc-100 mb-6">
              {error || "Reimbursement not found"}
            </p>
            <FrappeButton variant="primary" onClick={() => navigate(-1)}>
              Go Back
            </FrappeButton>
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
          <div className="flex items-center gap-4">
            <ViewProjectButton doctype="Reimbursement" data={data} />
            <div className="text-right text-sm text-zinc-900 dark:text-zinc-100 hidden md:block">
              <div className="flex items-center gap-1 font-medium justify-end">
                <CalendarIcon className="w-4 h-4" />
                Created: {formatDate(data.creation)}
              </div>
              <div className="flex items-center gap-1 mt-1 font-medium justify-end">
                <UserIcon className="w-4 h-4" />
                By: {data.owner}
              </div>
            </div>
            {/* Edit and Submit buttons - only show for Draft */}
            {(data.workflow_state === "Draft" || !data.workflow_state) && (
              <>
                <FrappeButton
                  variant="outline"
                  onClick={() => navigate(`/reimbursement?edit=${data.name}`)}
                >
                  Edit
                </FrappeButton>
                <FrappeButton
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit"}
                </FrappeButton>
              </>
            )}
            {/* Download button - always visible */}
            <FrappeButton variant="outline" onClick={handleDownload}>
              <DownloadIcon className="w-4 h-4" />
            </FrappeButton>
          </div>
          {data.workflow_state && (
            <ReimbursementWorkflowActions
              docname={data.name}
              onActionComplete={() => window.location.reload()}
              commitRequired={isRnDStaff && isCommittedForGate === false && data.workflow_state === "Pending Staff Approval"}
            />
          )}
        </PageHeader>
        {/* Content Grid with Sidebar */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Content (3 cols) */}
          <div className="xl:col-span-3 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Applicant Details - span full width if Reimbursement For card is hidden */}
              <FrappeCard
                title="Applicant Details"
                className={
                  !(
                    data.reimbursement_for_id ||
                    data.reimbursement_for_department ||
                    data.reimbursement_for_designation
                  )
                    ? "lg:col-span-2"
                    : ""
                }
              >
                <div className="space-y-1">
                  <DetailRow
                    label="Applicant Webmail"
                    value={data.applicant_webmail}
                  />
                  <DetailRow
                    label="Department"
                    value={
                      resolvedNames.applicant_department ||
                      data.applicant_department
                    }
                  />
                  <DetailRow
                    label="Designation"
                    value={data.applicant_designation}
                  />
                </div>
              </FrappeCard>

              {/* Reimbursement For - only show if at least one field has data */}
              {(data.reimbursement_for_id ||
                data.reimbursement_for_department ||
                data.reimbursement_for_designation) && (
                  <FrappeCard title="Reimbursement For">
                    <div className="space-y-1">
                      <DetailRow
                        label="Webmail ID"
                        value={data.reimbursement_for_id}
                      />
                      <DetailRow
                        label="Department"
                        value={
                          resolvedNames.reimbursement_for_department ||
                          data.reimbursement_for_department
                        }
                      />
                      <DetailRow
                        label="Designation"
                        value={data.reimbursement_for_designation}
                      />
                    </div>
                  </FrappeCard>
                )}

              {/* Bank Details */}
              <FrappeCard title="Bank Details">
                <div className="space-y-1">
                  <DetailRow label="Bank Name" value={data.bank_name} />
                  <DetailRow
                    label="Account Holder"
                    value={data.account_holder_name}
                  />
                  <DetailRow
                    label="Account Number"
                    value={data.bank_account_number}
                  />
                  <DetailRow label="IFSC Code" value={data.ifsc_code} />
                </div>
              </FrappeCard>

              {/* Project Details */}
              <FrappeCard title="Project Details">
                <div className="space-y-1">
                  <DetailRow
                    label="Project Number"
                    value={data.project_number}
                  />
                  <DetailRow label="Project Name" value={resolvedNames.project_name || data.project_name} />
                  <DetailRow
                    label="Account Head"
                    value={resolvedNames.account_head || data.account_head}
                  />
                  {data.other_head && (
                    <DetailRow label="Other Head" value={data.other_head} />
                  )}
                </div>
              </FrappeCard>

              {/* Particulars of Items Table */}
              {data.table_bosk && data.table_bosk.length > 0 && (
                <FrappeCard
                  title="Particulars of Items"
                  className="lg:col-span-2"
                >
                  <div className="overflow-x-auto border border-zinc-300 dark:border-zinc-700 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-zinc-200 dark:bg-zinc-700">
                        <tr className="divide-x divide-gray-300">
                          <th className="px-4 py-3 text-left text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase">
                            Vendor's Name
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase">
                            Particulars
                          </th>
                          <th className="px-4 py-3 text-right text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase">
                            Attachment
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-300 bg-white dark:bg-zinc-900">
                        {data.table_bosk.map((item: any, index: number) => (
                          <tr
                            key={item.name || index}
                            className="hover:bg-zinc-50 dark:bg-zinc-800/50 divide-x divide-gray-300"
                          >
                            <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 font-mono">
                              {item.r_date
                                ? new Date(item.r_date).toLocaleDateString(
                                  "en-IN",
                                )
                                : "-"}
                            </td>
                            <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 font-medium">
                              {item.vendors_name || "-"}
                            </td>
                            <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                              {item.particulars || "-"}
                            </td>
                            <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 font-bold text-right">
                              ₹
                              {(parseFloat(item.amount) || 0).toLocaleString(
                                "en-IN",
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {item.uploads ? (
                                <a
                                  href={item.uploads}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#D97757] font-bold hover:underline"
                                >
                                  View File
                                </a>
                              ) : (
                                <span className="text-zinc-500 dark:text-zinc-400">
                                  No file
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-claude-bg dark:bg-zinc-900 border-t-2 border-zinc-300 dark:border-zinc-700">
                        <tr>
                          <td
                            colSpan={3}
                            className="px-4 py-3 text-sm font-bold text-zinc-900 dark:text-zinc-100 text-right uppercase"
                          >
                            Total Amount:
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-zinc-900 dark:text-zinc-100 text-right">
                            ₹
                            {data.table_bosk
                              .reduce(
                                (sum: number, item: any) =>
                                  sum + (parseFloat(item.amount) || 0),
                                0,
                              )
                              .toLocaleString("en-IN")}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </FrappeCard>
              )}

              {/* Comments */}
              {data.comment && (
                <FrappeCard title="Comments" className="lg:col-span-2">
                  <p className="text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap font-medium">
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <DetailRow
                    label="Created"
                    value={formatDate(data.creation)}
                  />
                  <DetailRow
                    label="Last Modified"
                    value={formatDate(data.modified)}
                  />
                  <DetailRow label="Owner" value={data.owner} />
                </div>
              </FrappeCard>
            </div>
          </div>

          {/* Right Sidebar (1 col) */}
          <aside className="xl:col-span-1 space-y-6">
            {/* Section 0: Project Budget Overview */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                Project Budget
              </h3>
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
                  <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Total Commitable Balance
                  </p>
                  <p className="text-xl font-bold text-[#D97757]">
                    ₹ {totalCommitableBalance.toLocaleString("en-IN")}
                  </p>
                </div>
                <button
                  onClick={() => setIsLedgerOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-[#D97757] font-bold text-sm hover:bg-[#B2DFDB] transition-colors"
                >
                  <LedgerIcon className="w-4 h-4" />
                  View Project Ledger
                </button>
              </div>
            </div>

            {/* Section 1: Latest Activity */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center justify-between">
                Latest Activity
              </h3>
              {id && <ActivityStream doctype="Reimbursement" docname={id} />}
            </div>

            {/* Section 1b: Document Activity Log (new endpoint) */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              {id && <ActivityLog doctype="Reimbursement" docname={id} />}
            </div>

            {/* Section 2: Add Comment */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-3">
                Add Comment
              </h3>
              <Textarea
                className="w-full border border-zinc-300 dark:border-zinc-700 p-3 rounded-lg text-sm mb-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757]"
                rows={3}
                placeholder="Type your comment here..."
                value={sidebarComment}
                onChange={(e) => setSidebarComment(e.target.value)}
              />
              <FrappeButton
                className="w-full"
                variant="primary"
                onClick={handleSidebarCommentSubmit}
                disabled={isAddingComment}
              >
                {isAddingComment ? "Submitting..." : "Submit Comment"}
              </FrappeButton>
            </div>

            {/* Section 3: Make a Commitment (Conditional) */}
            {(data.workflow_state === "Approved" ||
              data.workflow_state === "Pending Staff Approval") &&
              isRnDStaff && (
                <CommitPayment
                    doctype="Reimbursement"
                    docName={id || ""}
                    projectName={data.project_name}
                    budgetHeads={budgetHeads}
                    actualBalance={actualBalance}
                    onCommitSuccess={() => window.location.reload()}
                    onStagingStatusChange={(status) => setIsCommittedForGate(status)}
                />
              )}

            {/* Section 4: Record Payment (Conditional) */}
            {(data.workflow_state === "Approved" ||
              data.workflow_state === "Pending Staff Approval") &&
              isRnDStaff && (
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                    Record Payment
                  </h3>
                  {isCommitted ? (
                    <div className="space-y-4">
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex flex-col gap-1">
                        <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">
                          Linked Commitment
                        </p>
                        <div className="flex justify-between items-end">
                          <p className="text-sm font-medium text-blue-900">
                            {linkedCommitment?.head}
                          </p>
                          <p className="text-lg font-bold text-blue-700">
                            ₹{" "}
                            {linkedCommitment?.committed.toLocaleString(
                              "en-IN",
                            )}
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Payment Amount (₹)
                        </label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757]"
                          placeholder="e.g., 5000"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          max={linkedCommitment?.committed}
                        />
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                          Paying against commitment. Max: ₹
                          {linkedCommitment?.committed.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <FrappeButton
                        className="w-full"
                        variant="outline"
                        onClick={handlePayment}
                        disabled={
                          isPaying ||
                          !paymentAmount ||
                          parseFloat(paymentAmount) >
                          (linkedCommitment?.committed || 0)
                        }
                      >
                        {isPaying ? "Processing..." : "Submit Payment"}
                      </FrappeButton>
                    </div>
                  ) : (
                    <div className="text-center py-6 px-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-800 border-dashed">
                      <div className="mx-auto w-10 h-10 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center justify-center mb-3 text-zinc-400 dark:text-zinc-500">
                        <LedgerIcon className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        Commitment Required
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        Please make a commitment above before recording payment
                        for this reimbursement.
                      </p>
                    </div>
                  )}
                </div>
              )}
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
    </div>
  );
};

export default ReimbursementDetails;
