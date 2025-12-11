


// -=-=-=-=-=-=-=-=-=-=-=-=-=-=



import React, {
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useFrappeGetDoc,
  useFrappePostCall,
  useFrappeGetCall,
  useFrappeAuth,
} from "frappe-react-sdk";
import { Textarea } from "@/components/ui/textarea";
import { AppSidebar } from "../components/RndSidebar";
import FundDetails from "../components/FundDetails";
import {
  ArrowLeftIcon,
  FileTextIcon,
  UsersIcon,
  DollarSignIcon,
  IndianRupeeIcon,
  ShieldIcon,
  MessageSquareIcon,
  DownloadIcon,
  CalendarIcon,
  UserIcon,
  BuildingIcon,
  CreditCardIcon,
  UploadIcon,
  ShoppingCartIcon,
  UsersIcon as UsersGroupIcon,
  PlaneIcon,
  PlusIcon,
  FilePlusIcon,
  MapPinIcon,
  MailIcon,
  GlobeIcon,
  TargetIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  CogIcon as SettingsIcon,
  ChevronDown, CheckCircle2, ChevronRight, LayoutDashboard, MoreVertical, PieChart, Plus, Search, X, Trash2,
  CreditCard, Upload, ShoppingCart, Plane, ZapIcon, Users, Settings
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Interfaces ---
interface ActivityItem {
  owner: string;
  creation: string;
  content: string;
  comment_type: string;
}
interface ActivityStreamProps {
  doctype: string;
  docname: string;
}
interface ActivityStreamHandle {
  refetch: () => void;
}
interface ProjectDetailsProps { }

interface BudgetEntry {
  sl: number;
  date: string;
  particulars: string;
  ref: string;
  received: number;
  committed: number;
  commitableBalance: number;
  bmr: string;
  payment: number;
  actualBalance: number;
  type: 'commitment' | 'transaction';
}

// --- Section Wrapper Component for better organization ---
const SectionWrapper = ({
  title,
  children,
  icon: Icon,
  className,
}: {
  title: string;
  children: React.ReactNode;
  icon: any;
  className?: string;
}) => (
  <div
    className={cn(
      "p-5 bg-white rounded-xl border border-gray-200 shadow-sm",
      className
    )}
  >
    <div className="flex items-center gap-2.5 mb-4">
      <div className="p-2 rounded-lg bg-[#E0F7F6]">
        <Icon className="h-4 w-4 text-[#0EA5A4]" />
      </div>
      <h3 className="text-base font-semibold text-gray-800">{title}</h3>
    </div>
    <div className="space-y-3">{children}</div>
  </div>
);

const FieldDisplay = ({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: any;
  icon?: any;
}) => {
  if (!value && value !== 0 && value !== "No") return null;
  return (
    <div className="py-2">
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon className="h-3.5 w-3.5 text-gray-500" />}
        <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          {label}
        </p>
      </div>
      <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{String(value)}</p>
    </div>
  );
};

// --- FrappeCard Component ---
const FrappeCard = ({ children, className }: any) => (
  <div className={cn("bg-white p-5 md:p-6 rounded-xl border border-gray-200 shadow-sm", className)}>
    {children}
  </div>
);


const HtmlContent = ({
  title,
  htmlString,
  icon: Icon,
}: {
  title: string;
  htmlString: string | undefined;
  icon?: any;
}) => {
  if (!htmlString) return null;
  return (
    <SectionWrapper title={title} icon={Icon}>
      <div
        className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: htmlString }}
      />
    </SectionWrapper>
  );
};

