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
  CalendarIcon,
  UserIcon,
  EditIcon,
  FileSpreadsheetIcon as LedgerIcon,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { GlobalLoader } from "@/components/ui/global-loader";
import { Textarea } from "@/components/ui/textarea";
import DisbursalOfHonorariumActionButtons from "../../components/DisbursalOfHonorariumActionButtons";
import { DepartmentName } from "@/components/DepartmentName";
import { useProjectBudget } from "@/hooks/useProjectBudget";
import { useUserRoles } from "../../components/UserRole";
import { ProjectLedgerModal } from "../../components/ProjectLedgerModal";
import { DeclarationFields } from "@/components/DeclarationFields";
import { BudgetHeadName } from "@/components/BudgetHeadName";

// --- TYPE DEFINITIONS ---
interface DisbursalData {
  name: string;
  owner: string;
  creation: string;
  modified: string;
  workflow_state: string;
  docstatus: number;
  project_no?: string;
  project_name?: string;
  project_title?: string;
  webmail_id?: string;
  name_of_applicant?: string;
  designation_of_applicant?: string;
  applicant_department?: string;
  department_for?: string;
  account_head?: string;
  total_amount?: number;
  date_of_request?: string;
  comment?: string;
  table_weoy?: any[];
  [key: string]: any;
}

interface ActivityItem {
  owner: string;
  creation: string;
  content: string;
  comment_type: string;
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
        "bg-[#D97757] text-white hover:bg-[#c66a4e] shadow-md hover:shadow-lg border border-[#C66A4E]",
      variant === "ghost" &&
        "bg-transparent text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700",
      variant === "outline" &&
        "bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-lg dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800",
      variant === "action" &&
        "bg-[#D97757] text-white font-bold hover:bg-[#c66a4e] shadow-md hover:shadow-lg border-2 border-[#C66A4E]",
      "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
      className,
    )}
  >
    {children}
  </button>
);

// Activity Stream Component
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

