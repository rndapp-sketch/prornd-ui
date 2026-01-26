
// -=-=-=-=--= v4

import React, {
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useRef,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useFrappeGetDoc,
  useFrappePostCall,
  useFrappeGetCall,
  useFrappeAuth,
} from "frappe-react-sdk";
import { Textarea } from "@/components/ui/textarea"; // Assuming this can be styled via className
import { AppSidebar } from "../components/RndSidebar";
import useUserRoleCheck from "../components/UserRoleCheck";
import {
  ArrowLeftIcon,
  FileTextIcon,
  UsersIcon,
  IndianRupeeIcon,
  ShieldIcon,
  MessageSquareIcon,
  SettingsIcon,
  CalendarIcon,
  UserIcon,
  BuildingIcon,
  CreditCardIcon,
  UploadIcon,
  ShoppingCartIcon,
  UsersIcon as UsersGroupIcon,
  PlaneIcon,
  MapPinIcon,
  MailIcon,
  GlobeIcon,
  TargetIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  FileBadge,
  FolderOpenIcon,
  DownloadIcon,
  ExternalLinkIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import AddFundSanction from "./AddFundSanction";
import { DepartmentName } from "@/components/DepartmentName";

// --- Interfaces (Unchanged) ---
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
interface ProjectDetailsProps {
  projectName?: string;
  backUrl?: string;
  backLabel?: string;
}

const CommentModal = ({ isOpen, onClose, onSubmit, action, isLoading }: { isOpen: boolean; onClose: () => void; onSubmit: (comment: string) => void; action: string; isLoading: boolean }) => {
  const [comment, setComment] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-lg w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm {action}</h3>
        <Textarea
          className="w-full border border-gray-300 p-3 rounded-lg text-sm mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-[rgba(14,165,164,0.25)] focus:border-[#0EA5A4]"
          rows={4}
          placeholder="Add a comment (optional)..."
          value={comment}
          onChange={e => setComment(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <FrappeButton onClick={onClose} className="bg-gray-100 hover:bg-gray-200" disabled={isLoading}>Cancel</FrappeButton>
          <FrappeButton
            onClick={() => onSubmit(comment)}
            disabled={isLoading}
            className="bg-[#0EA5A4] hover:bg-[#0C8F8E] text-white"
          >
            {isLoading ? "Processing..." : "Confirm"}
          </FrappeButton>
        </div>
      </div>
    </div>
  );
};

// --- DESIGN: FieldDisplay Component ---
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
    <div className="py-3">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="h-4 w-4 text-gray-500" />}
        <p className="text-xs font-semibold text-gray-700">
          {label}
        </p>
      </div>
      <p className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{value}</p>
    </div>
  );
};

// --- Frappe Styled Helper Components ---
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
    <div className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="h-4 w-4 text-[#0EA5A4]" />}
        <h4 className="text-base font-semibold text-gray-900">{title}</h4>
      </div>
      <div
        className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: htmlString }}
      />
    </div>
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
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b border-gray-200 bg-gray-50">
        {Icon && <Icon className="h-4 w-4 text-[#0EA5A4]" />}
        <h3 className="text-base font-semibold text-gray-900">{label}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.fieldname}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-600"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row, index) => (
              <tr
                key={index}
                className="hover:bg-gray-50/50 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.fieldname}
                    className="px-4 py-3 text-sm text-gray-700"
                  >
                    {row[col.fieldname]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};