const TableDisplay = ({
  label,
  data,
  columns,
  icon: Icon,
}: {
  label: string;
  data: any[] | undefined;
  columns: { fieldname: string; label: string }[];
  icon?: any;
}) => {
  if (!data || data.length === 0) return null;
  return (
    <SectionWrapper title={label} icon={Icon}>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="frappe-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.fieldname}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index}>
                {columns.map((col) => (
                  <td key={col.fieldname}>
                    {row[col.fieldname]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionWrapper>
  );
};

// Frappe-style Button Component
const FrappeButton = ({
  children,
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "outline" }) => (
  <button
    className={cn(
      "frappe-btn",
      variant === "primary" && "frappe-btn-primary",
      variant === "ghost" && "frappe-btn-ghost",
      variant === "outline" && "frappe-btn-outline",
      className
    )}
    {...props}
  >
    {children}
  </button>
);

// --- START: REFACTORED QuickActions COMPONENT ---

const QuickActions = () => {
  const [activeTab, setActiveTab] = useState("Advance");

  const ActionButton = ({ children }: { children: React.ReactNode }) => (
    <button className={cn(
      "w-full justify-start text-left text-sm font-medium text-gray-700",
      "px-4 py-3 rounded-lg bg-white border border-gray-200",
      "shadow-sm transition-all duration-150",
      "hover:shadow-md hover:border-[#0EA5A4]/20 hover:text-[#0EA5A4]",
      "focus:outline-none focus:ring-2 focus:ring-[rgba(14,165,164,0.18)]"
    )}>
      {children}
    </button>
  );

  const groups = [
    { title: "Advance", icon: CreditCard, items: ["Reimbursement", "Temporary Advance Apply", "Temporary Advance Settle"] },
    { title: "Disbursal", icon: Upload, items: ["One Time Assistantship", "Top Up Fellowship"] },
    { title: "Purchase", icon: ShoppingCart, items: ["Direct Purchase", "General Indent", "Generate NIQ", "Indent cum Sanction", "Rate Contract"] },
    { title: "Recruitment", icon: Users, items: ["Adhoc", "Committee Member Change", "Contractual", "Selection Committee Report"] },
    { title: "Travel", icon: Plane, items: ["Apply", "TA-DA Settle"] },
    { title: "Utilities", icon: Settings, items: ["Add New User", "Application History", "Form Tracking", "Incharge Assignment"] },
  ];

  const activeGroup = groups.find(g => g.title === activeTab);

  return (
    <div className="p-5 bg-gray-50/50 rounded-xl">
      {/* Tab Header */}
      <div className="mb-5">
        <nav className="frappe-tabs" aria-label="Quick actions tabs">
          {groups.map((group) => {
            const Icon = group.icon;
            const isActive = activeTab === group.title;
            return (
              <button
                key={group.title}
                onClick={() => setActiveTab(group.title)}
                aria-selected={isActive}
                className={cn(
                  "frappe-tab flex items-center gap-2",
                  isActive && "active"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{group.title}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-5 bg-white rounded-xl border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {activeGroup?.items.map((item) => (
            <ActionButton key={item}>{item}</ActionButton>
          ))}
        </div>
      </div>
    </div>
  );
};
// --- END: REFACTORED QuickActions COMPONENT ---



// --- Activity Stream Component ---
const ActivityStream = forwardRef<ActivityStreamHandle, ActivityStreamProps>(
  ({ doctype, docname }, ref) => {
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { data: activityData, mutate: refetchActivity } = useFrappeGetCall<{ message: ActivityItem[] }>(
      "rndopsapp.rndopsapp.api.get_project_activity",
      { doctype, docname }
    );
    const { call: addComment } = useFrappePostCall("rndopsapp.rndopsapp.api.add_project_comment");

    useImperativeHandle(ref, () => ({ refetch() { refetchActivity(); } }));

    const handleCommentSubmit = async () => {
      if (!newComment.trim()) return;
      setIsSubmitting(true);
      try {
        await addComment({
          doctype: doctype,
          docname: docname,
          content: newComment,
        });
        setNewComment("");
        refetchActivity();
      } catch (error) {
        console.error("Failed to add comment:", error);
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        handleCommentSubmit();
      }
    };

    return (
      <div className="space-y-5">
        <div className="frappe-card">
          <label htmlFor="comment-textarea" className="frappe-label mb-3">
            Add a comment
          </label>
          <Textarea
            id="comment-textarea"
            placeholder="Type here... (Ctrl+Enter to submit)"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isSubmitting}
            className="frappe-textarea"
            rows={4}
          />
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-[#6B7280]">{newComment.length}/1000</span>
            <FrappeButton onClick={handleCommentSubmit} disabled={isSubmitting || !newComment.trim()}>
              {isSubmitting ? "Submitting..." : "Submit"}
            </FrappeButton>
          </div>
        </div>
        <div className="space-y-3">
          {activityData?.message?.map((item, index) => (
            <div
              key={`${item.creation}-${index}`}
              className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-[#E0F7F6] flex items-center justify-center font-semibold text-[#0EA5A4] text-lg">
                {item.owner?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-semibold text-gray-900">{item.owner || "Unknown User"}</p>
                  <p className="text-xs text-[#6B7280] flex items-center gap-1">
                    <ClockIcon className="h-3.5 w-3.5" />
                    {item.creation ? new Date(item.creation).toLocaleString() : "N/A"}
                  </p>
                </div>
                <div className="text-sm text-gray-700 prose prose-sm max-w-none leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: item.content || "No content" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
);
ActivityStream.displayName = "ActivityStream";

// --- Workflow Actions Component ---
const WorkflowActions = ({ docname, onAction, isLoading }: { docname: string; onAction: (action: string) => void; isLoading: boolean; }) => {
  const { data } = useFrappeGetCall<{ message: string[] }>(
    "rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_available_workflow_actions",
    { docname }
  );
  if (!data?.message || data.message.length === 0) return null;
  return (
    <div className="flex items-center gap-2">
      {data.message.map((actionString: string) => (
        <FrappeButton key={actionString} onClick={() => onAction(actionString)} variant="outline" disabled={isLoading}>
          {isLoading ? "Processing..." : actionString}
        </FrappeButton>
      ))}
    </div>
  );
};

const normalizeResponse = (raw: any): any[] => {
  if (!raw) return [];
  // shape: { message: { message: [ ... ] } }
  if (raw.message && raw.message.message && Array.isArray(raw.message.message)) return raw.message.message;
  if (raw.message && Array.isArray(raw.message)) return raw.message;
  if (Array.isArray(raw)) return raw;
  if (raw.data && Array.isArray(raw.data)) return raw.data;
  if (raw.results && Array.isArray(raw.results)) return raw.results;
  if (raw.message && raw.message.data && Array.isArray(raw.message.data)) return raw.message.data;
  return [];
};

// --- Main Component ---
const ProjectDetailsOverview: React.FC<ProjectDetailsProps> = () => {
  const { projectName } = useParams<{ projectName: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const activityStreamRef = useRef<ActivityStreamHandle>(null);
  const { currentUser } = useFrappeAuth();
  const { data, error, isLoading, mutate } = useFrappeGetDoc(
    "Project Registration",
    projectName ?? ""
  );
  const { call: triggerWorkflowAction, loading: isActionLoading } = useFrappePostCall("rndopsapp.rndopsapp.api.handle_workflow_action");
  const { call: submitProjectRegistration } = useFrappePostCall("rndopsapp.rndopsapp.api.submit_project_registration");
  const { call: submitSanction, loading: isSubmittingSanction } = useFrappePostCall("rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.submit_fund_sanction");

  const { data: sanctionData, error: sanctionError, isLoading: sanctionIsLoading, mutate: refetchSanctions } = useFrappeGetCall(
    'rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.get_sanctions_for_project',
    { project_name: projectName },
    { revalidateOnFocus: false }
  );

  // Fetch Fund Received Data
  const fundQueryParams = useMemo(() => ({
    prjreg_title: data?.prjreg_title || "",
    limit: 200,
    start: 0,
  }), [data?.prjreg_title]);

  const fundQueryOptions = useMemo(() => ({
    revalidateOnFocus: false,
    isPaused: () => !data?.prjreg_title
  }), [data?.prjreg_title]);

  const { data: fundReceivedData } = useFrappeGetCall(
    "rndopsapp.rndopsapp.doctype.fund_received.fund_received.get_fund_received_by_prjreg",
    fundQueryParams,
    fundQueryOptions
  );
  // --- Budget State ---
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [commitHead, setCommitHead] = useState("Travel");
  const [commitAmount, setCommitAmount] = useState("");
  const [budgetData, setBudgetData] = useState<BudgetEntry[]>([]);
  const [sidebarComment, setSidebarComment] = useState(""); // New state for sidebar comment
  const [selectedSanctionIndex, setSelectedSanctionIndex] = useState(0); // Track selected sanction

  // API call for adding comment (lifted/duplicated for sidebar)
  const { call: addComment, loading: isAddingComment } = useFrappePostCall("rndopsapp.rndopsapp.api.add_project_comment");

  // Process Fund Received Data into Budget Ledger
  useEffect(() => {
    const funds = normalizeResponse(fundReceivedData);

    if (funds && funds.length > 0) {
      const initialEntries: BudgetEntry[] = [];
      let runningBalance = 0;

      // Sort funds by date if needed, assuming API returns sorted or we process in order
      funds.forEach((fund: any) => {
        if (fund.received_amt_breakup && Array.isArray(fund.received_amt_breakup)) {
          fund.received_amt_breakup.forEach((item: any) => {
            runningBalance += item.amount_received;
            initialEntries.push({
              sl: initialEntries.length + 1,
              date: fund.transaction_date || fund.modified?.split(" ")[0] || "",
              particulars: `Fund Received - ${item.account_head}`,
              ref: fund.sanction_ref_no || fund.name,
              received: item.amount_received,
              committed: 0,
              commitableBalance: runningBalance, // This is global running balance, might need per-head
              bmr: "",
              payment: 0,
              actualBalance: runningBalance,
              type: 'transaction',
              accountHead: item.account_head // Add this field to track head
            } as BudgetEntry & { accountHead?: string });
          });
        }
      });

      // If we have existing manual commitments (from local state), we should append them?
      // For now, let's just set the initial entries. 
      // If the user adds commitments, they are appended.
      // Ideally, we should merge or persist commitments. 
      // Since local state is volatile, we'll just overwrite with fetched data on load.
      // Only update if data is different to avoid loop
      // Simple check: if length is different or first item ref is different
      // Better: deep compare or just trust that initial load happens once if we check length
      if (initialEntries.length > 0) {
        setBudgetData(prev => {
          if (prev.length === initialEntries.length && JSON.stringify(prev) === JSON.stringify(initialEntries)) {
            return prev;
          }
          return initialEntries;
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(fundReceivedData)]);

  // Calculate balances based on selected Commit Head
  // Filter budget data for the selected head to calculate specific balance
  const filteredBudgetData = budgetData.filter((entry: any) => {
    const entryHead = entry.accountHead?.trim().toLowerCase();
    const selectedHead = commitHead.trim().toLowerCase();

    const match = (entryHead === selectedHead) ||
      (entry.particulars.toLowerCase().includes(selectedHead));
    return match;
  });

  console.log("Filtered Budget Data for", commitHead, ":", filteredBudgetData);

  // Calculate actual balance for the selected head
  const actualBalance = filteredBudgetData.reduce((acc, entry) => {
    return acc + (entry.received || 0) - (entry.payment || 0); // Actual balance = Received - Payment
  }, 0);

  console.log("Calculated Actual Balance:", actualBalance);

  // Calculate commitable balance for the selected head
  const commitableBalance = filteredBudgetData.reduce((acc, entry) => {
    return acc + (entry.received || 0) - (entry.committed || 0) - (entry.payment || 0);
  }, 0);

  const handleCommit = () => {
    const amount = parseFloat(commitAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    const lastEntry = budgetData.length > 0 ? budgetData[budgetData.length - 1] : { commitableBalance: 0, actualBalance: 0 };
    const newCommitableBalance = (lastEntry.commitableBalance || 0) - amount;

    const newEntry: BudgetEntry = {
      sl: budgetData.length + 1,
      date: new Date().toLocaleDateString('en-GB').replace(/\//g, '.'), // DD.MM.YY format
      particulars: `Commitment for ${commitHead}`,
      ref: '',
      received: 0,
      committed: amount,
      commitableBalance: newCommitableBalance,
      bmr: '',
      payment: 0,
      actualBalance: lastEntry.actualBalance, // Commitment doesn't change actual balance
      type: 'commitment'
    };

    setBudgetData([...budgetData, newEntry]);
    setCommitAmount("");
  };

  const handleRemoveLastCommit = () => {
    if (budgetData.length === 0) return;
    const lastEntry = budgetData[budgetData.length - 1];
    if (lastEntry.type === 'commitment') {
      setBudgetData(budgetData.slice(0, -1));
    } else {
      alert("Cannot remove the last entry as it is not a commitment.");
    }
  };

  const handleRemoveItem = (index: number) => {
    const newData = [...budgetData];
    newData.splice(index, 1);
    // Re-assign SL numbers
    const updatedData = newData.map((item, idx) => ({ ...item, sl: idx + 1 }));
    setBudgetData(updatedData);
  };

  const handleSidebarCommentSubmit = async () => {
    if (!sidebarComment.trim()) return;
    try {
      await addComment({
        doctype: "Project Registration",
        docname: projectName,
        content: sidebarComment,
      });
      setSidebarComment("");
      // If the activity stream is currently mounted (tab is active), refresh it
      if (activeTab === "activity" && activityStreamRef.current) {
        activityStreamRef.current.refetch();
      } else {
        // If not on activity tab, we might want to switch to it or just let the user know
        // For now, let's just notify via a simple alert or toast if we had one, 
        // but since we don't have a toast system ready, we'll just clear the input.
        // Optionally switch to activity tab:
        // setActiveTab("activity"); 
      }
    } catch (error) {
      console.error("Failed to add comment:", error);
      alert("Failed to submit comment. Please try again.");
    }
  };

  const handleSubmitSanction = useCallback(
    async (sanctionName: string) => {
      try {
        await submitSanction({ sanction_name: sanctionName });
        refetchSanctions();
      } catch (error: any) {
        console.error("Error submitting sanction:", error);
      }
    },
    [submitSanction, refetchSanctions]
  );
  const handleWorkflowAction = useCallback(
    (action: string) => {
      const apiCall =
        action.toLowerCase() === "submit"
          ? submitProjectRegistration({ doc_data: projectName })
          : triggerWorkflowAction({
            doctype: "Project Registration",
            docname: projectName,
            action: action,
          });
      apiCall
        .then(() => {
          mutate();
          activityStreamRef.current?.refetch();
        })
        .catch((err: any) =>
          console.error(`Error during workflow action:`, err)
        );
    },
    [triggerWorkflowAction, submitProjectRegistration, mutate, projectName]
  );

  const isCurrentUserPI = currentUser && data?.pi_webmail === currentUser;
  const handleAddFunds = () => navigate(`/add-fund-received/${projectName}/`);
  const handleAddSanctionDetails = () => {
    navigate(`/project-details-overview/${projectName}/add-fund-sanction`);
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: FileTextIcon },
    { id: "sanction-details", label: "Sanction Details", icon: CreditCardIcon },
    { id: "quick-actions", label: "Applications", icon: ZapIcon }, // ADDED THIS LINE
    { id: "activity", label: "Activity Log", icon: MessageSquareIcon },
  ];

  const getMimeType = (fileName = "") => {
    if (fileName.endsWith('.pdf')) return 'application/pdf';
    if (fileName.endsWith('.png')) return 'image/png';
    if (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) return 'image/jpeg';
    return 'application/octet-stream';
  };

  const getStatusBadgeClass = (status: string | undefined) => {
    switch (status?.toLowerCase()) {
      case "approved":
      case "completed":
        return "bg-green-100 text-green-800 border border-green-300";
      case "submitted":
      case "in_review":
        return "bg-yellow-100 text-yellow-800 border border-yellow-300";
      case "rejected":
      case "cancelled":
        return "bg-red-100 text-red-800 border border-red-300";
      case "draft":
        return "bg-blue-100 text-blue-800 border border-blue-300";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-300";
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-screen">
          <p className="text-lg font-semibold">Loading Project Details...</p>
        </div>
      );
    }
    if (error) {
      return (
        <div className="p-8 text-center">
          <p className="text-lg font-semibold text-red-600">Error loading project: {error.message}</p>
        </div>
      );
    }

    console.log("data:", data);

    return (
      <>
        <header className="mb-6 p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/projects-view")}
                aria-label="Back to projects"
                className="p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{data?.project_title || "Project Details"}</h1>
                <p className="text-sm text-[#6B7280] mt-0.5">ID: {projectName} · <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#E0F7F6] text-[#0EA5A4]">{data?.workflow_state || "Draft"}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {isCurrentUserPI && (
                <div className="flex gap-2">
                  <FrappeButton
                    onClick={handleAddFunds}
                    aria-label="Add funds to project"
                  >
                    <PlusIcon className="h-4 w-4" /> Add Funds
                  </FrappeButton>
                  {/* Only show Add Sanction button if no sanction exists */}
                  {(!sanctionData?.message || sanctionData.message.length === 0) && (
                    <FrappeButton
                      onClick={handleAddSanctionDetails}
                      variant="outline"
                      aria-label="Add sanction details"
                    >
                      <FilePlusIcon className="h-4 w-4" /> Add Sanction
                    </FrappeButton>
                  )}
                </div>
              )}
              <WorkflowActions docname={projectName!} onAction={handleWorkflowAction} isLoading={isActionLoading} />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content Column */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="border-b border-gray-200 p-3">
              <nav className="frappe-tabs" aria-label="Page tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    aria-selected={activeTab === tab.id}
                    className={cn(
                      "frappe-tab flex items-center gap-2",
                      activeTab === tab.id && "active"
                    )}
                  >
                    <tab.icon className="h-4 w-4" /> {tab.label}
                  </button>
                ))}
              </nav>
            </div>
            <div className="bg-[#F0F4F8] p-6">
              {activeTab === "overview" && (
                <div className="space-y-8">
                  {/* ... existing overview content ... */}
                  <SectionWrapper title="General Information" icon={FileTextIcon}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 divide-y md:divide-y-0">
                      <FieldDisplay label="Project Type" value={data?.project_type} icon={FileTextIcon} />
                      <FieldDisplay label="Implementation Dept" value={data?.implementation_department} icon={BuildingIcon} />
                      <FieldDisplay label="Status" value={data?.sanction_workflow_status} icon={TargetIcon} />
                      <FieldDisplay label="Project Duration" value={`${data?.project_duration_months}m ${data?.project_duration_days || 0}d`} icon={CalendarIcon} />
                      <FieldDisplay label="International Travel" value={data?.involves_international_travel} icon={PlaneIcon} />
                    </div>
                  </SectionWrapper>

                  <SectionWrapper title="Funding Agency" icon={BuildingIcon}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 divide-y md:divide-y-0">
                      <FieldDisplay label="Agency Name" value={data?.funding_agen} icon={BuildingIcon} />
                      <FieldDisplay label="Agency Type" value={data?.funding_agency_type} icon={UsersIcon} />
                      <FieldDisplay label="Origin" value={data?.origin_of_funding_agency} icon={GlobeIcon} />
                      <FieldDisplay label="Ministry" value={data?.funding_agency_ministry} icon={BuildingIcon} />
                      <FieldDisplay label="Scheme" value={data?.funding_agency_schemes} icon={FileTextIcon} />
                      <FieldDisplay label="Address" value={`${data?.address_street_village_locality}, ${data?.address_state}, ${data?.address_country} - ${data?.address_postal_code}`} icon={MapPinIcon} />
                    </div>
                  </SectionWrapper>

                  <SectionWrapper title="Investigators" icon={UsersIcon}>
                    <h4 className="font-bold text-lg text-black uppercase">Principal Investigator (PI)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 divide-y md:divide-y-0">
                      <FieldDisplay label="Name" value={data?.principal_investigator_name} icon={UserIcon} />
                      <FieldDisplay label="Email" value={data?.pi_webmail} icon={MailIcon} />
                      <FieldDisplay label="Employee ID" value={data?.pi_employee_id} icon={UserIcon} />
                      <FieldDisplay label="Designation" value={data?.designation} icon={UsersIcon} />
                      <FieldDisplay label="Department" value={data?.applicant_department} icon={BuildingIcon} />
                    </div>
                  </SectionWrapper>
                  {data?.is_additional_pi === "Yes" && <TableDisplay label="Additional PIs" data={data?.additional_pi_table} columns={[{ fieldname: "pi_name", label: "Name" }, { fieldname: "pi_designation", label: "Designation" }, { fieldname: "pi_email", label: "Email" },]} icon={UsersIcon} />}
                  {data?.has_co_pi === "Yes" && <TableDisplay label="Co-Investigators" data={data?.co_investigator_table} columns={[{ fieldname: "copi_name", label: "Name" }, { fieldname: "copi_designation", label: "Designation" }, { fieldname: "copi_email", label: "Email" },]} icon={UsersIcon} />}

                  <TableDisplay label="Proposed Budget Breakup" data={data?.proposed_budget_breakup} columns={[{ fieldname: "account_head", label: "Budget Head" }, { fieldname: "first_year_budget", label: "Year 1" }, { fieldname: "second_year_budget", label: "Year 2" },]} icon={IndianRupeeIcon} />
                  {data?.equipment_checkbox === 1 && <TableDisplay label="Proposed Equipment" data={data?.proposed_equipment_details} columns={[{ fieldname: "item_name", label: "Equipment Name" }, { fieldname: "equip_total_unit_cost", label: "Cost" },]} icon={ShoppingCartIcon} />}
                  {data?.manpower_checkbox === 1 && <TableDisplay label="Proposed Manpower" data={data?.proposed_manpower_details} columns={[{ fieldname: "designation_name", label: "Position" }, { fieldname: "manpower_salary", label: "Salary" },]} icon={UsersGroupIcon} />}

                  <HtmlContent title="Executive Summary" htmlString={data?.executive_summary} icon={FileTextIcon} />
                  <HtmlContent title="Project Objective" htmlString={data?.project_objective} icon={TargetIcon} />
                  <HtmlContent title="Project Deliverables" htmlString={data?.project_deliverables} icon={CheckCircleIcon} />

                  <SectionWrapper title="Clearance Details" icon={ShieldIcon}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 divide-y md:divide-y-0">
                      <FieldDisplay label="Needs Committee Clearance" value={data?.needs_committee_clearance} icon={ShieldIcon} />
                      <FieldDisplay label="Committee" value={data?.committees} icon={UsersIcon} />
                      <FieldDisplay label="Ethics Committee Details" value={data?.ethics_committee_details} icon={FileTextIcon} />
                      <FieldDisplay label="Biosafety Category" value={data?.biosafety_category} icon={ShieldIcon} />
                      <FieldDisplay label="Needs Endorsement" value={data?.need_endorsement_copy} icon={CheckCircleIcon} />
                    </div>
                  </SectionWrapper>
                </div>
              )}

              {activeTab === "sanction-details" && (
                <div className="space-y-8">
                  {/* ... existing sanction details content ... */}
                  {sanctionIsLoading && <p>Loading Sanction Details...</p>}
                  {sanctionError && <p className="text-red-600">Error: {sanctionError.message}</p>}

                  {sanctionData?.message && sanctionData.message.length > 0 ? (
                    <>
                      {/* Sanction Selector - only show if more than 1 sanction */}
                      {sanctionData.message.length > 1 && (
                        <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                          <label className="text-sm font-medium text-gray-700">Select Sanction:</label>
                          <select
                            value={selectedSanctionIndex}
                            onChange={(e) => setSelectedSanctionIndex(Number(e.target.value))}
                            className="flex-1 max-w-md px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(14,165,164,0.25)] focus:border-[#0EA5A4]"
                          >
                            {sanctionData.message.map((sanction: any, index: number) => (
                              <option key={sanction.name} value={index}>
                                {sanction.name} - {sanction.sanctioned_letter_no || 'No Letter No'} ({(sanction.total_sanctioned_amount || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Selected Sanction Details */}
                      {(() => {
                        const sanction = sanctionData.message[selectedSanctionIndex];
                        if (!sanction) return null;

                        const budgetColumns = [
                          { fieldname: "account_head", label: "Account Head" },
                          { fieldname: "first_year_budget", label: "Year 1" },
                          { fieldname: "second_year_budget", label: "Year 2" },
                          { fieldname: "third_year_budget", label: "Year 3" },
                          { fieldname: "fourth_year_budget", label: "Year 4" },
                          { fieldname: "fifth_year_budget", label: "Year 5" },
                        ];
                        const budgetYearFieldnames = budgetColumns.filter(c => c.fieldname !== 'account_head').map(c => c.fieldname);
                        const columnTotals: { [key: string]: number } = budgetYearFieldnames.reduce((totals: { [key: string]: number }, fieldname) => {
                          totals[fieldname] = (sanction.sanctioned_budget_breakup || []).reduce((sum: number, row: any) => {
                            return sum + (parseFloat(row[fieldname]) || 0);
                          }, 0);
                          return totals;
                        }, {});
                        const grandTotal = Object.values(columnTotals).reduce((sum: number, total: any) => sum + total, 0);
                        const isDraft = sanction.sanction_workflow_status?.toLowerCase() === 'draft';

                        return (
                          <FrappeCard className="space-y-5">
                            <div className="pb-4 border-b border-gray-200">
                              <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex-1">
                                  <h3 className="text-base font-semibold text-gray-900">
                                    Sanction: {sanction.name}
                                  </h3>
                                  <div className="text-sm text-[#6B7280] mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                                    <span className="inline-flex items-center gap-1.5">
                                      Status: <span className={cn("font-medium px-2.5 py-0.5 rounded-full text-xs", getStatusBadgeClass(sanction.sanction_workflow_status))}>{sanction.sanction_workflow_status || 'DRAFT'}</span>
                                    </span>
                                    <span>
                                      Letter No: <span className="font-medium text-gray-700">{sanction.sanctioned_letter_no}</span>
                                    </span>
                                    <span>
                                      Date: <span className="font-medium text-gray-700">{sanction.sanctioned_letter_date}</span>
                                    </span>
                                    <span>
                                      Amount: <span className="font-semibold text-[#0EA5A4]">{(sanction.total_sanctioned_amount || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                                    </span>
                                  </div>
                                </div>

                                {isDraft && (
                                  <div className="flex-shrink-0">
                                    <FrappeButton
                                      onClick={() => handleSubmitSanction(sanction.name)}
                                      disabled={isSubmittingSanction}
                                      aria-label="Submit sanction"
                                    >
                                      <CheckCircleIcon className="h-4 w-4" />
                                      {isSubmittingSanction ? "Submitting..." : "Submit"}
                                    </FrappeButton>
                                  </div>
                                )}
                              </div>
                              {isDraft && (
                                <div className="flex items-start gap-3 p-4 border border-yellow-400 rounded-lg bg-[#FFFDF5] shadow-sm">
                                  <AlertCircleIcon className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5 drop-shadow-sm" />
                                  <div className="space-y-1">
                                    <p className="font-semibold text-yellow-800 tracking-wide text-base">
                                      Draft Document
                                    </p>
                                    <p className="text-sm text-yellow-700 leading-relaxed">
                                      This sanction is currently in <span className="font-medium">draft status</span>.
                                      Please review and submit when you are ready.
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                            {(sanction.sanctioned_budget_breakup?.length > 0) && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-800 mb-3">Budget Breakup</h4>
                                <div className="overflow-x-auto rounded-lg border border-gray-200">
                                  <table className="frappe-table">
                                    <thead>
                                      <tr>
                                        {budgetColumns.map(c => (
                                          <th key={c.fieldname}>{c.label}</th>
                                        ))}
                                        <th>Total</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {(sanction.sanctioned_budget_breakup || []).map((row: any, i: number) => {
                                        const rowTotal = budgetYearFieldnames.reduce((sum, fieldname) => {
                                          return sum + (parseFloat(row[fieldname]) || 0);
                                        }, 0);

                                        return (
                                          <tr key={i}>
                                            {budgetColumns.map(c => (
                                              <td key={c.fieldname}>
                                                {c.fieldname === 'account_head' ? row[c.fieldname] : (parseFloat(row[c.fieldname]) || 0).toLocaleString('en-IN')}
                                              </td>
                                            ))}
                                            <td className="font-semibold">{rowTotal.toLocaleString('en-IN')}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                    <tfoot className="bg-gray-50 border-t border-gray-200">
                                      <tr>
                                        <td className="font-semibold text-gray-900">Total</td>
                                        {budgetYearFieldnames.map(fieldname => (
                                          <td key={fieldname} className="font-semibold text-gray-900">
                                            {columnTotals[fieldname].toLocaleString('en-IN')}
                                          </td>
                                        ))}
                                        <td className="font-bold text-[#0EA5A4]">
                                          {grandTotal.toLocaleString('en-IN')}
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              </div>
                            )}
                            {(sanction.sanction_related_files?.length > 0) && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-800 mb-3">Attached Files</h4>
                                <div className="space-y-2">
                                  {sanction.sanction_related_files.map((file: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between gap-4 p-3 rounded-lg border border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-800 text-sm truncate">{file.file_name || 'File'}</p>
                                        <p className="text-xs text-[#6B7280]">{file.description}</p>
                                      </div>
                                      {file.file_data ? (
                                        <a
                                          href={`data:${getMimeType(file.file_name)};base64,${file.file_data}`}
                                          download={file.file_name}
                                          className="frappe-btn frappe-btn-primary text-sm"
                                          aria-label={`Download ${file.file_name}`}
                                        >
                                          <DownloadIcon className="h-4 w-4" /> Download
                                        </a>
                                      ) : <span className="text-xs text-red-500">Could not load</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </FrappeCard>
                        );
                      })()}

                      {/* Consolidated Fund History Section - Show funds for selected sanction */}
                      <div className="mt-8">
                        <FundDetails project_title={projectName || ""} sanction_ref_no={sanctionData.message[selectedSanctionIndex]?.name} />
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-16 text-[#6B7280] rounded-xl border border-dashed border-gray-300 bg-white">
                      <CreditCardIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                      <p className="font-medium text-gray-700">No Sanction Details Found</p>
                      <p className="text-sm mt-1">Click "Add Sanction" to create the first entry.</p>
                    </div>
                  )}
                </div>
              )}

              {/* --- ADDED THIS BLOCK TO RENDER QUICK ACTIONS --- */}
              {activeTab === "quick-actions" && (
                <QuickActions />
              )}

              {activeTab === "activity" && (
                <ActivityStream
                  ref={activityStreamRef}
                  doctype="Project Registration"
                  docname={projectName!}
                />
              )}
            </div>
          </div>

          {/* Right Sidebar Column */}
          <aside className="lg:col-span-1 space-y-4 lg:sticky lg:top-4 lg:self-start">
            {/* Section 1: Budget Head Summary */}
            <div className="frappe-widget">
              <h3 className="frappe-widget-title">Budget Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#6B7280]">Actual Balance</span>
                  <span className="text-base font-semibold text-gray-900">₹ {actualBalance.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#6B7280]">Commitable Balance</span>
                  <span className="text-base font-semibold text-gray-900">₹ {commitableBalance.toLocaleString('en-IN')}</span>
                </div>
              </div>
              <button
                onClick={() => setIsLedgerOpen(true)}
                aria-label="View budget ledger"
                className="frappe-btn frappe-btn-outline w-full mt-4"
              >
                View Ledger
              </button>
            </div>

            {/* Section 2: Commits */}
            <div className="frappe-widget">
              <h3 className="frappe-widget-title">Make a Commitment</h3>
              <div className="space-y-3">
                <div>
                  <label htmlFor="commit-head" className="frappe-label">Budget Head</label>
                  <select
                    id="commit-head"
                    className="frappe-select"
                    value={commitHead}
                    onChange={(e) => setCommitHead(e.target.value)}
                  >
                    <option value="Travel">Travel</option>
                    <option value="Contingency">Contingency</option>
                    <option value="Overhead">Overhead</option>
                    <option value="Equipment">Equipment</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Available: <span className="font-medium text-[#0EA5A4]">{actualBalance.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
                  </p>
                </div>
                <div>
                  <label htmlFor="commit-amount" className="frappe-label">Amount (₹)</label>
                  <input
                    type="number"
                    id="commit-amount"
                    className="frappe-input"
                    placeholder="e.g., 5000"
                    value={commitAmount}
                    onChange={(e) => setCommitAmount(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={handleCommit} className="frappe-btn frappe-btn-primary flex-1">Commit</button>
                  <button onClick={handleRemoveLastCommit} className="frappe-btn frappe-btn-ghost">Remove</button>
                </div>
              </div>
            </div>

            {/* Section 3: Comments */}
            <div className="frappe-widget">
              <h3 className="frappe-widget-title">Add Comment</h3>
              <textarea
                id="comment-box"
                className="frappe-textarea"
                rows={3}
                placeholder="Type your comment here..."
                value={sidebarComment}
                onChange={(e) => setSidebarComment(e.target.value)}
              />
              <button
                className="frappe-btn frappe-btn-primary w-full mt-3"
                onClick={handleSidebarCommentSubmit}
                disabled={isAddingComment}
                aria-label="Submit comment"
              >
                {isAddingComment ? "Submitting..." : "Submit Comment"}
              </button>
            </div>
          </aside>
        </div>

        {/* Budget Ledger Modal */}
        {isLedgerOpen && (
          <div className="frappe-modal-backdrop" onClick={() => setIsLedgerOpen(false)} role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="frappe-modal" onClick={(e) => e.stopPropagation()}>
              <header className="frappe-modal-header">
                <h2 id="modal-title">Project Budget Ledger</h2>
                <button
                  onClick={() => setIsLedgerOpen(false)}
                  className="frappe-modal-close"
                  aria-label="Close modal"
                >
                  ×
                </button>
              </header>
              <div className="frappe-modal-body">
                <table className="frappe-table">
                  <thead>
                    <tr>
                      <th>SL. NO</th>
                      <th>DATE</th>
                      <th>PARTICULARS</th>
                      <th>REF.</th>
                      <th style={{ textAlign: 'right' }}>RECEIVED</th>
                      <th style={{ textAlign: 'right' }}>COMMITTED</th>
                      <th style={{ textAlign: 'right' }}>COMMITABLE BAL.</th>
                      <th>BMR. NO</th>
                      <th style={{ textAlign: 'right' }}>PAYMENT</th>
                      <th style={{ textAlign: 'right' }}>ACTUAL BAL.</th>
                      <th style={{ textAlign: 'center' }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budgetData.map((row, index) => (
                      <tr key={index}>
                        <td>{row.sl}</td>
                        <td>{row.date}</td>
                        <td>{row.particulars}</td>
                        <td>{row.ref}</td>
                        <td style={{ textAlign: 'right' }}>{row.received ? row.received.toLocaleString('en-IN') : '-'}</td>
                        <td style={{ textAlign: 'right' }}>{row.committed ? row.committed.toLocaleString('en-IN') : '-'}</td>
                        <td style={{ textAlign: 'right' }}>{row.commitableBalance?.toLocaleString('en-IN')}</td>
                        <td>{row.bmr}</td>
                        <td style={{ textAlign: 'right' }}>{row.payment ? row.payment.toLocaleString('en-IN') : '-'}</td>
                        <td style={{ textAlign: 'right' }}>{row.actualBalance?.toLocaleString('en-IN')}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            onClick={() => handleRemoveItem(index)}
                            className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                            title="Remove Item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="bg-[#F0F4F8] min-h-screen">
      <AppSidebar />
      <main className="flex-1 p-4 md:p-8 w-full">
        {renderContent()}
      </main>
    </div>
  );
};

export default ProjectDetailsOverview;

