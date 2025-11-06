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
import { Textarea } from "@/components/ui/textarea";
import { AppSidebar } from "../components/RndSidebar";
import {
  ArrowLeftIcon,
  FileTextIcon,
  UsersIcon,
  DollarSignIcon,
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
  PlusIcon,
  FilePlusIcon,
  MapPinIcon,
  MailIcon, // <-- ADD THIS ICON TO THE LIST
  GlobeIcon,
  TargetIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PrinterIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
interface ProjectDetailsProps {}

// --- Section Wrapper Component for better organization ---
const SectionWrapper = ({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "p-4 md:p-6 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]",
      className
    )}
  >
    <div className="flex items-center gap-3 mb-4">
      <Icon className="h-5 w-5 text-black" />
      <h3 className="text-xl font-bold text-black uppercase">{title}</h3>
    </div>
    <div className="space-y-4">{children}</div>
  </div>
);

// --- DESIGN: FieldDisplay Component (Unchanged) ---
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
        {Icon && <Icon className="h-4 w-4 text-black" />}
        <p className="text-sm font-bold text-black uppercase tracking-wider">
          {label}
        </p>
      </div>
      <p className="bg-[#ECEFF1] text-base text-gray-800 font-mono">{String(value)}</p>
    </div>
  );
};

// --- Styled Helper Components (Cleaned up from print styles) ---
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
        className="prose prose-sm max-w-none text-gray-800 leading-relaxed font-mono"
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
      <div className="overflow-x-auto border-2 border-black rounded-md">
        <table className="min-w-full divide-y-2 divide-black">
          <thead className="bg-[#90A4AE]">
            <tr className="divide-x-2 divide-black">
              {columns.map((col) => (
                <th
                  key={col.fieldname}
                  className="px-4 py-3 text-left text-sm font-bold text-black uppercase tracking-wider"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-black bg-white">
            {data.map((row, index) => (
              <tr
                key={index}
                className="divide-x-2 divide-black hover:bg-[#CFD8DC]"
              >
                {columns.map((col) => (
                  <td
                    key={col.fieldname}
                    className="px-4 py-3 text-sm text-gray-800 font-mono"
                  >
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

const NeoButton = ({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    className={cn(
      "px-5 py-3 bg-white border-2 border-black rounded-md font-bold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all",
      "hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px]",
      "active:shadow-none active:translate-x-[2px] active:translate-y-[2px]",
      "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0 disabled:bg-gray-300",
      className
    )}
    {...props}
  >
    {children}
  </button>
);

// --- Activity Stream Component (Unchanged logic) ---
const ActivityStream = forwardRef<ActivityStreamHandle, ActivityStreamProps>(
  ({ doctype, docname }, ref) => {
    // ... (internal logic is unchanged, same as original file)
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { data: activityData, mutate: refetchActivity } = useFrappeGetCall<{ message: ActivityItem[] }>(
      "rndopsapp.rndopsapp.api.get_project_activity",
      { doctype, docname }
    );
    const { call: addComment } = useFrappePostCall("rndopsapp.rndopsapp.api.add_project_comment");
    useImperativeHandle(ref, () => ({ refetch() { refetchActivity(); } }));
    const handleCommentSubmit = async () => { /* ... */ };
    const handleKeyPress = (e: React.KeyboardEvent) => { /* ... */ };

    return (
      <div className="space-y-6">
        <div className="p-4 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
          <label htmlFor="comment-textarea" className="block text-sm font-bold text-black mb-3 uppercase">
            Add a comment
          </label>
          <Textarea
            id="comment-textarea"
            placeholder="Type here... (Ctrl+Enter to submit)"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isSubmitting}
            className="resize-none bg-white p-3 border-2 border-black rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400 font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"
            rows={4}
          />
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-gray-600 font-mono">{newComment.length}/1000</span>
            <NeoButton onClick={handleCommentSubmit} disabled={isSubmitting || !newComment.trim()} className="bg-cyan-300 hover:bg-cyan-400">
              {isSubmitting ? "Submitting..." : "Submit"}
            </NeoButton>
          </div>
        </div>
        <div className="space-y-4">
          {activityData?.message?.map((item, index) => (
            <div
              key={`${item.creation}-${index}`}
              className="flex items-start gap-4 p-4 bg-white border-2 border-black rounded-md shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"
            >
              <div className="flex-shrink-0 h-12 w-12 rounded-full bg-cyan-300 border-2 border-black flex items-center justify-center font-bold text-black text-xl">
                {item.owner?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-base font-bold text-black">{item.owner || "Unknown User"}</p>
                  <p className="text-sm text-gray-600 flex items-center gap-1.5 font-mono">
                    <ClockIcon className="h-4 w-4" />
                    {item.creation ? new Date(item.creation).toLocaleString() : "N/A"}
                  </p>
                </div>
                <div className="text-base text-gray-800 prose prose-sm max-w-none leading-relaxed font-mono"
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

// --- Workflow Actions Component (Unchanged) ---
const WorkflowActions = ({ docname, onAction, isLoading }: { docname: string; onAction: (action: string) => void; isLoading: boolean; }) => {
  const { data } = useFrappeGetCall<{ message: string[] }>(
    "rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_available_workflow_actions",
    { docname }
  );
  if (!data?.message || data.message.length === 0) return null;
  return (
    <div className="flex items-center gap-3">
      {data.message.map((actionString: string) => (
        <NeoButton key={actionString} onClick={() => onAction(actionString)} className={cn(/* ... */)} disabled={isLoading}>
          {isLoading ? "Processing..." : actionString}
        </NeoButton>
      ))}
    </div>
  );
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

  const handleWorkflowAction = useCallback(/* ... unchanged ... */);
  const isCurrentUserPI = currentUser && data?.pi_webmail === currentUser;
  
  const handleAddFunds = () => alert("Add Funds functionality will be implemented here.");
  const handleAddSanctionDetails = () => navigate('/add-fund-sanction');

  // UPDATED: Tabs array with Activity Log
  const tabs = [
    { id: "overview", label: "Overview", icon: FileTextIcon },
    { id: "sanction-details", label: "Sanction Details", icon: CreditCardIcon },
    { id: "activity", label: "Activity Log", icon: MessageSquareIcon },
  ];

  const renderContent = () => {
    if (isLoading) { /* ... Loading State ... */ }
    if (error) { /* ... Error State ... */ }

    return (
      <>
        <header className="mb-8 p-4 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
          <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/projects-view")}
                className="p-3 bg-white border-2 border-black rounded-md hover:bg-[#90A4AE] active:translate-y-1 transition-transform"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-3xl font-extrabold text-black">{data?.project_title || "Project Details"}</h1>
                <p className="text-gray-700 font-mono mt-1">ID: {projectName} | Status: <span className="font-bold text-black">{data?.workflow_state || "Draft"}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {isCurrentUserPI && (
                <div className="flex gap-3">
                  <NeoButton
                    onClick={handleAddFunds}
                     className="bg-[#A5D6A7] hover:bg-[#81C784] flex items-center gap-2"
                  >
                    <PlusIcon className="h-4 w-4" /> Add Funds
                  </NeoButton>
                  <NeoButton
                    onClick={handleAddSanctionDetails}
                     className="bg-[#A5D6A7] hover:bg-[#81C784] flex items-center gap-2"
                  >
                    <FilePlusIcon className="h-4 w-4" /> Add Sanction
                  </NeoButton>
                </div>
              )}
              <WorkflowActions docname={projectName!} onAction={handleWorkflowAction} isLoading={isActionLoading} />
            </div>
          </div>
        </header>

        {/* --- Tab Navigation and Content --- */}
        <div className="bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
          <div className="border-b-2 border-black">
            <nav className="flex space-x-2 p-2 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex-shrink-0 flex items-center gap-2 py-3 px-4 font-bold text-sm rounded-md border-2 border-transparent transition-all",
                    activeTab === tab.id
                      ? "bg-[#90A4AE] border-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"
                      : "text-black hover:bg-[#CFD8DC]"
                  )}
                >
                  <tab.icon className="h-5 w-5" /> {tab.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="bg-[#F5F5F5] p-6 md:p-8">
            {activeTab === "overview" && (
              <div className="space-y-8">
                {/* --- General Information Section --- */}
                <SectionWrapper title="General Information" icon={FileTextIcon}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 divide-y md:divide-y-0">
                    <FieldDisplay label="Project Type" value={data?.project_type} icon={FileTextIcon} />
                    <FieldDisplay label="Implementation Dept" value={data?.implementation_department} icon={BuildingIcon} />
                    <FieldDisplay label="Status" value={data?.workflow_state} icon={TargetIcon} />
                    <FieldDisplay label="Project Duration" value={`${data?.project_duration_months}m ${data?.project_duration_days || 0}d`} icon={CalendarIcon}/>
                    <FieldDisplay label="International Travel" value={data?.involves_international_travel} icon={PlaneIcon} />
                  </div>
                </SectionWrapper>
                
                {/* --- Funding Agency Section --- */}
                <SectionWrapper title="Funding Agency" icon={BuildingIcon}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 divide-y md:divide-y-0">
                    <FieldDisplay label="Agency Name" value={data?.funding_agen} icon={BuildingIcon} />
                    <FieldDisplay label="Agency Type" value={data?.funding_agency_type} icon={UsersIcon} />
                    <FieldDisplay label="Origin" value={data?.origin_of_funding_agency} icon={GlobeIcon} />
                    <FieldDisplay label="Ministry" value={data?.funding_agency_ministry} icon={BuildingIcon} />
                    <FieldDisplay label="Scheme" value={data?.funding_agency_schemes} icon={FileTextIcon} />
                    <FieldDisplay label="Address" value={`${data?.address_street_village_locality}, ${data?.address_state}, ${data?.address_country} - ${data?.address_postal_code}`} icon={MapPinIcon}/>
                  </div>
                </SectionWrapper>

                {/* --- Investigators Section --- */}
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
                {data?.is_additional_pi === "Yes" && <TableDisplay label="Additional PIs" data={data?.additional_pi_table} columns={[ { fieldname: "pi_name", label: "Name" }, { fieldname: "pi_designation", label: "Designation" }, { fieldname: "pi_email", label: "Email" }, ]} icon={UsersIcon} />}
                {data?.has_co_pi === "Yes" && <TableDisplay label="Co-Investigators" data={data?.co_investigator_table} columns={[ { fieldname: "copi_name", label: "Name" }, { fieldname: "copi_designation", label: "Designation" }, { fieldname: "copi_email", label: "Email" }, ]} icon={UsersIcon} />}
                
                {/* --- Funding & Budget Section --- */}
                <TableDisplay label="Proposed Budget Breakup" data={data?.proposed_budget_breakup} columns={[ { fieldname: "account_head", label: "Budget Head" }, { fieldname: "first_year_budget", label: "Year 1" }, { fieldname: "second_year_budget", label: "Year 2" }, ]} icon={DollarSignIcon} />
                {data?.equipment_checkbox === 1 && <TableDisplay label="Proposed Equipment" data={data?.proposed_equipment_details} columns={[ { fieldname: "item_name", label: "Equipment Name" }, { fieldname: "equip_total_unit_cost", label: "Cost" }, ]} icon={ShoppingCartIcon} />}
                {data?.manpower_checkbox === 1 && <TableDisplay label="Proposed Manpower" data={data?.proposed_manpower_details} columns={[ { fieldname: "designation_name", label: "Position" }, { fieldname: "manpower_salary", label: "Salary" }, ]} icon={UsersGroupIcon} />}
                
                {/* --- HTML Content Section --- */}
                <HtmlContent title="Executive Summary" htmlString={data?.executive_summary} icon={FileTextIcon} />
                <HtmlContent title="Project Objective" htmlString={data?.project_objective} icon={TargetIcon} />
                <HtmlContent title="Project Deliverables" htmlString={data?.project_deliverables} icon={CheckCircleIcon} />
                
                {/* --- Clearance Section --- */}
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
                <TableDisplay
                  label="Sanction Details"
                  data={data?.sanction_details_table}
                  columns={[ { fieldname: 'sanction_date', label: 'Sanction Date' }, { fieldname: 'sanction_amount', label: 'Amount' }, { fieldname: 'sanction_letter', label: 'Sanction Letter' }, { fieldname: 'status', label: 'Status' } ]}
                  icon={CreditCardIcon}
                />
                {(!data?.sanction_details_table || data.sanction_details_table.length === 0) && (
                  <div className="text-center py-12 text-gray-600 border-2 border-dashed border-black rounded-md bg-white">
                    <CreditCardIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="font-bold text-lg">No Sanction Details Found</p>
                    <p className="text-sm mt-1">Add sanction details to see them here.</p>
                  </div>
                )}
              </div>
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
      </>
    );
  };

  return (
    <div className="bg-[#FDFCEC]">
      <AppSidebar isPermanentEmployee={true} />
      <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
        {renderContent()}
      </main>
    </div>
  );
};

export default ProjectDetailsOverview;