const FrappeButton = ({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    className={cn(
      "px-5 py-2.5 bg-white border border-gray-200 rounded-lg font-semibold text-gray-700 shadow-sm transition-all",
      "hover:bg-gray-50 hover:shadow",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      className
    )}
    {...props}
  >
    {children}
  </button>
);


// --- QuickActions Component with Frappe Colors ---
const QuickActions = () => {
  const ActionButton = ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <FrappeButton
      className={cn("w-full justify-start text-sm h-auto py-3", className)}
    >
      {children}
    </FrappeButton>
  );
  const Section = ({
    title,
    icon: Icon,
    children,
  }: {
    title: string;
    icon: any;
    children: React.ReactNode;
  }) => (
    <div className="p-4 pb-6 border border-gray-200 rounded-xl bg-white shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-base">
        <Icon className="h-5 w-5 text-[#0EA5A4]" />
        {title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {children}
      </div>
    </div>
  );
  return (
    <div className="space-y-6">
      <Section title="Advance" icon={CreditCardIcon}>
        <ActionButton className="bg-sky-50 hover:bg-sky-100 text-sky-700">
          Reimbursement
        </ActionButton>
        <ActionButton className="bg-sky-50 hover:bg-sky-100 text-sky-700">
          Temporary Advance Apply
        </ActionButton>
        <ActionButton className="bg-sky-50 hover:bg-sky-100 text-sky-700">
          Temporary Advance Settle
        </ActionButton>
      </Section>
      <Section title="Disbursal" icon={UploadIcon}>
        <ActionButton className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700">
          One Time Assistantship
        </ActionButton>
        <ActionButton className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700">
          Top Up Fellowship
        </ActionButton>
      </Section>
      <Section title="Purchase" icon={ShoppingCartIcon}>
        <ActionButton className="bg-amber-50 hover:bg-amber-100 text-amber-700">
          Direct Purchase
        </ActionButton>
        <ActionButton className="bg-amber-50 hover:bg-amber-100 text-amber-700">
          General Indent
        </ActionButton>
        <ActionButton className="bg-amber-50 hover:bg-amber-100 text-amber-700">
          Generate NIQ
        </ActionButton>
        <ActionButton className="bg-amber-50 hover:bg-amber-100 text-amber-700">
          Indent cum Sanction
        </ActionButton>
        <ActionButton className="bg-amber-50 hover:bg-amber-100 text-amber-700">
          Rate Contract
        </ActionButton>
      </Section>
      <Section title="Recruitment" icon={UsersGroupIcon}>
        <ActionButton className="bg-rose-50 hover:bg-rose-100 text-rose-700">
          Adhoc
        </ActionButton>
        <ActionButton className="bg-rose-50 hover:bg-rose-100 text-rose-700">
          Committee Member Change
        </ActionButton>
        <ActionButton className="bg-rose-50 hover:bg-rose-100 text-rose-700">
          Contractual
        </ActionButton>
        <ActionButton className="bg-rose-50 hover:bg-rose-100 text-rose-700">
          Selection Committee Report
        </ActionButton>
      </Section>
      <Section title="Travel" icon={PlaneIcon}>
        <ActionButton className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700">
          Apply
        </ActionButton>
        <ActionButton className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700">
          TA-DA Settle
        </ActionButton>
      </Section>
      <Section title="Utilities" icon={SettingsIcon}>
        <ActionButton className="bg-slate-100 hover:bg-slate-200 text-slate-700">
          Add New User
        </ActionButton>
        <ActionButton className="bg-slate-100 hover:bg-slate-200 text-slate-700">
          Application History
        </ActionButton>
        <ActionButton className="bg-slate-100 hover:bg-slate-200 text-slate-700">
          Form Tracking
        </ActionButton>
        <ActionButton className="bg-slate-100 hover:bg-slate-200 text-slate-700">
          Incharge Assignment
        </ActionButton>
      </Section>
    </div>
  );
};

// --- Activity Stream Component (Unchanged logic, updated styles) ---
const ActivityStream = forwardRef<ActivityStreamHandle, ActivityStreamProps>(
  ({ doctype, docname }, ref) => {
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const {
      data: activityData,
      mutate: refetchActivity,
      error: activityError,
      isLoading: isActivityLoading,
    } = useFrappeGetCall<{ message: ActivityItem[] }>(
      "rndopsapp.rndopsapp.api.get_project_activity",
      { doctype, docname },
      {
        enabled: !!docname,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
      }
    );
    const { call: addComment } = useFrappePostCall(
      "rndopsapp.rndopsapp.api.add_project_comment"
    );
    const handleCommentSubmit = async () => {
      if (!newComment.trim()) return;
      setIsSubmitting(true);
      try {
        await addComment({ doctype, docname, content: newComment.trim() });
        setNewComment("");
        await refetchActivity();
      } catch (err: any) {
        console.error("Failed to add comment:", err);
        alert("Error: Could not post comment.");
      } finally {
        setIsSubmitting(false);
      }
    };
    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        handleCommentSubmit();
      }
    };
    useImperativeHandle(ref, () => ({
      refetch() {
        refetchActivity();
      },
    }));
    return (
      <div className="space-y-6">
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <label
            htmlFor="comment-textarea"
            className="block text-sm font-medium text-gray-700 mb-3"
          >
            Add a comment
          </label>
          <Textarea
            id="comment-textarea"
            placeholder="Type here... (Ctrl+Enter to submit)"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isSubmitting}
            className="resize-none bg-white p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgba(14,165,164,0.25)] focus:border-[#0EA5A4]"
            rows={4}
          />
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-gray-500">
              {newComment.length}/1000
            </span>
            <FrappeButton
              onClick={handleCommentSubmit}
              disabled={isSubmitting || !newComment.trim()}
              className="bg-[#0EA5A4] hover:bg-[#0C8F8E] text-white"
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </FrappeButton>
          </div>
        </div>
        <div className="space-y-4">
          {isActivityLoading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#0EA5A4] border-t-transparent"></div>
            </div>
          )}
          {activityError && (
            <div className="text-center p-6 text-red-700 border border-red-200 rounded-xl bg-red-50">
              <p className="font-medium">Failed to load activities</p>
            </div>
          )}
          {activityData?.message && activityData.message.length > 0
            ? activityData.message.map((item, index) => (
              <div
                key={`${item.creation}-${index}`}
                className="flex items-start gap-4 p-4 bg-white border border-gray-200 rounded-xl shadow-sm"
              >
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-[#E0F7F6] border border-gray-200 flex items-center justify-center font-semibold text-[#0EA5A4] text-sm">
                  {item.owner?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {item.owner || "Unknown User"}
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <ClockIcon className="h-3 w-3" />
                      {item.creation
                        ? new Date(item.creation).toLocaleString()
                        : "N/A"}
                    </p>
                  </div>
                  <div
                    className="text-sm text-gray-700 prose prose-sm max-w-none leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: item.content || "No content",
                    }}
                  />
                </div>
              </div>
            ))
            : !isActivityLoading && (
              <div className="text-center py-12 text-gray-500 border border-dashed border-gray-300 rounded-xl bg-white">
                <MessageSquareIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="font-medium text-gray-600">No activity yet.</p>
                <p className="text-sm mt-1">Be the first to add a comment.</p>
              </div>
            )}
        </div>
      </div>
    );
  }
);
ActivityStream.displayName = "ActivityStream";

