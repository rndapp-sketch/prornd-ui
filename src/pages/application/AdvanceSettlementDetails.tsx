import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useFrappePostCall, useFrappeGetCall } from "frappe-react-sdk";
import { cn } from "@/lib/utils";
import {
  FileTextIcon,
  CalendarIcon,
  UserIcon,
  DownloadIcon,
  IndianRupeeIcon,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { GlobalLoader } from "@/components/ui/global-loader";
import { advanceSettlementAPI } from "@/services/apiService";
import { useUserRoles } from "../../components/UserRole";
import { useFrappeAuth } from "frappe-react-sdk";
import { useProjectBudget } from "@/hooks/useProjectBudget";
import { Wallet as WalletIcon, CheckCircle2 } from "lucide-react";
import { DeclarationFields } from "@/components/DeclarationFields";
import { CommitPayment } from "@/components/CommitPayment";
import { FloatingActivityLogButton } from "@/components/FloatingActivityLogButton";
import ViewProjectButton from "@/components/ViewProjectButton";
import { CharLimitAlert } from "@/components/CharLimitAlert";
import { FIELD_CHAR_LIMITS } from "@/utils/fieldLimits";

// --- TYPE DEFINITIONS ---
interface AdvanceSettlementData {
  name: string;
  owner: string;
  creation: string;
  modified: string;
  workflow_state: string;
  project_name: string;
  project_code: string;
  account_head: string;
  total_amount: number;
  temporary_advance_application: string;
  bank_account_number: string;
  bank_account_holders_name: string;
  docstatus: number;
  expenditure_details: Array<{
    expenditure_date: string;
    description: string;
    particulars: string;
    amount: number;
    amount_in_rs: number;
    [key: string]: any;
  }>;
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
      "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-150",
      "focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed",
      variant === "primary" &&
        "bg-[#D97757] text-white hover:bg-[#D97757] shadow-sm hover:shadow-md",
      variant === "ghost" &&
        "bg-transparent text-[#3F3F46] dark:text-[#E4E4E7] hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46]",
      variant === "outline" &&
        "bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] text-[#3F3F46] dark:text-[#E4E4E7] hover:bg-[#FAFAF9] dark:hover:bg-[#3F3F46]",
      variant === "action" &&
        "bg-[#18181B] dark:bg-[#E4E4E7] text-white dark:text-[#18181B] hover:opacity-90 shadow-sm rounded-lg",
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-[#FFFFFF] dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] p-6 rounded-lg shadow-lg w-full max-w-md">
        <h3 className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] mb-4">
          Confirm {action}
        </h3>
        <textarea
          className="w-full border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] text-[#3F3F46] dark:text-[#E4E4E7] p-3 rounded-lg text-sm mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] font-sans leading-relaxed"
          rows={4}
          placeholder="Add a comment (optional)..."
          maxLength={FIELD_CHAR_LIMITS.Text}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <CharLimitAlert value={comment} maxLength={FIELD_CHAR_LIMITS.Text} className="-mt-3 mb-3" />
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg font-medium text-sm bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] text-[#3F3F46] dark:text-[#E4E4E7] hover:bg-zinc-50 dark:hover:bg-[#3F3F46] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(comment)}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg font-medium text-sm bg-[#D97757] text-white hover:opacity-90 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Processing..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
};

const AdvanceSettlementWorkflowActions = ({
  docname,
  onActionComplete,
  commitRequired = false,
}: {
  docname: string;
  onActionComplete: () => void;
  commitRequired?: boolean;
}) => {
  const [actions, setActions] = useState<string[]>([]);
  const [actionsLoading, setActionsLoading] = useState(true);
  const { call: fetchActions } = useFrappePostCall<{ message: string[] }>(
    "rndopsapp.rndopsapp.doctype.advance_settlement.advance_settlement.get_advance_settlement_workflow_actions",
  );

  const { call: performAction, loading: actionLoading } = useFrappePostCall(
    "rndopsapp.rndopsapp.doctype.advance_settlement.advance_settlement.perform_advance_settlement_action",
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState("");

  useEffect(() => {
    const loadActions = async () => {
      try {
        const res = await fetchActions({ docname });
        console.log("Workflow actions response:", res);
        if (res?.message) {
          setActions(Array.isArray(res.message) ? res.message : []);
        }
      } catch (err) {
        console.error("Failed to fetch workflow actions:", err);
      } finally {
        setActionsLoading(false);
      }
    };
    loadActions();
  }, [docname]);

  const handleActionClick = (action: string) => {
    setSelectedAction(action);
    setModalOpen(true);
  };

  const handleConfirmAction = async (comment: string) => {
    try {
      await performAction({ docname, action: selectedAction });
      setModalOpen(false);
      onActionComplete();
    } catch (error) {
      console.error("Error performing action:", error);
      alert("Failed to perform action. Please try again.");
    }
  };

  // Filter out "Submit" since the header already has a dedicated Submit button for Draft state
  const filteredActions = actions.filter(
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
      <div className="flex gap-3 mb-6">
        {filteredActions.map((action) => (
          <button
            key={action}
            onClick={() => handleActionClick(action)}
            disabled={actionLoading || commitRequired}
            title={commitRequired ? "A commitment must be submitted before forwarding." : undefined}
            className={cn(
              "inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-medium text-sm transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed",
              commitRequired
                ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500 cursor-not-allowed border-0"
                : action.toLowerCase().includes("reject")
                  ? "bg-red-600 text-white hover:opacity-90"
                  : action.toLowerCase().includes("put back")
                    ? "bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] text-[#3F3F46] dark:text-[#E4E4E7] hover:bg-zinc-50 dark:hover:bg-[#3F3F46]"
                    : "bg-[#18181B] dark:bg-[#E4E4E7] text-white dark:text-[#18181B] hover:opacity-90"
            )}
          >
            {action}
          </button>
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

const AdvanceSettlementDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AdvanceSettlementData | null>(null);
  const [budgetHeadName, setBudgetHeadName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { call: fetchDoc } = useFrappePostCall<{
    message: AdvanceSettlementData;
  }>("frappe.client.get");
  const { call: fetchBudgetHead } = useFrappePostCall<{ message: any }>(
    "frappe.client.get",
  );
  const { call: submitForm } = useFrappePostCall(advanceSettlementAPI.submit);
  // submitCommit moved to CommitPayment component

  // Auth & Roles
  const { currentUser } = useFrappeAuth();
  const { roles } = useUserRoles(currentUser ?? null);
  const isRnDStaff = roles.some(
    (r) =>
      r === "RnD Staff" ||
      r === "R&D Staff" ||
      r === "Research and Development Staff" ||
      r === "System Manager" ||
      r === "staff, RnD" ||
      r === "Hos, RnD (Head of Section, RnD)",
  );

  // Budget & Payment State
  const [isCommittedForGate, setIsCommittedForGate] = useState<boolean | null>(null);

  const [commitHead, setCommitHead] = useState("");
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [budgetHeadList, setBudgetHeadList] = useState<
    { name: string; id: string; uid?: string }[]
  >([]);
  const budgetHeadIdMap = useMemo(
    () => Object.fromEntries(budgetHeadList.map((h) => [h.name, h.id])),
    [budgetHeadList],
  );

  // Fetch Budget Heads for Ledger (reusing logic pattern)
  useEffect(() => {
    const fetchBudgetHeads = async () => {
      try {
        const response = await fetch(
          '/api/resource/Budget%20Head?fields=["budget_head","id","name"]&order_by=id%20asc&limit_page_length=0',
        );
        const result = await response.json();
        if (result?.data) {
          setBudgetHeadList(
            result.data.map((item: any) => ({
              name: item.budget_head,
              id: item.id,
              uid: item.name,
            })),
          );
        }
      } catch (err) {
        console.error("Failed to fetch Budget Heads:", err);
      }
    };
    fetchBudgetHeads();
  }, []);

  // Load Project Budget Data
  const projectTitle = data?.project_code || "";
  const { budgetData, heads: budgetHeads } = useProjectBudget(projectTitle);

  // Auto-select head/amount if already committed
  const linkedCommitment = budgetData.find(
    (e) => e.ref === (id || "") && e.type === "commitment",
  );
  const isCommitted = !!linkedCommitment;

  useEffect(() => {
    if (data?.account_head) {
      // Check if budgetHeadList has loaded and we need to resolve ID to Name
      const resolvedHead = budgetHeadList.find(
        (h) =>
          h.uid === data.account_head ||
          h.id === data.account_head ||
          h.name === data.account_head,
      );
      if (resolvedHead) {
        setCommitHead(resolvedHead.name);
      } else {
        setCommitHead(data.account_head);
      }
    } else if (budgetHeads.length > 0 && !commitHead) {
      setCommitHead(budgetHeads[0]);
    }
  }, [budgetHeads, data, budgetHeadList, commitHead]);

  // handleCommit moved to CommitPayment component



  useEffect(() => {
    const loadData = async () => {
      if (!id) {
        setError("No Settlement ID provided");
        setLoading(false);
        return;
      }

      try {
        const response = await fetchDoc({
          doctype: "Advance Settlement",
          name: id,
        });

        if (response?.message) {
          const doc = response.message;
          setData(doc);

          // Fetch Budget Head Name if available
          if (doc.account_head) {
            try {
              const bhResponse = await fetchBudgetHead({
                doctype: "Budget Head",
                name: doc.account_head,
              });
              console.log(">>> Budget Head Response:", bhResponse); // Debug log

              if (bhResponse?.message) {
                const bh = bhResponse.message;
                // Try in order of likelihood
                const name =
                  bh.budget_head ||
                  bh.budget_head_name ||
                  bh.head_name ||
                  bh.name;
                if (name) setBudgetHeadName(name);
              }
            } catch (e) {
              console.warn("Could not fetch budget head details", e);
            }
          }
        } else {
          setError("Settlement not found");
        }
      } catch (err) {
        console.error("Error fetching settlement:", err);
        setError("Failed to load settlement details");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, fetchDoc, fetchBudgetHead]);

  const handleSubmit = async () => {
    if (!data) return;
    if (
      !window.confirm(
        "Are you sure you want to submit this settlement? This action cannot be undone.",
      )
    )
      return;

    setIsSubmitting(true);
    try {
      await submitForm({ docname: data.name });
      // Refresh data
      window.location.reload();
    } catch (err) {
      console.error("Error submitting settlement:", err);
      alert("Failed to submit settlement. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
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

    const displayStatus =
      data.workflow_state || (data.docstatus === 1 ? "Submitted" : "Draft");

    // Generate expenditure rows
    const expenditureRows =
      data.expenditure_details
        ?.map(
          (item: any, index: number) => `
            <tr>
                <td style="text-align: center;">${index + 1}</td>
                <td>${item.expenditure_date ? new Date(item.expenditure_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-"}</td>
                <td>${item.description || item.particulars || "-"}</td>
                <td style="text-align: center;">${(parseFloat(item.amount || item.amount_in_rs) || 0).toLocaleString("en-IN")}</td>
            </tr>
        `,
        )
        .join("") ||
      '<tr><td colspan="4" style="text-align: center;">No items</td></tr>';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Advance Settlement - ${data.name}</title>
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
        <img src="http://${import.meta.env.VITE_ASSET_HOST || '172.16.117.39'}:${import.meta.env.VITE_ASSET_PORT || '8000'}/files/IITG_logo.png" alt="IITG Logo" class="logo-img" />
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

    <h2 class="main-title">Advance Settlement</h2>

    <div class="details-grid">
        <div class="details-section">
            <div class="section-header">Project Details</div>
            <div class="info-row"><div class="info-label">Project Name:</div><div class="info-value">${data.project_name || "-"}</div></div>
            <div class="info-row"><div class="info-label">Project Code:</div><div class="info-value">${data.project_code || "-"}</div></div>
            <div class="info-row"><div class="info-label">Budget Head:</div><div class="info-value">${budgetHeadName || data.account_head || "-"}</div></div>
            <div class="info-row"><div class="info-label">Reference Advance:</div><div class="info-value">${data.temporary_advance_application || "-"}</div></div>
            <div class="info-row"><div class="info-label">Account Name:</div><div class="info-value">${data.bank_account_holders_name || "-"}</div></div>
             <div class="info-row"><div class="info-label">Account No:</div><div class="info-value">${data.bank_account_number || "-"}</div></div>
        </div>
    </div>

    <div style="margin-top: 15px; margin-bottom: 15px; border-top: 1px dashed #ccc;"></div>

    <h3 style="text-align: center; margin-top: 10px;">Expenditure Details</h3>

    <table>
        <thead>
            <tr>
                <th>Sl No.</th>
                <th>Date</th>
                <th>Particulars</th>
                <th>Amount (Rs.)</th>
            </tr>
        </thead>
        <tbody>
            ${expenditureRows}
            <tr style="font-weight: bold; background-color: #f9f9f9;">
                <td colspan="3" style="text-align: right;">Total</td>
                <td style="text-align: center;">${(data.total_amount || 0).toLocaleString("en-IN")}</td>
            </tr>
        </tbody>
    </table>

    <div class="footer-info">
        <p>Application Status: ${displayStatus}</p>
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

  const handleDownload = () => {
    const htmlContent = generateDownloadHTML();
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  if (loading) {
    return <GlobalLoader isLoading={true} />;
  }

  if (error || !data) {
    return (
      <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen">
        <main className="flex-1 p-4 md:p-8">
          <FrappeCard className="text-center py-16">
            <FileTextIcon className="w-16 h-16 mx-auto text-zinc-400 dark:text-zinc-500 mb-4" />
            <h2 className="text-xl font-bold text-[#3F3F46] dark:text-[#E4E4E7] mb-2 uppercase">
              Error Loading Settlement
            </h2>
            <p className="text-[#3F3F46] dark:text-[#E4E4E7] mb-6">
              {error || "Settlement not found"}
            </p>
            <FrappeButton variant="primary" onClick={() => navigate(-1)}>
              Go Back
            </FrappeButton>
          </FrappeCard>
        </main>
      </div>
    );
  }

  // Determine display status (prefer workflow_state, fallback to docstatus map)
  const displayStatus =
    data.workflow_state ||
    (data.docstatus === 1
      ? "Submitted"
      : data.docstatus === 2
        ? "Cancelled"
        : "Draft");
  const isDraft =
    (!data.workflow_state || data.workflow_state === "Draft") &&
    data.docstatus === 0;

  return (
    <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen font-sans">
      <main className="flex-1 px-4 py-6 md:px-8 md:py-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <PageHeader
          title={data.name}
          status={displayStatus}
          projectName={data.project_name}
          projectNumber={data.project_code}
        >
          <div className="flex items-center gap-3">
            <ViewProjectButton doctype="Advance Settlement" data={data} />
            <div className="text-right text-sm text-[#3F3F46] dark:text-[#E4E4E7] mr-2 hidden md:block">
              <div className="flex items-center justify-end gap-1 font-medium">
                <CalendarIcon className="w-4 h-4 text-zinc-400" />
                {formatDate(data.creation)}
              </div>
              <div className="flex items-center justify-end gap-1 mt-1 font-medium text-[#71717A] dark:text-[#A1A1AA]">
                <UserIcon className="w-4 h-4 text-zinc-400" />
                {data.owner}
              </div>
            </div>

            {/* Submit Button - only for Draft */}
            {isDraft && (
              <FrappeButton
                variant="primary"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white"
              >
                {isSubmitting ? "Submitting..." : "Submit Settlement"}
              </FrappeButton>
            )}

            {/* Edit button - only for Draft */}
            {isDraft && (
              <FrappeButton
                variant="outline"
                onClick={() =>
                  navigate(`/advance-settlement?edit=${data.name}`)
                }
              >
                Edit
              </FrappeButton>
            )}

            {/* Download button - always visible */}
            <FrappeButton
              variant="outline"
              onClick={handleDownload}
              className="px-3"
            >
              <DownloadIcon className="w-4 h-4" />
            </FrappeButton>
          </div>
        </PageHeader>

        {/* Workflow Actions */}
        {data.workflow_state && (
          <AdvanceSettlementWorkflowActions
            docname={data.name}
            onActionComplete={() => window.location.reload()}
            commitRequired={isRnDStaff && isCommittedForGate === false && data.workflow_state === "Pending Staff Approval"}
          />
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl p-5 shadow-sm">
                <p className="text-[12px] font-extrabold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA]">
                  Total Settlement
                </p>
                <p className="mt-2 flex items-center text-[30px] font-extrabold leading-none text-[#D97757]">
                  <IndianRupeeIcon className="h-6 w-6" />
                  {(data.total_amount || 0).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl p-5 shadow-sm">
                <p className="text-[12px] font-extrabold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA]">
                  Temporary Advance
                </p>
                <p className="mt-2 text-[15px] font-bold text-[#2563EB] dark:text-blue-300 break-all">
                  {data.temporary_advance_application || "-"}
                </p>
              </div>
              <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl p-5 shadow-sm">
                <p className="text-[12px] font-extrabold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA]">
                  Budget Head
                </p>
                <p className="mt-2 text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                  {budgetHeadName || data.account_head || "-"}
                </p>
              </div>
            </div>

            {/* Project & Advance Info */}
            <FrappeCard title="Details">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA]">
                    Project Name
                  </label>
                  <p className="text-[#3F3F46] dark:text-[#E4E4E7] font-semibold text-sm leading-relaxed">
                    {data.project_name}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA]">
                    Project Code
                  </label>
                  <p className="text-[#3F3F46] dark:text-[#E4E4E7] font-semibold font-mono text-sm">
                    {data.project_code || "-"}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA]">
                    Temporary Advance Ref
                  </label>
                  <p className="text-[#3F3F46] dark:text-[#E4E4E7] font-semibold text-sm text-blue-600 dark:text-blue-400">
                    {data.temporary_advance_application || "-"}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA]">
                    Budget Head
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-zinc-400"></div>
                    <p className="text-[#3F3F46] dark:text-[#E4E4E7] font-semibold">
                      {budgetHeadName || data.account_head || "-"}
                    </p>
                  </div>
                  {budgetHeadName && data.account_head !== budgetHeadName && (
                    <p className="text-xs text-zinc-400 ml-4">
                      {data.account_head}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA]">
                    Account Holder
                  </label>
                  <p className="text-[#3F3F46] dark:text-[#E4E4E7] font-semibold">
                    {data.bank_account_holders_name || "-"}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[#2563EB] dark:text-[#60A5FA]">
                    Account Number
                  </label>
                  <p className="text-[#3F3F46] dark:text-[#E4E4E7] font-semibold font-mono tracking-wide">
                    {data.bank_account_number || "-"}
                  </p>
                </div>
              </div>
            </FrappeCard>

            {/* Expenditure Table */}
            <FrappeCard title="Expenditure Breakdown">
              {data.expenditure_details?.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46]">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[#EEF2FF] dark:bg-blue-950/20 text-[#71717A] dark:text-[#A1A1AA] uppercase font-semibold text-xs">
                      <tr>
                        <th className="px-4 py-3 border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                          Date
                        </th>
                        <th className="px-4 py-3 border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                          Particulars
                        </th>
                        <th className="px-4 py-3 border-b border-[#E4E4E7] dark:border-[#3F3F46] text-right">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E4E4E7] dark:divide-[#3F3F46]">
                      {data.expenditure_details.map((item, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] transition-colors"
                        >
                          <td className="px-4 py-3 text-[#3F3F46] dark:text-[#E4E4E7] font-semibold whitespace-nowrap">
                            {item.expenditure_date
                              ? formatDate(item.expenditure_date)
                              : "-"}
                          </td>
                          <td className="px-4 py-3 text-[#71717A] dark:text-[#A1A1AA]">
                            {item.description || item.particulars}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-[#3F3F46] dark:text-[#E4E4E7] font-mono">
                            ₹{" "}
                            {Number(
                              item.amount || item.amount_in_rs || 0,
                            ).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-[#FAFAF9] dark:bg-[#18181B] font-bold">
                        <td
                          colSpan={2}
                          className="px-4 py-3 text-right text-[#71717A] dark:text-[#A1A1AA] uppercase text-xs tracking-wider"
                        >
                          Total Expenditure
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 text-base">
                          ₹ {(data.total_amount || 0).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 bg-[#FAFAF9] dark:bg-[#18181B] rounded-lg border border-dashed border-[#E4E4E7] dark:border-[#3F3F46]">
                  <p className="text-[#71717A] dark:text-[#A1A1AA]">
                    No expenditure details recorded.
                  </p>
                </div>
              )}
            </FrappeCard>
          </div>

          <div className="space-y-6">
            {/* Make a Commitment via CommitPayment component */}
            {isRnDStaff &&
              data.workflow_state === "Pending Staff Approval" && (
                <CommitPayment
                    doctype="Advance Settlement"
                    docName={id || ""}
                    projectName={data.project_code}
                    budgetHeads={budgetHeads}
                    budgetHeadIds={budgetHeadIdMap}
                    parentAppId={data.temporary_advance_application}
                    onCommitSuccess={() => window.location.reload()}
                    onStagingStatusChange={(status) => setIsCommittedForGate(status)}
                />
              )}

            {/* Declarations */}
            <DeclarationFields doctype="Advance Settlement" />
          </div>
        </div>
      </main>
      {id && <FloatingActivityLogButton doctype="Advance Settlement" docname={id} />}
    </div>
  );
};

export default AdvanceSettlementDetails;