const DisbursalOfHonorariumDetails: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<DisbursalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { call: fetchDoc } = useFrappePostCall<{ message: DisbursalData }>(
    "frappe.client.get",
  );
  const { call: submitDoc } = useFrappePostCall<{ message: any }>(
    "rndopsapp.rndopsapp.doctype.disbursal_of_honorarium.disbursal_of_honorarium.submit_disbursal_of_honorarium",
  );

  // Sidebar comment
  const [sidebarComment, setSidebarComment] = useState("");
  const [isAddingComment, setIsAddingComment] = useState(false);
  const { call: addComment } = useFrappePostCall(
    "rndopsapp.rndopsapp.api.add_project_comment",
  );

  const { currentUser } = useFrappeAuth();
  const { roles } = useUserRoles(currentUser ?? null);

  // Commitment Widget State
  const [commitHead, setCommitHead] = useState("");
  const [commitAmount, setCommitAmount] = useState("");
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);

  // API Hooks for Commit
  const { call: submitCommit, loading: isCommitting } = useFrappePostCall(
    "rndopsapp.rndopsapp.commitToJsonFrappe.submit_commit_data",
  );

  // Fetch Project Budget Data
  const projectTitle =
    data?.project_no || data?.project_name || data?.project_title || "";
  const [budgetHeadList, setBudgetHeadList] = useState<
    { name: string; id: string }[]
  >([]);

  useEffect(() => {
    const fetchBudgetHeads = async () => {
      try {
        const response = await fetch(
          '/api/v2/document/Budget%20Head?fields=["budget_head","id"]&order_by=id%20asc',
          { credentials: "include" },
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
  } = useProjectBudget(projectTitle);

  const balanceApiParams = React.useMemo(
    () => ({ project_no: projectTitle }),
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

  const linkedCommitment = budgetData.find(
    (e) =>
      (e.ref === (id || "") || e.frapAppId === (id || "")) &&
      e.type === "commitment",
  );

  // Fetch pending commits
  const { data: pendingCommitsResponse } = useFrappeGetCall<{
    message: {
      status: string;
      data: any[];
    };
  }>("rndopsapp.rndopsapp.commitToJsonFrappe.get_pending_commits");

  // Determine if the current document is committed:
  const cachedCommitment = pendingCommitsResponse?.message?.data?.find(
    (c: any) => c.frapAppId === id,
  );

  const isCommitted = !!linkedCommitment || !!cachedCommitment;

  useEffect(() => {
    if (budgetHeads.length > 0 && !commitHead) {
      setCommitHead(budgetHeads[0]);
    }
  }, [budgetHeads]);

  const isRnDStaff = roles.some(
    (r) =>
      r === "RnD Staff" ||
      r === "R&D Staff" ||
      r === "Research and Development Staff" ||
      r === "System Manager" ||
      r === "staff, RnD" ||
      r === "Hos, RnD (Head of Section, RnD)",
  );

  const handleCommit = async () => {
    if (!commitAmount || !commitHead || !id || !data) {
      alert("Please select a budget head and enter an amount.");
      return;
    }

    try {
      await submitCommit({
        doctype: "Disbursal of Honorarium",
        frapAppId: id,
        name: id,
        project_name: data.project_title || data.project_name,
        commit_amount: parseFloat(commitAmount),
        budget_head: commitHead,
        bmr: "",
        refDetails: id,
      });

      try {
        await addComment({
          doctype: "Disbursal of Honorarium",
          docname: id,
          content: `Commitment of ₹ ${parseFloat(commitAmount).toLocaleString("en-IN")} under "${commitHead}" has been sent to the Account Side.`,
        });
      } catch (commentErr) {
        console.error("Failed to add commitment comment:", commentErr);
      }

      alert("Commitment submitted successfully!");
      setCommitAmount("");
      window.location.reload();
    } catch (error: any) {
      console.error("Commit failed:", error);
      alert(`Commitment failed: ${error.message || "Unknown error"}`);
    }
  };

  // Fetch Document Data
  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const docRes = await fetchDoc({
        doctype: "Disbursal of Honorarium",
        name: id,
      });
      if (docRes?.message) {
        setData(docRes.message);
      } else {
        setError("Document not found");
      }
    } catch (err) {
      console.error("Error loading document:", err);
      setError("Failed to load document");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);


  // Handle submit for draft
  const handleSubmit = async () => {
    if (!data || isSubmitting) return;
    if (
      !confirm(
        "Are you sure you want to submit this Disbursal of Honorarium? This action cannot be undone.",
      )
    )
      return;

    setIsSubmitting(true);
    try {
      const response = await submitDoc({ docname: data.name });
      if (response?.message?.status === "success" || response?.message) {
        alert("Disbursal of Honorarium submitted successfully!");
        await loadData();
      } else {
        throw new Error(response?.message?.message || "Submission failed");
      }
    } catch (err: any) {
      console.error("Error submitting:", err);
      alert(`Failed to submit: ${err.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add comment
  const handleSidebarCommentSubmit = async () => {
    if (!sidebarComment.trim() || !id) return;
    setIsAddingComment(true);
    try {
      await addComment({
        doctype: "Disbursal of Honorarium",
        docname: id,
        content: sidebarComment,
      });
      setSidebarComment("");
      loadData();
    } catch (error) {
      console.error("Failed to add comment:", error);
      alert("Failed to submit comment.");
    } finally {
      setIsAddingComment(false);
    }
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Calculate total from honorarium table
  const totalAmount =
    data?.table_weoy?.reduce((sum: number, row: any) => {
      const amt = parseFloat(row.amount || 0);
      return sum + (isNaN(amt) ? 0 : amt);
    }, 0) ||
    data?.total_amount ||
    0;

  if (loading) return <GlobalLoader isLoading={true} />;

  if (error || !data) {
    return (
      <div className="bg-claude-bg dark:bg-zinc-900 min-h-screen">
        <AppSidebar />
        <main className="flex-1 p-4 md:p-8">
          <FrappeCard className="text-center py-16">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2 uppercase">
              Error Loading Document
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              {error || "Document not found"}
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
    <div className="bg-claude-bg dark:bg-zinc-900 min-h-screen font-sans">
      <GlobalLoader isLoading={isSubmitting} />

      <main className="transition-all duration-300 ease-in-out p-6 md:p-10">
        {/* Header */}
        <PageHeader
          title={data.name}
          status={data.workflow_state || "Draft"}
          projectName={data.project_name || data.project_title}
          projectNumber={data.project_no}
        >
          <div className="flex items-center gap-3">
            {/* Edit Button - Only for Draft */}
            {(data.workflow_state === "Draft" || !data.workflow_state) &&
              id && (
                <>
                  <button
                    onClick={() =>
                      navigate(`/disbursal-of-honorarium-form/${id}`)
                    }
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-sm bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 shadow-sm transition-all"
                  >
                    <EditIcon className="w-4 h-4" />
                    Edit
                  </button>
                  <FrappeButton
                    variant="primary"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Submit"}
                  </FrappeButton>
                </>
              )}
            {/* Workflow Action Buttons */}
            {id && (
              <DisbursalOfHonorariumActionButtons
                docname={id}
                onActionComplete={() => loadData()}
                blockedActions={
                  isRnDStaff && !isCommitted
                    ? {
                        actions: [
                          "Forward",
                          "Approve",
                          "Hos",
                          "AR",
                          "Approve & Forward",
                        ],
                        reason: "Please make a commitment before forwarding",
                      }
                    : undefined
                }
              />
            )}
          </div>
        </PageHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Left Column (2/3 width) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Project Details Card */}
            <FrappeCard
              title="Project Details"
              className="border-t-4 border-t-[#D97757]"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Project Number
                  </label>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {data.project_no || "-"}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Project Name
                  </label>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {data.project_name || data.project_title || "-"}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Account Head
                  </label>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {data.account_head ? <BudgetHeadName id={data.account_head} /> : "-"}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Total Amount
                  </label>
                  <div className="text-2xl font-black text-[#D97757]">
                    ₹ {totalAmount.toLocaleString("en-IN")}
                  </div>
                </div>
              </div>
            </FrappeCard>

            {/* Applicant Details */}
            <FrappeCard title="Applicant Details">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Applicant Name
                  </label>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                    {data.name_of_applicant || "-"}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Webmail ID
                  </label>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {data.webmail_id || "-"}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Designation
                  </label>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {data.designation_of_applicant || "-"}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Department
                  </label>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {data.applicant_department ? (
                      <DepartmentName name={data.applicant_department} />
                    ) : (
                      "-"
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Date of Request
                  </label>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                    {data.date_of_request
                      ? new Date(data.date_of_request).toLocaleDateString(
                          "en-IN",
                          { day: "numeric", month: "short", year: "numeric" },
                        )
                      : "-"}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Requested By
                  </label>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {data.owner || "-"}
                  </div>
                </div>
              </div>
            </FrappeCard>

            {/* Honorarium Details Table */}
            {data.table_weoy && data.table_weoy.length > 0 && (
              <FrappeCard title="Details of Honorarium">
                <div className="overflow-x-auto border border-zinc-300 dark:border-zinc-700 rounded-lg">
                  <table className="min-w-full divide-y divide-zinc-300 dark:divide-zinc-700">
                    <thead className="bg-zinc-200 dark:bg-zinc-700">
                      <tr className="divide-x divide-zinc-300 dark:divide-zinc-600">
                        <th className="px-4 py-3 text-left text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase">
                          Sl.
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase">
                          Web Mail ID
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase">
                          Emp ID
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase">
                          Designation
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase">
                          Dept/Section
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-300 dark:divide-zinc-700 bg-white dark:bg-zinc-900">
                      {data.table_weoy.map((row: any, index: number) => (
                        <tr
                          key={row.name || index}
                          className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 divide-x divide-zinc-300 dark:divide-zinc-700"
                        >
                          <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                            {row.web_mail_id || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 font-medium">
                            {row.name1 || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 font-mono">
                            {row.emp_id || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                            {row.designation || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                            {row.department_section || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 font-bold text-right">
                            ₹
                            {(parseFloat(row.amount) || 0).toLocaleString(
                              "en-IN",
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-claude-bg dark:bg-zinc-900 border-t-2 border-zinc-300 dark:border-zinc-700">
                      <tr>
                        <td
                          colSpan={6}
                          className="px-4 py-3 text-sm font-bold text-zinc-900 dark:text-zinc-100 text-right uppercase"
                        >
                          Total Amount:
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-zinc-900 dark:text-zinc-100 text-right">
                          ₹{totalAmount.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </FrappeCard>
            )}

            {/* Comments */}
            {data.comment && (
              <FrappeCard title="Comments">
                <p className="text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap font-medium">
                  {data.comment}
                </p>
              </FrappeCard>
            )}

            {/* Declarations */}
            <DeclarationFields doctype="Disbursal of Honorarium" />
          </div>

          {/* Sidebar - Right Column (1/3 width) */}
          <div className="space-y-6">
            {/* Project Budget Overview */}
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

            {/* Latest Activity Stream */}
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center justify-between">
                Latest Activity
              </h3>
              {id && (
                <ActivityStream
                  doctype="Disbursal of Honorarium"
                  docname={id}
                />
              )}
            </div>

            {/* Add Comment Section */}
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

            {/* Make a Commitment (Conditional) */}
            {(data.workflow_state === "Pending Staff Approval" ||
              data.workflow_state === "Approved") &&
              isRnDStaff &&
              !isCommitted && (
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                    Make a Commitment
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Budget Head
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757]"
                        value={commitHead}
                        onChange={(e) => setCommitHead(e.target.value)}
                      >
                        {budgetHeads.length > 0 ? (
                          budgetHeads.map((head) => (
                            <option key={head} value={head}>
                              {head}
                            </option>
                          ))
                        ) : (
                          <option value="">No Budget Heads</option>
                        )}
                      </select>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        Available:{" "}
                        <span className="font-medium text-[#D97757]">
                          ₹ {actualBalance.toLocaleString("en-IN")}
                        </span>
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                        Amount (₹)
                      </label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757]"
                        placeholder="e.g., 5000"
                        value={commitAmount}
                        onChange={(e) => setCommitAmount(e.target.value)}
                      />
                    </div>
                    <FrappeButton
                      className="w-full"
                      variant="primary"
                      onClick={handleCommit}
                      disabled={isCommitting}
                    >
                      {isCommitting ? "Submitting..." : "Submit Commitment"}
                    </FrappeButton>
                  </div>
                </div>
              )}

            {/* Commitment indicator if committed */}
            {(data.workflow_state === "Pending Staff Approval" ||
              data.workflow_state === "Approved") &&
              isRnDStaff &&
              isCommitted && (
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                    Commitment Details
                  </h3>
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex flex-col gap-1">
                    <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">
                      {cachedCommitment
                        ? "Commitment Initiated"
                        : "Linked Commitment"}
                    </p>
                    <div className="flex justify-between items-end">
                      <p className="text-sm font-medium text-blue-900">
                        {cachedCommitment
                          ? budgetHeadList.find(
                              (b) =>
                                b.id ===
                                (cachedCommitment.accountHeadId ||
                                  cachedCommitment.budget_head),
                            )?.name ||
                            cachedCommitment.accountHeadId ||
                            cachedCommitment.budget_head
                          : linkedCommitment?.head}
                      </p>
                      <p className="text-lg font-bold text-blue-700">
                        ₹{" "}
                        {Number(
                          cachedCommitment
                            ? cachedCommitment.commitAmount ||
                                cachedCommitment.commit_amount
                            : linkedCommitment?.committed || 0,
                        ).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

            {/* Meta Info */}
            <FrappeCard>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Created On
                  </label>
                  <div className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                    {data.creation ? formatDate(data.creation) : "-"}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Last Modified
                  </label>
                  <div className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                    {data.modified ? formatDate(data.modified) : "-"}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Workflow State
                  </label>
                  <div className="font-medium">
                    <span
                      className={cn(
                        "inline-flex px-3 py-1 text-xs font-bold rounded-full",
                        data.workflow_state === "Approved" &&
                          "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                        data.workflow_state === "Rejected" &&
                          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                        data.workflow_state === "Draft" &&
                          "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300",
                        !["Approved", "Rejected", "Draft"].includes(
                          data.workflow_state || "",
                        ) &&
                          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                      )}
                    >
                      {data.workflow_state || "Draft"}
                    </span>
                  </div>
                </div>
              </div>
            </FrappeCard>
          </div>
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

export default DisbursalOfHonorariumDetails;