// --- Workflow Actions Component (Unchanged) ---
const WorkflowActions = ({
  docname,
  onAction,
  isLoading,
}: {
  docname: string;
  onAction: (action: string) => void;
  isLoading: boolean;
}) => {
  const {
    data,
    error,
    isLoading: isActionsLoading,
  } = useFrappeGetCall<{ message: string[] }>(
    "rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_available_workflow_actions",
    { docname }
  );
  if (isActionsLoading) {
    return <div className="text-sm text-gray-500">Loading actions...</div>;
  }
  if (error || !data?.message || data.message.length === 0) {
    return null;
  }
  return (
    <div className="flex items-center gap-2">
      {data.message.map((actionString: string) => (
        <FrappeButton
          key={actionString}
          onClick={() => onAction(actionString)}
          className={cn("flex items-center gap-2", {
            "bg-[#0EA5A4] hover:bg-[#0C8F8E] text-white":
              actionString.toLowerCase().includes("approve") ||
              actionString.toLowerCase().includes("submit"),
            "bg-red-500 hover:bg-red-600 text-white": actionString
              .toLowerCase()
              .includes("reject"),
            "bg-gray-100 hover:bg-gray-200": !["approve", "reject", "submit"].some((term) =>
              actionString.toLowerCase().includes(term)
            ),
          })}
          disabled={isLoading}
        >
          {actionString.toLowerCase().includes("approve") && (
            <CheckCircleIcon className="h-4 w-4" />
          )}
          {actionString.toLowerCase().includes("reject") && (
            <XCircleIcon className="h-4 w-4" />
          )}
          {isLoading ? "Processing..." : actionString}
        </FrappeButton>
      ))}
    </div>
  );
};

// --- Main Component ---
const ProjectDetailsView: React.FC<ProjectDetailsProps> = ({
  projectName: propProjectName,
  backUrl = "/projects-view",
  backLabel = "Back to Projects",
}) => {
  // --- LOGIC: All hooks and handlers remain unchanged ---
  const { projectName: paramProjectName } = useParams<{ projectName: string }>();
  const projectName = propProjectName || paramProjectName;

  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview"); // Default to overview
  const activityStreamRef = useRef<ActivityStreamHandle>(null);
  const { } = useFrappeAuth();
  const isPermanentEmployee = useUserRoleCheck();
  const { data, error, isLoading, mutate } = useFrappeGetDoc(
    "Project Registration",
    projectName ?? "",
    { enabled: !!projectName, cacheTime: 0 }
  );

  const { call: triggerWorkflowAction, loading: isActionLoading } =
    useFrappePostCall("rndopsapp.rndopsapp.doctype.project_registration.project_registration.handle_dynamic_workflow_action");
  const { call: submitProjectRegistration } = useFrappePostCall(
    "rndopsapp.rndopsapp.api.submit_project_registration"
  );

  const { call: viewEndorsementFile, loading: isViewingEndorsement } = useFrappePostCall(
    "rndopsapp.rndopsapp.doctype.project_registration.project_registration.view_endorsement_file"
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState("");

  const handleWorkflowAction = useCallback(
    (action: string) => {
      setSelectedAction(action);
      setModalOpen(true);
    },
    []
  );

  const handleConfirmAction = useCallback(
    (comment: string) => {
      const action = selectedAction;
      const apiCall =
        action.toLowerCase() === "submit"
          ? submitProjectRegistration({ docname: projectName }) // Submit might not need comment, or backend might not support it yet. But generic workflow usually does.
          : triggerWorkflowAction({
            doctype: "Project Registration",
            docname: projectName,
            action: action,
            comment: comment // Passing comment here
          });
      apiCall
        .then(() => {
          setModalOpen(false);
          window.location.reload();
        })
        .catch((err: any) =>
          console.error(`Error during workflow action:`, err)
        );
    },
    [triggerWorkflowAction, submitProjectRegistration, mutate, projectName, selectedAction]
  );


  const tabs = [
    // { id: "quick-actions", label: "Available Services", icon: SettingsIcon },
    { id: "overview", label: "Overview", icon: FileTextIcon },
    { id: "investigators", label: "Investigators", icon: UsersIcon },
    { id: "funding", label: "Funding & Budget", icon: IndianRupeeIcon },
    { id: "clearance", label: "Clearance", icon: ShieldIcon },
    { id: "endorsement", label: "Endorsement", icon: FileBadge },
    { id: "files", label: "Files", icon: FolderOpenIcon },
    { id: "activity", label: "Activity Log", icon: MessageSquareIcon },
  ];

  const renderContent = () => {
    if (!projectName) {
      return (
        <div className="flex items-center justify-center p-4 min-h-screen">
          <div className="text-center p-8 max-w-md w-full bg-white border border-gray-200 rounded-md shadow-sm">
            <FileTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-black mb-2">
              No Project Selected
            </h2>
            <p className="text-gray-700 mb-6 font-mono">
              Select a project to see details.
            </p>
            <FrappeButton
              onClick={() => navigate(backUrl)}
              className="bg-cyan-300 hover:bg-cyan-400"
            >
              {backLabel}
            </FrappeButton>
          </div>
        </div>
      );
    }
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#0EA5A4] border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Project...</p>
          </div>
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex items-center justify-center p-4 min-h-screen">
          <div className="text-center p-8 max-w-md w-full bg-red-50 border border-red-200 rounded-xl">
            <h2 className="text-xl font-semibold text-red-800 mb-2">
              Error Loading Project
            </h2>
            <p className="text-red-600 mb-6 text-sm">{error.message}</p>
            <FrappeButton
              onClick={() => navigate(backUrl)}
              className="bg-white hover:bg-gray-100"
            >
              {backLabel}
            </FrappeButton>
          </div>
        </div>
      );
    }
    return (
      <>
        <header className="mb-6 p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(backUrl)}
                className="p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {data?.project_title || "Project Details"}
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  ID: {projectName} · <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#E0F7F6] text-[#0EA5A4]">
                    {data?.workflow_state || "Draft"}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">

              <WorkflowActions
                docname={projectName}
                onAction={handleWorkflowAction}
                isLoading={isActionLoading}
              />
            </div>
          </div>
        </header>
        <CommentModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleConfirmAction}
          action={selectedAction}
          isLoading={isActionLoading}
        />
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-1 p-1 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-shrink-0 flex items-center gap-2 py-2.5 px-4 font-medium text-sm rounded-lg transition-all",
                    activeTab === tab.id
                      ? "bg-[#E0F7F6] text-[#0EA5A4]"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="bg-gray-50/50 p-6">
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="p-5 bg-white border border-gray-200 rounded-xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
                    <FieldDisplay
                      label="Project Type"
                      value={data?.project_type}
                      icon={FileTextIcon}
                    />
                    <FieldDisplay
                      label="Implementation Dept"
                      value={data?.implementation_department ? <DepartmentName name={data?.implementation_department} /> : null}
                      icon={BuildingIcon}
                    />
                    <FieldDisplay
                      label="Status"
                      value={data?.workflow_state}
                      icon={TargetIcon}
                    />
                    <FieldDisplay
                      label="Project Duration"
                      value={`${data?.project_duration_months}m ${data?.project_duration_days || 0
                        }d`}
                      icon={CalendarIcon}
                    />
                    <FieldDisplay
                      label="Start Date"
                      value={data?.prj_start_date}
                      icon={CalendarIcon}
                    />
                    <FieldDisplay
                      label="End Date"
                      value={data?.prj_end_date}
                      icon={CalendarIcon}
                    />
                    <FieldDisplay
                      label="International Travel"
                      value={data?.involves_international_travel}
                      icon={PlaneIcon}
                    />
                    {data?.upload_proj_prop && (
                      <div className="py-3">
                        <div className="flex items-center gap-2 mb-1">
                          <FileTextIcon className="h-4 w-4 text-gray-500" />
                          <p className="text-xs font-semibold text-gray-700">Project Proposal</p>
                        </div>
                        <a
                          href={data.upload_proj_prop.startsWith('http') ? data.upload_proj_prop : `/files/${data.upload_proj_prop}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-[#0EA5A4] hover:underline flex items-center gap-1"
                        >
                          <ExternalLinkIcon className="h-3 w-3" /> View File
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                {/* Consultancy Details */}
                {data?.project_type === "Consultancy" && (
                  <div className="p-5 bg-white border border-gray-200 rounded-xl">
                    <h3 className="text-base font-semibold text-gray-900 mb-3">
                      Consultancy Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
                      <FieldDisplay label="Consultancy Category" value={data?.consultancy_category} icon={FileTextIcon} />
                      <FieldDisplay label="GSTIN" value={data?.consultancy_gstin} icon={FileTextIcon} />
                      <FieldDisplay label="GST Rate" value={data?.consultancy_gst_rate} icon={IndianRupeeIcon} />

                      {data?.consultancy_category?.startsWith("Category D") && (
                        <>
                          <FieldDisplay label="Category D Note" value={data?.category_d_note} icon={FileTextIcon} />
                          <FieldDisplay label="Total Cost (Excl. GST)" value={data?.cat_d_project_cost_excl_gst} icon={IndianRupeeIcon} />
                          <FieldDisplay label="Consultancy Fee" value={data?.cat_d_consultancy_fee_input} icon={IndianRupeeIcon} />
                          <FieldDisplay label="Operational Expense (+OH)" value={data?.operational_expense_input_inc_10_oh} icon={IndianRupeeIcon} />
                          <FieldDisplay label="Institute Share" value={data?.cat_d_institute_share} icon={IndianRupeeIcon} />
                          <FieldDisplay label="Total Overhead" value={data?.cat_d_total_overhead} icon={IndianRupeeIcon} />
                          <FieldDisplay label="GST Amount" value={data?.cat_d_gst_amt} icon={IndianRupeeIcon} />
                          <FieldDisplay label="Grand Total" value={data?.cat_d_grand_total_calc} icon={IndianRupeeIcon} />
                        </>
                      )}

                      {(!data?.consultancy_category?.startsWith("Category D") && data?.consultancy_category) && (
                        <>
                          <FieldDisplay label="Category Note" value={data?.category_e_note || data?.category_t_note} icon={FileTextIcon} />
                          <FieldDisplay label="Total Amount" value={data?.cat_ef_total_amount} icon={IndianRupeeIcon} />
                          <FieldDisplay label="Honorarium" value={data?.cat_ef_honorarium} icon={IndianRupeeIcon} />
                          <FieldDisplay label="Institute Share" value={data?.cat_ef_institute_share} icon={IndianRupeeIcon} />
                          <FieldDisplay label="GST" value={data?.cat_ef_gst} icon={IndianRupeeIcon} />
                          <FieldDisplay label="Grand Total" value={data?.cat_ef_grand_total} icon={IndianRupeeIcon} />
                        </>
                      )}
                    </div>
                  </div>
                )}
                {/* Other Project Type */}
                {data?.project_type === "Other" && (
                  <div className="p-5 bg-white border border-gray-200 rounded-xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
                      <FieldDisplay label="Other Project Type" value={data?.other_project_type_name} icon={FileTextIcon} />
                    </div>
                  </div>
                )}
                <div className="p-5 bg-white border border-gray-200 rounded-xl">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">
                    Funding Agency
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
                    <FieldDisplay
                      label="Agency Name"
                      value={data?.funding_agen}
                      icon={BuildingIcon}
                    />
                    <FieldDisplay
                      label="Agency Type"
                      value={data?.funding_agency_type}
                      icon={UsersIcon}
                    />
                    <FieldDisplay
                      label="Origin"
                      value={data?.origin_of_funding_agency}
                      icon={GlobeIcon}
                    />
                    <FieldDisplay
                      label="Ministry"
                      value={data?.funding_agency_ministry}
                      icon={BuildingIcon}
                    />
                    <FieldDisplay
                      label="Scheme"
                      value={data?.funding_agency_schemes}
                      icon={FileTextIcon}
                    />
                    <FieldDisplay
                      label="Address"
                      value={`${data?.address_street_village_locality}, ${data?.address_state}, ${data?.address_country} - ${data?.address_postal_code}`}
                      icon={MapPinIcon}
                    />
                  </div>
                </div>
                <HtmlContent
                  title="Executive Summary"
                  htmlString={data?.executive_summary}
                  icon={FileTextIcon}
                />
                <HtmlContent
                  title="Project Objective"
                  htmlString={data?.project_objective}
                  icon={TargetIcon}
                />
                <HtmlContent
                  title="Project Deliverables"
                  htmlString={data?.project_deliverables}
                  icon={CheckCircleIcon}
                />
              </div>
            )}
            {activeTab === "investigators" && (
              <div className="space-y-6">
                <div className="p-5 bg-white border border-gray-200 rounded-xl">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">
                    Principal Investigator (PI)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
                    <FieldDisplay
                      label="Name"
                      value={data?.principal_investigator_name}
                      icon={UserIcon}
                    />
                    <FieldDisplay
                      label="Email"
                      value={data?.pi_webmail}
                      icon={MailIcon}
                    />
                    <FieldDisplay
                      label="Employee ID"
                      value={data?.pi_employee_id}
                      icon={UserIcon}
                    />
                    <FieldDisplay
                      label="Designation"
                      value={data?.designation}
                      icon={UsersIcon}
                    />
                    <FieldDisplay
                      label="Department"
                      value={data?.applicant_department ? <DepartmentName name={data?.applicant_department} /> : null}
                      icon={BuildingIcon}
                    />
                  </div>
                </div>
                {data?.is_additional_pi === "Yes" && (
                  <TableDisplay
                    label="Additional PIs"
                    data={data?.additional_pi_table}
                    columns={[
                      { fieldname: "pi_name", label: "Name" },
                      { fieldname: "pi_designation", label: "Designation" },
                      { fieldname: "pi_email", label: "Email" },
                      { fieldname: "pi_address", label: "Address" },
                      { fieldname: "pi_contact", label: "Contact" },
                    ]}
                    icon={UsersIcon}
                  />
                )}
                {data?.has_co_pi === "Yes" && (
                  <TableDisplay
                    label="Co-Investigators"
                    data={data?.co_investigator_table}
                    columns={[
                      { fieldname: "copi_name", label: "Name" },
                      { fieldname: "copi_designation", label: "Designation" },
                      { fieldname: "copi_email", label: "Email" },
                      { fieldname: "copi_address", label: "Address" },
                      { fieldname: "copi_contact", label: "Contact" },
                    ]}
                    icon={UsersIcon}
                  />
                )}
              </div>
            )}
            {activeTab === "funding" && (
              <div className="space-y-6">
                <TableDisplay
                  label="Proposed Budget Breakup"
                  data={data?.proposed_budget_breakup}
                  columns={[
                    { fieldname: "account_head", label: "Budget Head" },
                    { fieldname: "first_year_budget", label: "Year 1" },
                    { fieldname: "second_year_budget", label: "Year 2" },
                  ]}
                  icon={IndianRupeeIcon}
                />
                {data?.equipment_checkbox === 1 && (
                  <TableDisplay
                    label="Proposed Equipment"
                    data={data?.proposed_equipment_details}
                    columns={[
                      { fieldname: "item_name", label: "Equipment Name" },
                      { fieldname: "equip_total_unit_cost", label: "Cost" },
                    ]}
                    icon={ShoppingCartIcon}
                  />
                )}
                {data?.manpower_checkbox === 1 && (
                  <TableDisplay
                    label="Proposed Manpower"
                    data={data?.proposed_manpower_details}
                    columns={[
                      { fieldname: "designation_name", label: "Position" },
                      { fieldname: "manpower_salary", label: "Salary" },
                    ]}
                    icon={UsersGroupIcon}
                  />
                )}
              </div>
            )}
            {activeTab === "clearance" && (
              <div className="space-y-6">
                <div className="p-5 bg-white border border-gray-200 rounded-xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
                    <FieldDisplay
                      label="Needs Committee Clearance"
                      value={data?.needs_committee_clearance}
                      icon={ShieldIcon}
                    />
                    <FieldDisplay
                      label="Committee"
                      value={data?.committees}
                      icon={UsersIcon}
                    />
                    <FieldDisplay
                      label="Ethics Committee Details"
                      value={data?.ethics_committee_details}
                      icon={FileTextIcon}
                    />
                    <FieldDisplay
                      label="Biosafety Category"
                      value={data?.biosafety_category}
                      icon={ShieldIcon}
                    />
                    <FieldDisplay
                      label="Needs Endorsement"
                      value={data?.need_endorsement_copy}
                      icon={CheckCircleIcon}
                    />
                  </div>
                </div>
                {data?.declaration_html === 1 && (
                  <HtmlContent
                    title="Declaration"
                    htmlString={
                      "<p>Declaration content would be displayed here.</p>"
                    }
                    icon={FileTextIcon}
                  />
                )}
              </div>
            )}
            {activeTab === "activity" && (
              <ActivityStream
                ref={activityStreamRef}
                doctype="Project Registration"
                docname={projectName}
              />
            )}
            {activeTab === "endorsement" && (
              <div className="space-y-6">
                <div className="p-5 bg-white border border-gray-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-4">
                    <FileBadge className="h-5 w-5 text-[#0EA5A4]" />
                    <h3 className="text-base font-semibold text-gray-900">Endorsement Details</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
                    <FieldDisplay
                      label="Needs Endorsement"
                      value={data?.need_endorsement_copy}
                      icon={CheckCircleIcon}
                    />
                    <FieldDisplay
                      label="Endorsement Status"
                      value={data?.endorsement_status || "Pending"}
                      icon={FileTextIcon}
                    />
                    <FieldDisplay
                      label="Principal Investigator"
                      value={data?.principal_investigator_name}
                      icon={UserIcon}
                    />
                    <FieldDisplay
                      label="Department"
                      value={data?.applicant_department ? <DepartmentName name={data?.applicant_department} /> : null}
                      icon={BuildingIcon}
                    />
                    <FieldDisplay
                      label="Project Title"
                      value={data?.project_title}
                      icon={FileTextIcon}
                    />
                    <FieldDisplay
                      label="Funding Agency"
                      value={data?.funding_agen}
                      icon={BuildingIcon}
                    />
                  </div>
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        onClick={async () => {
                          try {
                            const res = await viewEndorsementFile({ docname: projectName });
                            if (res.message) {
                              const { pdf_file_url, html_file_url } = res.message;

                              const getFullUrl = (url: string) => {
                                if (!url) return "";
                                if (url.startsWith("http")) return url;

                                // Get base URL from env or current window origin
                                let baseUrl = import.meta.env.VITE_FRAPPE_URL;
                                if (!baseUrl) {
                                  // If VITE_FRAPPE_URL is not set, use current origin
                                  baseUrl = window.location.origin;
                                } else if (baseUrl.startsWith('/')) {
                                  // If VITE_FRAPPE_URL is relative, append to origin
                                  baseUrl = `${window.location.origin}${baseUrl}`;
                                }

                                return `${baseUrl.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
                              };

                              if (pdf_file_url) {
                                window.open(getFullUrl(pdf_file_url), '_blank');
                              } else if (html_file_url) {
                                window.open(getFullUrl(html_file_url), '_blank');
                              } else {
                                alert("No endorsement file found.");
                              }
                            }
                          } catch (e: any) {
                            console.error("View endorsement error:", e);
                            alert("Error viewing endorsement: " + (e.messages?.[0] || e.message));
                          }
                        }}
                        disabled={isViewingEndorsement}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#0EA5A4] hover:bg-[#0C8F8E] text-white rounded-lg font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        <ExternalLinkIcon className="h-4 w-4" />
                        {isViewingEndorsement ? "Opening..." : "View Endorsement"}
                      </button>
                      <button
                        onClick={() => {
                          let baseUrl = import.meta.env.VITE_FRAPPE_URL;
                          if (!baseUrl) {
                            baseUrl = window.location.origin;
                          } else if (baseUrl.startsWith('/')) {
                            baseUrl = `${window.location.origin}${baseUrl}`;
                          }

                          const downloadUrl = `${baseUrl.replace(/\/$/, "")}/api/method/rndopsapp.rndopsapp.doctype.project_registration.project_registration.download_endorsement_file?docname=${projectName}&file_type=pdf`;
                          window.open(downloadUrl, '_blank');
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#E0F7F6] hover:bg-[#B2EBF2] text-[#0EA5A4] rounded-lg font-medium transition-colors"
                      >
                        <DownloadIcon className="h-4 w-4" />
                        Download Certificate
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === "files" && (
              <div className="space-y-6">
                <div className="p-5 bg-white border border-gray-200 rounded-xl">
                  <div className="flex items-center gap-2 mb-4">
                    <FolderOpenIcon className="h-5 w-5 text-[#0EA5A4]" />
                    <h3 className="text-base font-semibold text-gray-900">Project Files</h3>
                  </div>
                  {data?.attachments && data.attachments.length > 0 ? (
                    <div className="space-y-3">
                      {data.attachments.map((file: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <FileTextIcon className="h-5 w-5 text-gray-500 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {file.file_name || file.name || 'Document'}
                              </p>
                              {file.file_size && (
                                <p className="text-xs text-gray-500">
                                  {(file.file_size / 1024).toFixed(1)} KB
                                </p>
                              )}
                            </div>
                          </div>
                          <a
                            href={file.file_url || file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#0EA5A4] bg-[#E0F7F6] rounded-lg hover:bg-[#B2EBF2] transition-colors"
                          >
                            <DownloadIcon className="h-4 w-4" />
                            Download
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500 border border-dashed border-gray-300 rounded-xl">
                      <FolderOpenIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="font-medium text-gray-600">No files attached yet.</p>
                      <p className="text-sm mt-1">Files related to this project will appear here.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {activeTab === "quick-actions" && <QuickActions />}
          </div>
        </div >
      </>
    );
  };

  return (
    <div className="bg-[#F0F4F8]">
      <AppSidebar />
      <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
        {renderContent()}
      </main>
    </div>
  );
};

export default ProjectDetailsView;
