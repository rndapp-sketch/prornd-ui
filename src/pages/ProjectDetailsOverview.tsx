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
  CreditCard, Upload, ShoppingCart, Plane, ZapIcon, Users, Settings, FileSpreadsheet as LedgerIcon,
  ExternalLinkIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DepartmentName } from "@/components/DepartmentName";
import { useUserRoles } from "../components/UserRole";

// --- Ledger Interfaces ---
interface LedgerTransaction {
  transactionType: string;
  transactionId: number;
  transactionDate: string;
  particulars: string;
  refDetails: string;
  fundReceivedAmount: number | null;
  commitAmount: number | null;
  paymentAmount: number | null;
  commitableBalance: number;
  paymentBalance: number;
  balance: number;
  status: string;
  bmr: string | null;
  bankTransactionNumber: string | null;
  bankTransactionDate: string | null;
}

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
      <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{value}</p>
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

// --- COMMENT MODAL for Sanction/Workflow Actions ---
const CommentModal = ({ isOpen, onClose, onSubmit, action, isLoading }: {
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
      <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-lg w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm {action}</h3>
        <textarea
          className="w-full border border-gray-300 p-3 rounded-lg text-sm mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-[#0EA5A4]/25 focus:border-[#0EA5A4]"
          rows={4}
          placeholder="Add a comment (optional)..."
          value={comment}
          onChange={e => setComment(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => { onSubmit(comment); setComment(""); }}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-[#0EA5A4] rounded-lg hover:bg-[#0C8F8E] disabled:opacity-50"
          >
            {isLoading ? "Processing..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- START: REFACTORED QuickActions COMPONENT ---

interface QuickActionsProps {
  projectName: string;
  onNavigate: (path: string) => void;
}

const QuickActions = ({ projectName, onNavigate }: QuickActionsProps) => {
  const [activeTab, setActiveTab] = useState("Reimbursement");
  const [selectedApplication, setSelectedApplication] = useState<string | null>("Reimbursement"); // Auto-select Reimbursement initially
  const [applicationData, setApplicationData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const groups = [
    { title: "Reimbursement", icon: IndianRupeeIcon, items: ["Reimbursement"] },
    { title: "Advance", icon: CreditCard, items: ["Temporary Advance Apply"] },
    { title: "Disbursal", icon: Upload, items: ["One Time Assistantship", "Top Up Fellowship"] },
    { title: "Purchase", icon: ShoppingCart, items: ["Direct Purchase", "General Indent", "Generate NIQ", "Indent cum Sanction", "Rate Contract"] },
    { title: "Recruitment", icon: Users, items: ["Adhoc", "Committee Member Change", "Contractual", "Selection Committee Report", "Project Staff Resignation"] },
    { title: "Travel", icon: Plane, items: ["Travel"] },
    { title: "Utilities", icon: Settings, items: ["Add New User", "Application History", "Form Tracking", "Incharge Assignment"] },
  ];

  // Frappe SDK hooks for fetching data
  const { call: fetchReimbursements } = useFrappePostCall<{ message: any[] }>(
    'frappe.client.get_list'
  );

  // Fetch data when application is selected
  useEffect(() => {
    console.log('>>> useEffect triggered. selectedApplication:', selectedApplication, 'projectName:', projectName);

    const fetchApplicationData = async () => {
      if (!selectedApplication || !projectName) {
        console.log('>>> Early return - missing selectedApplication or projectName');
        setApplicationData([]);
        return;
      }

      setIsLoading(true);
      try {
        let data: any[] = [];

        if (selectedApplication === "Reimbursement") {
          console.log('=== FETCHING REIMBURSEMENTS ===');
          console.log('Project Name from URL:', projectName);

          try {
            // Use direct fetch to Frappe REST API with cache-busting
            const timestamp = Date.now();
            const apiUrl = `/api/resource/Reimbursement?fields=["name","creation","workflow_state","owner","project_name","project_number","applicant_webmail","comment"]&order_by=creation desc&limit_page_length=0&_=${timestamp}`;

            const fetchResponse = await fetch(apiUrl, {
              method: 'GET',
              headers: { 'Accept': 'application/json' },
              credentials: 'include'
            });

            if (!fetchResponse.ok) {
              throw new Error(`HTTP error! status: ${fetchResponse.status} `);
            }

            const result = await fetchResponse.json();
            console.log('API Response:', result);

            const allReimbursements = result?.data || [];
            console.log('All Reimbursements count:', allReimbursements.length);
            console.log('All Reimbursements data:', allReimbursements);

            // Log first few items to see field values
            if (allReimbursements.length > 0) {
              console.log('Sample reimbursement items:', allReimbursements.slice(0, 3).map((item: any) => ({
                name: item.name,
                project_name: item.project_name,
                project_number: item.project_number
              })));
            }

            // Filter client-side: match project_name OR project_number (case-insensitive, partial match)
            const projectNameLower = projectName?.toLowerCase() || '';
            data = allReimbursements.filter((item: any) => {
              const itemProjectName = (item.project_name || '').toLowerCase();
              const itemProjectNumber = (item.project_number || '').toLowerCase();

              // Check for exact match or contains
              const matches =
                itemProjectName === projectNameLower ||
                itemProjectNumber === projectNameLower ||
                itemProjectName.includes(projectNameLower) ||
                itemProjectNumber.includes(projectNameLower) ||
                projectNameLower.includes(itemProjectName) ||
                projectNameLower.includes(itemProjectNumber);

              return matches;
            });
            console.log('Filtered Reimbursement data:', data);
          } catch (fetchError) {
            console.error('Direct fetch error:', fetchError);
            data = [];
          }
        } else if (selectedApplication === "Project Staff Resignation") {
          const response = await fetchReimbursements({
            doctype: "Project Staff Resignation",
            filters: { project_name: projectName },
            fields: ["name", "creation", "docstatus", "owner", "applicant_name", "applicant_email_id"],
            order_by: "creation desc",
            limit_page_length: 50
          });
          data = (response?.message || []).map((item: any) => ({
            ...item,
            workflow_state: item.docstatus === 1 ? "Submitted" : item.docstatus === 2 ? "Cancelled" : "Draft",
            applicant_webmail: item.applicant_email_id // Map for display consistency
          }));
        } else if (selectedApplication === "Temporary Advance Apply") {
          try {
            console.log('=== FETCHING TEMPORARY ADVANCE (MINIMAL RETRY) ===');
            // Minimal fields to debug 417 - ensure URL is perfect
            const apiUrl = `/api/resource/Temporary Advance?fields=["name","creation"]&limit_page_length=0`;
            const fetchResponse = await fetch(apiUrl, {
              method: 'GET',
              headers: { 'Accept': 'application/json' },
              credentials: 'include'
            });
            if (!fetchResponse.ok) throw new Error(`HTTP error! status: ${fetchResponse.status} `);
            const result = await fetchResponse.json();
            const allItems = result?.data || [];
            console.log('Temporary Advance raw items (minimal):', allItems);

            // For now, allow all items through to see if we get ANY data
            data = allItems;

            // Loose matching like Reimbursement
            const projectNameLower = projectName?.toLowerCase() || '';
            data = allItems.filter((item: any) => {
              // Check project_name
              const pName = (item.project_name || '').toLowerCase();

              return pName === projectNameLower ||
                pName.includes(projectNameLower) ||
                projectNameLower.includes(pName);
            });
            console.log('Filtered Temporary Advance items:', data);
          } catch (fetchError) {
            console.error('Temporary Advance fetch error:', fetchError);
            data = [];
          }
        } else if (selectedApplication === "Rate Contract") {
          try {
            const apiUrl = `/api/resource/Rate Contract?fields=["name","creation","workflow_state","owner","project_name","email_id"]&order_by=creation desc&limit_page_length=0`;
            const fetchResponse = await fetch(apiUrl, {
              method: 'GET',
              headers: { 'Accept': 'application/json' },
              credentials: 'include'
            });
            if (!fetchResponse.ok) throw new Error(`HTTP error! status: ${fetchResponse.status} `);
            const result = await fetchResponse.json();
            const allItems = result?.data || [];
            data = allItems.filter((item: any) =>
              item.project_name === projectName
            ).map((item: any) => ({
              ...item,
              applicant_webmail: item.email_id
            }));
          } catch (fetchError) {
            console.error('Rate Contract fetch error:', fetchError);
            data = [];
          }
        } else if (selectedApplication === "Travel") {
          try {
            // Fetch both Travel Apply and TA DA Settlement
            const travelPromise = fetch(`/api/resource/Travel?fields=["name","creation","workflow_state","owner","travel_project_number","webmail_id_travel","applicant_name_travel"]&order_by=creation desc&limit_page_length=0`, {
              method: 'GET',
              headers: { 'Accept': 'application/json' },
              credentials: 'include'
            }).then(res => res.ok ? res.json() : { data: [] });

            const settlementPromise = fetch(`/api/resource/TA DA Settlement?fields=["name","creation","workflow_state","owner","ta_da_project_code","ta_da_name"]&order_by=creation desc&limit_page_length=0`, {
              method: 'GET',
              headers: { 'Accept': 'application/json' },
              credentials: 'include'
            }).then(res => res.ok ? res.json() : { data: [] });

            const [travelRes, settlementRes] = await Promise.all([travelPromise, settlementPromise]);

            const travelItems = (travelRes.data || [])
              .filter((item: any) => item.travel_project_number === projectName)
              .map((item: any) => ({
                ...item,
                applicant_webmail: item.webmail_id_travel,
                type: 'Travel Apply'
              }));

            const settlementItems = (settlementRes.data || [])
              .filter((item: any) => item.ta_da_project_code === projectName)
              .map((item: any) => ({
                ...item,
                applicant_webmail: item.ta_da_name,
                type: 'TA DA Settlement'
              }));

            // Combine and sort by creation date desc
            data = [...travelItems, ...settlementItems].sort((a, b) =>
              new Date(b.creation).getTime() - new Date(a.creation).getTime()
            );
          } catch (fetchError) {
            console.error('Travel combined fetch error:', fetchError);
            data = [];
          }
        }

        setApplicationData(data);
      } catch (err) {
        console.error('Error fetching application data:', err);
        setApplicationData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchApplicationData();
  }, [selectedApplication, projectName]);

  const ActionButton = ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button
      onClick={onClick}
      className={cn(
        "w-full justify-start text-left text-sm font-medium text-gray-700",
        "px-4 py-3 rounded-lg bg-white border border-gray-200",
        "shadow-sm transition-all duration-150",
        "hover:shadow-md hover:border-[#0EA5A4]/20 hover:text-[#0EA5A4]",
        "focus:outline-none focus:ring-2 focus:ring-[rgba(14,165,164,0.18)]"
      )}>
      {children}
    </button>
  );

  const activeGroup = groups.find(g => g.title === activeTab);

  // Handle tab change - auto-select for single-item tabs
  const handleTabChange = (tabTitle: string) => {
    setActiveTab(tabTitle);
    const group = groups.find(g => g.title === tabTitle);
    if (group && group.items.length === 1) {
      // Auto-select the only item in this tab
      setSelectedApplication(group.items[0]);
    } else {
      // Reset selection for multi-item tabs
      setSelectedApplication(null);
      setApplicationData([]);
    }
  };

  const handleApplicationClick = (item: string) => {
    setSelectedApplication(item);
  };

  const handleBack = () => {
    const group = groups.find(g => g.title === activeTab);
    if (group && group.items.length === 1) {
      // For single-item tabs, don't clear - stay on the view
      return;
    }
    setSelectedApplication(null);
    setApplicationData([]);
  };

  const handleApplyNew = () => {
    // Navigate based on application type
    switch (selectedApplication) {
      case "Reimbursement":
        onNavigate(`/ reimbursement ? project = ${projectName} `);
        break;
      case "Temporary Advance Apply":
        onNavigate(`/ temporary - advance ? project = ${projectName} `);
        break;
      case "Rate Contract":
        onNavigate(`/ rate - contract ? project = ${projectName} `);
        break;
      case "Travel Apply":
        onNavigate(`/ travel ? project = ${projectName} `);
        break;
      case "TA DA Settlement":
        onNavigate(`/ ta - da - settlement ? project = ${projectName} `);
        break;
      case "Project Staff Resignation":
        onNavigate(`/ project - staff - resignation ? project = ${projectName} `);
        break;
      default:
        alert(`Apply New: ${selectedApplication} - Route not configured yet`);
    }
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Table view for selected application
  if (selectedApplication) {
    // Check if current tab is single-item (hide back button for these)
    const currentGroup = groups.find(g => g.title === activeTab);
    const isSingleItemTab = currentGroup && currentGroup.items.length === 1;

    return (
      <div className="p-5 bg-gray-50/50 rounded-xl">
        {/* Tab Header - Always visible */}
        <div className="mb-5">
          <nav className="frappe-tabs" aria-label="Quick actions tabs">
            {groups.map((group) => {
              const Icon = group.icon;
              const isActive = activeTab === group.title;
              return (
                <button
                  key={group.title}
                  onClick={() => handleTabChange(group.title)}
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

        {/* Header with back button and Apply New */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {!isSingleItemTab && (
              <button
                onClick={handleBack}
                className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600 rotate-180" />
              </button>
            )}
            <h3 className="text-lg font-semibold text-gray-900">{selectedApplication}</h3>
          </div>
          {selectedApplication === "Travel" ? (
            <div className="flex gap-2">
              <button
                onClick={() => onNavigate(`/ travel ? project = ${projectName} `)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm",
                  "bg-[#0EA5A4] text-white hover:bg-[#0D9494]",
                  "shadow-sm transition-all duration-150"
                )}
              >
                <Plus className="w-4 h-4" />
                Travel Apply
              </button>
              {/* <button
                onClick={() => onNavigate(`/ ta - da - settlement ? project = ${ projectName } `)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm",
                  "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50",
                  "shadow-sm transition-all duration-150"
                )}
              >
                <Plus className="w-4 h-4" />
                Settlement
              </button> */}
            </div>
          ) : (
            <button
              onClick={handleApplyNew}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm",
                "bg-[#0EA5A4] text-white hover:bg-[#0D9494]",
                "shadow-sm transition-all duration-150"
              )}
            >
              <Plus className="w-4 h-4" />
              Apply New
            </button>
          )}
        </div>

        {/* Applications Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0EA5A4] mx-auto"></div>
              <p className="mt-4 text-sm text-gray-500">Loading applications...</p>
            </div>
          ) : applicationData.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Application ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Applicant</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {applicationData.map((item: any, index: number) => (
                  <tr key={item.name || index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(item.creation)}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.applicant_webmail || item.owner}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex px-2 py-1 text-xs font-medium rounded-full",
                        item.workflow_state === "Approved" && "bg-green-100 text-green-700",
                        item.workflow_state === "Pending" && "bg-yellow-100 text-yellow-700",
                        item.workflow_state === "Rejected" && "bg-red-100 text-red-700",
                        item.workflow_state === "Draft" && "bg-gray-100 text-gray-700",
                        !["Approved", "Pending", "Rejected", "Draft"].includes(item.workflow_state) && "bg-blue-100 text-blue-700"
                      )}>
                        {item.workflow_state || 'Draft'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            switch (selectedApplication) {
                              case "Project Staff Resignation":
                                onNavigate(`/project-staff-resignation?edit=${item.name}`);
                                break;
                              case "Temporary Advance Apply":
                                // Navigate to the new details page
                                onNavigate(`/temporary-advance/${item.name}`);
                                break;
                              case "Rate Contract":
                                onNavigate(`/rate-contract?edit=${item.name}`);
                                break;
                              case "Reimbursement":
                                onNavigate(`/reimbursement/${item.name}`);
                                break;
                              case "Travel": // Fallback
                              case "Travel Apply":
                                onNavigate(`/travel?edit=${item.name}`);
                                break;
                              case "TA DA Settlement":
                                onNavigate(`/ta-da-settlement?edit=${item.name}`);
                                break;
                              default:
                                // Check item.type for Travel consolidated view
                                if (item.type === 'Travel Apply') {
                                  onNavigate(`/travel?edit=${item.name}`);
                                } else if (item.type === 'TA DA Settlement') {
                                  onNavigate(`/ta-da-settlement?edit=${item.name}`);
                                } else {
                                  onNavigate(`/reimbursement/${item.name}`);
                                }
                                break;
                            }
                          }}
                          className="text-sm text-[#0EA5A4] hover:underline whitespace-nowrap"
                        >
                          View
                        </button>
                        {(selectedApplication === "Travel" && item.type === 'Travel Apply') && (
                          <button
                            onClick={() => onNavigate(`/ta-da-settlement?project=${projectName}&travel_id=${item.name}`)}
                            className="text-sm text-gray-600 hover:text-gray-900 hover:underline whitespace-nowrap"
                          >
                            Settle
                          </button>
                        )}
                        {selectedApplication === "Temporary Advance Apply" && (
                          <button
                            onClick={() => {
                              // Navigate to settlement page for this temporary advance
                              // Pass the advance ID to pre-fill the settlement form
                              onNavigate(`/ta-da-settlement?advance_id=${item.name}&project=${projectName}`);
                            }}
                            className="text-sm text-amber-600 hover:underline whitespace-nowrap font-medium"
                          >
                            Settle
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <FileTextIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-1">No applications yet</h4>
              <p className="text-sm text-gray-500 mb-4">
                You haven't submitted any {selectedApplication?.toLowerCase()} applications for this project.
              </p>
              <button
                onClick={handleApplyNew}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm",
                  "bg-[#0EA5A4] text-white hover:bg-[#0D9494]",
                  "shadow-sm transition-all duration-150"
                )}
              >
                <Plus className="w-4 h-4" />
                Apply New
              </button>
            </div>
          )}
        </div>
      </div >
    );
  }

  // Category selection view
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
                onClick={() => handleTabChange(group.title)}
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
            <ActionButton key={item} onClick={() => handleApplicationClick(item)}>
              {item}
            </ActionButton>
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
              key={`${item.creation} -${index} `}
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

  const { roles } = useUserRoles(currentUser ?? null);
  const isRnDStaff = roles.some((r: string) =>
    r === "RnD Staff" || r === "R&D Staff" || r === "Research and Development Staff" || r === "System Manager" || r === "staff, RnD" || r === "Hos, RnD (Head of Section, RnD)"
  );
  // console.log("User Roles:", roles, "Is RnD Staff:", isRnDStaff);

  const { data: sanctionData, error: sanctionError, isLoading: sanctionIsLoading, mutate: refetchSanctions } = useFrappeGetCall(
    'rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.get_sanctions_for_project',
    { project_name: projectName },
    { revalidateOnFocus: false }
  );

  // Fetch Fund Received Data
  const fundQueryParams = useMemo(() => ({
    prjreg_title: projectName || "",
    limit: 200,
    start: 0,
  }), [projectName]);

  const fundQueryOptions = useMemo(() => ({
    revalidateOnFocus: false,
    isPaused: () => !projectName
  }), [projectName]);

  const { data: fundReceivedData } = useFrappeGetCall(
    "rndopsapp.rndopsapp.doctype.fund_received.fund_received.get_fund_received_by_prjreg",
    fundQueryParams,
    fundQueryOptions
  );

  const { data: activityData } = useFrappeGetCall<{ message: ActivityItem[] }>(
    "rndopsapp.rndopsapp.api.get_project_activity",
    { doctype: "Project Registration", docname: projectName }
  );

  // --- Budget State ---
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [commitHead, setCommitHead] = useState("Travel");
  const [commitAmount, setCommitAmount] = useState("");
  const [budgetData, setBudgetData] = useState<BudgetEntry[]>([]);
  const [manualCommitments, setManualCommitments] = useState<BudgetEntry[]>([]); // Track manual commitments
  const [sidebarComment, setSidebarComment] = useState("");
  const [selectedSanctionIndex, setSelectedSanctionIndex] = useState(0);
  const [activeLedgerTab, setActiveLedgerTab] = useState("All"); // Tab filter for ledger by head

  // --- Modal State for Sanction Submit ---
  const [sanctionModalOpen, setSanctionModalOpen] = useState(false);
  const [selectedSanctionName, setSelectedSanctionName] = useState("");

  // Extract unique heads from budget data for tabs
  const ledgerHeadTabs = useMemo(() => {
    const heads = new Set<string>();
    budgetData.forEach((entry: any) => {
      const head = entry.head || entry.accountHead;
      if (head) heads.add(head);
    });
    return ["All", ...Array.from(heads).sort()];
  }, [budgetData]);

  // Filter budget data based on selected ledger tab
  const filteredLedgerData = useMemo(() => {
    if (activeLedgerTab === "All") return budgetData;
    return budgetData.filter((entry: any) => {
      const head = (entry.head || entry.accountHead || "").trim().toLowerCase();
      return head === activeLedgerTab.toLowerCase();
    });
  }, [budgetData, activeLedgerTab]);

  // Set default commitHead when heads become available
  useEffect(() => {
    const availableHeads = ledgerHeadTabs.filter(h => h !== "All");
    if (availableHeads.length > 0 && !availableHeads.includes(commitHead)) {
      setCommitHead(availableHeads[0]);
    }
  }, [ledgerHeadTabs]);

  // API call for adding comment
  const { call: addComment, loading: isAddingComment } = useFrappePostCall("rndopsapp.rndopsapp.api.add_project_comment");

  // --- LEDGER STATE & API ---
  const [ledgerTransactions, setLedgerTransactions] = useState<LedgerTransaction[]>([]);
  const [isLedgerLoading, setIsLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState<string | null>(null);

  // Fetch Budget Heads from Frappe v2 API
  const [budgetHeadList, setBudgetHeadList] = useState<{ name: string; id: number }[]>([]);
  const [isBudgetHeadLoading, setIsBudgetHeadLoading] = useState(true);

  useEffect(() => {
    const fetchBudgetHeads = async () => {
      try {
        const response = await fetch('/api/v2/document/Budget%20Head?fields=["budget_head","id"]&order_by=id%20asc');
        const result = await response.json();
        console.log("Budget Head v2 API data:", result);
        if (result?.data) {
          setBudgetHeadList(result.data.map((item: any) => ({
            name: item.budget_head,
            id: item.id
          })));
        }
      } catch (err) {
        console.error("Failed to fetch Budget Heads:", err);
      } finally {
        setIsBudgetHeadLoading(false);
      }
    };
    fetchBudgetHeads();
  }, []);

  // Use budgetHeadList for ledger tabs
  const ledgerHeads = budgetHeadList;

  // Track selected head by ID
  const [activeLedgerHeadId, setActiveLedgerHeadId] = useState<string | number>('');

  // Set default active Ledger Head once data is loaded
  useEffect(() => {
    if (ledgerHeads.length > 0 && !activeLedgerHeadId) {
      setActiveLedgerHeadId(ledgerHeads[0].id);
    }
  }, [ledgerHeads]);

  // Fetch Ledger Data when tab/head changes
  useEffect(() => {
    console.log("Ledger useEffect - activeTab:", activeTab, "activeLedgerHeadId:", activeLedgerHeadId);
    if (activeTab === 'ledger' && activeLedgerHeadId) {
      fetchLedgerData(activeLedgerHeadId);
    }
  }, [activeTab, activeLedgerHeadId]);

  const fetchLedgerData = async (headId: string | number) => {
    setIsLedgerLoading(true);
    setLedgerError(null);
    try {
      // Use proxy to avoid CORS - /ledger-api proxies to http://172.16.135.27:18083/api
      const response = await fetch(`/ledger-api/commit-payment-transactions?projectNumber=${projectName}&accountHeadId=${headId}`);
      console.log("Ledger API response status:", response, "for projectNumber:", projectName, "headId:", headId);
      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText} `);
      }

      const result = await response.json();
      setLedgerTransactions(Array.isArray(result) ? result : []);
    } catch (err: any) {
      console.error("Ledger API Error:", err);
      // Fallback/Mock data if needed, or just show error
      setLedgerError(err.message || "Failed to load ledger data");
      setLedgerTransactions([]);
    } finally {
      setIsLedgerLoading(false);
    }
  };

  // Process Fund Received Data and Manual Commitments into Budget Ledger
  useEffect(() => {
    const funds = normalizeResponse(fundReceivedData);
    let rawEntries: BudgetEntry[] = [];

    // 1. Process API Funds
    if (funds && funds.length > 0) {
      funds.forEach((fund: any) => {
        if (fund.received_amt_breakup && Array.isArray(fund.received_amt_breakup)) {
          fund.received_amt_breakup.forEach((item: any) => {
            rawEntries.push({
              sl: 0, // Assigned later
              date: fund.transaction_date || fund.modified?.split(" ")[0] || "",
              particulars: `Fund Received - ${item.account_head} `,
              ref: fund.sanction_ref_no || fund.name,
              received: item.amount_received,
              committed: 0,
              commitableBalance: 0, // Calc later
              bmr: "",
              payment: 0,
              actualBalance: 0, // Calc later
              type: 'transaction',
              accountHead: item.account_head
            } as BudgetEntry & { accountHead?: string });
          });
        }
      });
    }

    // 2. Combine with Manual Commitments
    // We assume chronological order: Funds first, then commitments. 
    // You could sort by date here if 'manualCommitments' have dates interleaved with funds.
    // For now, appending manual commitments as per user workflow.
    const allRawEntries = [...rawEntries, ...manualCommitments];

    // 3. Calculate Running Totals
    let runningFundTotal = 0; // Global for Actual Balance
    const headFundTotals: Record<string, number> = {};
    const headCommitTotals: Record<string, number> = {};
    const headPaymentTotals: Record<string, number> = {};
    const headActualTotals: Record<string, number> = {}; // Per-head running actual balance

    const calculatedEntries = allRawEntries.map((entry, idx) => {
      // Determine Head
      // Funds have accountHead. Commitments have head.
      let head = (entry as any).head || (entry as any).accountHead;

      // Fallback parsing if head is missing (e.g. from older state or particulars)
      if (!head) {
        if (entry.particulars.startsWith("Commitment for ")) {
          head = entry.particulars.replace("Commitment for ", "").trim();
        } else if (entry.particulars.startsWith("Fund Received - ")) {
          head = entry.particulars.replace("Fund Received - ", "").trim();
        }
      }
      head = head || "Unspecified";

      if (entry.type === 'transaction') {
        runningFundTotal += (entry.received || 0);
        headFundTotals[head] = (headFundTotals[head] || 0) + (entry.received || 0);
        headActualTotals[head] = (headActualTotals[head] || 0) + (entry.received || 0) - (entry.payment || 0);
      } else if (entry.type === 'commitment') {
        // Commitments don't affect Actual Bal (only received - payment)
        headCommitTotals[head] = (headCommitTotals[head] || 0) + (entry.committed || 0);
      }

      // Track payments
      headPaymentTotals[head] = (headPaymentTotals[head] || 0) + (entry.payment || 0);

      // Per-Head Commitable Balance = Received - Committed - Payment
      const currentHeadBalance = (headFundTotals[head] || 0) - (headCommitTotals[head] || 0) - (headPaymentTotals[head] || 0);

      // Per-Head Actual Balance = Received - Payment (no commitments)
      const headActualBalance = (headFundTotals[head] || 0) - (headPaymentTotals[head] || 0);

      return {
        ...entry,
        sl: idx + 1,
        actualBalance: runningFundTotal, // Global Running Total
        headActualBalance: headActualBalance, // Per-Head Actual Balance
        commitableBalance: currentHeadBalance, // Specific Head Balance
        head: head // Persist resolved head
      };
    });

    setBudgetData(calculatedEntries);
  }, [JSON.stringify(fundReceivedData), manualCommitments]);


  // Calculate balances based on selected Commit Head
  // Filter budget data for the selected head to calculate specific balance
  const filteredBudgetData = budgetData.filter((entry: any) => {
    const entryHead = (entry.head || entry.accountHead || "").trim().toLowerCase();
    const selectedHead = commitHead.trim().toLowerCase();
    const match = (entryHead === selectedHead) ||
      (entry.particulars.toLowerCase().includes(selectedHead));
    return match;
  });

  // Sidebar Balances (re-derived from filtered ledger data) - for commit section
  const filteredActualBalance = filteredBudgetData.reduce((acc, entry) => acc + (entry.received || 0) - (entry.payment || 0), 0);

  const filteredCommitableBalance = filteredBudgetData.reduce((acc, entry) => {
    return acc + (entry.received || 0) - (entry.committed || 0) - (entry.payment || 0);
  }, 0);

  // Total project balances from Frappe API - for header display
  // Memoize params and options to prevent infinite re-renders
  const balanceParams = useMemo(() => ({ project_number: projectName || '' }), [projectName]);
  const balanceOptions = useMemo(() => ({
    revalidateOnFocus: false,
    isPaused: () => !projectName
  }), [projectName]);

  const { data: projectAmounts, isLoading: isBalanceLoading, error: balanceError } = useFrappeGetCall<{
    message: {
      status: string;
      data: {
        projectNumber: string;
        totalFundReceived: number;
        totalCommitted: number;
        totalPaid: number;
        availableCommitAmount: number;  // This is the "Actual Balance"
        availablePaymentAmount: number; // This is the "Commitable"
      }
    };
  }>(
    'rndopsapp.rndopsapp.commitPayment.get_project_available_amounts',
    balanceParams,
    balanceOptions
  );

  // Extract balance values from API response
  // Note: useFrappeGetCall may unwrap 'message' automatically in some versions, so check both paths
  const projectData = (projectAmounts as any)?.message?.data ?? (projectAmounts as any)?.data ?? {};
  const actualBalance = projectData?.availableCommitAmount ?? 0;
  const commitableBalance = projectData?.availablePaymentAmount ?? 0;

  // Debug logging
  console.log('[ProjectDetailsOverview] Current projectName:', projectName);
  console.log('[ProjectDetailsOverview] Balance Query API status:', { isLoading: isBalanceLoading, error: balanceError, hasData: !!projectAmounts });
  console.log('[ProjectDetailsOverview] projectAmounts API response:', projectAmounts);
  console.log('[ProjectDetailsOverview] actualBalance:', actualBalance, 'commitableBalance:', commitableBalance);

  const handleCommit = () => {
    const amount = parseFloat(commitAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    const newEntry: BudgetEntry & { _id: number; head: string } = {
      sl: 0, // Recalculated in effect
      date: new Date().toLocaleDateString('en-GB').replace(/\//g, '.'),
      particulars: `Commitment for ${commitHead}`,
      ref: '',
      received: 0,
      committed: amount,
      commitableBalance: 0, // Recalculated in effect
      bmr: '',
      payment: 0,
      actualBalance: 0, // Recalculated in effect
      type: 'commitment',
      head: commitHead,
      _id: Date.now() // Unique ID for removal
    };

    setManualCommitments(prev => [...prev, newEntry]);
    setCommitAmount("");

  };

  const handleRemoveLastCommit = () => {
    if (manualCommitments.length === 0) {
      alert("No commitments to remove.");
      return;
    }
    setManualCommitments(prev => prev.slice(0, -1));
  };

  const handleRemoveItem = (index: number) => {
    const itemToRemove = budgetData[index];
    if (itemToRemove.type === 'transaction') {
      alert("Cannot remove fund received entries.");
      return;
    }
    // Remove from manualCommitments by matching _id or reference
    // Since manualCommitments is a subset of budgetData, find match
    const manualEntry = itemToRemove as any;
    if (manualEntry._id) {
      setManualCommitments(prev => prev.filter(c => (c as any)._id !== manualEntry._id));
    } else {
      // Fallback if no ID (shouldn't happen for new ones)
      // Try to match specific props
      setManualCommitments(prev => prev.filter(c => c !== itemToRemove && c.sl !== itemToRemove.sl));
    }
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

  const handleSanctionSubmitClick = (sanctionName: string) => {
    setSelectedSanctionName(sanctionName);
    setSanctionModalOpen(true);
  };

  const handleConfirmSanctionSubmit = useCallback(
    async (comment: string) => {
      try {
        await submitSanction({ sanction_name: selectedSanctionName });

        // Add comment as activity if provided
        if (comment && comment.trim()) {
          try {
            await addComment({
              doctype: "Fund Sanction",
              docname: selectedSanctionName,
              content: `[Submit] ${comment.trim()} `
            });
          } catch (commentError) {
            console.error("Error adding comment:", commentError);
            // Don't fail the whole operation if comment fails
          }
        }

        setSanctionModalOpen(false);
        refetchSanctions();
      } catch (error: any) {
        console.error("Error submitting sanction:", error);
        alert("Failed to submit sanction. Please try again.");
      }
    },
    [submitSanction, refetchSanctions, selectedSanctionName, addComment]
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
          console.error(`Error during workflow action: `, err)
        );
    },
    [triggerWorkflowAction, submitProjectRegistration, mutate, projectName]
  );

  const isCurrentUserPI = currentUser && data?.pi_webmail === currentUser;
  const handleAddFunds = () => navigate(`/ add - fund - received / ${projectName}/`);
  const handleAddSanctionDetails = () => {
    navigate(`/project-details-overview/${projectName}/add-fund-sanction`);
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: FileTextIcon },
    { id: "sanction-details", label: "Sanction Details", icon: CreditCardIcon },
    { id: "ledger", label: "Ledger", icon: LedgerIcon }, // Added Ledger Tab
    { id: "quick-actions", label: "Applications", icon: ZapIcon },
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
        <header className="sticky top-0 z-50 mb-6 p-5 bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 shadow-sm transition-all duration-200">
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
              {/* Budget Summary in Header */}
              <div className="hidden lg:flex items-center gap-6 mr-6 border-r border-gray-200 pr-6">
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-0.5">Actual Balance</p>
                  {isBalanceLoading ? (
                    <div className="h-6 w-20 bg-gray-200 animate-pulse rounded" />
                  ) : (
                    <p className="text-lg font-bold text-[#0EA5A4] leading-none">₹ {actualBalance.toLocaleString('en-IN')}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mb-0.5">Commitable</p>
                  {isBalanceLoading ? (
                    <div className="h-6 w-20 bg-gray-200 animate-pulse rounded" />
                  ) : (
                    <p className="text-lg font-bold text-gray-700 leading-none">₹ {commitableBalance.toLocaleString('en-IN')}</p>
                  )}
                </div>
              </div>

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
                    {tab.id === "sanction-details" && (
                      (() => {
                        const draftSanctions = (sanctionData?.message || []).filter((s: any) => (s.sanction_workflow_status || '').toLowerCase() === 'draft').length;
                        const funds = normalizeResponse(fundReceivedData);
                        const draftFunds = funds.filter((f: any) => (f.workflow_state || '').toLowerCase() === 'draft').length;
                        const totalDrafts = draftSanctions + draftFunds;

                        return totalDrafts > 0 ? (
                          <span className="ml-1.5 inline-flex items-center justify-center bg-red-100 text-red-600 text-[10px] font-bold h-4 w-4 rounded-full">
                            {totalDrafts}
                          </span>
                        ) : null;
                      })()
                    )}
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
                      <FieldDisplay label="Implementation Dept" value={data?.implementation_department ? <DepartmentName name={data?.implementation_department} /> : null} icon={BuildingIcon} />
                      <FieldDisplay label="Status" value={data?.sanction_workflow_status} icon={TargetIcon} />
                      <FieldDisplay label="Project Duration" value={`${data?.project_duration_months}m ${data?.project_duration_days || 0}d`} icon={CalendarIcon} />
                      <FieldDisplay label="Start Date" value={data?.prj_start_date} icon={CalendarIcon} />
                      <FieldDisplay label="End Date" value={data?.prj_end_date} icon={CalendarIcon} />
                      <FieldDisplay label="International Travel" value={data?.involves_international_travel} icon={PlaneIcon} />
                      {data?.upload_proj_prop && (
                        <div className="py-2">
                          <div className="flex items-center gap-1.5 mb-1">
                            <FileTextIcon className="h-3.5 w-3.5 text-gray-500" />
                            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Project Proposal</p>
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
                  </SectionWrapper>

                  {/* Consultancy Details */}
                  {data?.project_type === "Consultancy" && (
                    <SectionWrapper title="Consultancy Details" icon={FileTextIcon}>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 divide-y md:divide-y-0">
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
                    </SectionWrapper>
                  )}

                  {/* Other Project Type */}
                  {data?.project_type === "Other" && (
                    <SectionWrapper title="Other Project Details" icon={FileTextIcon}>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
                        <FieldDisplay label="Other Project Type" value={data?.other_project_type_name} icon={FileTextIcon} />
                      </div>
                    </SectionWrapper>
                  )}

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
                      <FieldDisplay label="Department" value={data?.applicant_department ? <DepartmentName name={data?.applicant_department} /> : null} icon={BuildingIcon} />
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
                                      onClick={() => handleSanctionSubmitClick(sanction.name)}
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

              {/* --- LEDGER TAB CONTENT --- */}
              {activeTab === "ledger" && (
                <div className="space-y-6">
                  {/* Ledger Head Tabs */}
                  <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                    <div className="flex space-x-2">
                      {ledgerHeads.length > 0 ? (
                        ledgerHeads.map((head: { name: string; id: string | number }) => (
                          <button
                            key={head.id}
                            onClick={() => setActiveLedgerHeadId(head.id)}
                            className={cn(
                              "px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                              activeLedgerHeadId === head.id
                                ? "bg-[#E0F7F6] text-[#0EA5A4]"
                                : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                            )}
                          >
                            {head.name}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-sm text-gray-500">Loading Budget Heads...</div>
                      )}
                    </div>
                  </div>

                  {/* Ledger Table */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[300px]">
                    {isLedgerLoading ? (
                      <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0EA5A4] mb-4"></div>
                        <p className="text-gray-500">Loading ledger...</p>
                      </div>
                    ) : ledgerError ? (
                      <div className="flex flex-col items-center justify-center py-20">
                        <p className="text-red-500 font-medium mb-2">Failed to load data</p>
                        <p className="text-sm text-gray-500">{ledgerError}</p>
                        <button onClick={() => fetchLedgerData(activeLedgerHeadId)} className="mt-4 text-[#0EA5A4] hover:underline text-sm font-medium">Try Again</button>
                      </div>
                    ) : ledgerTransactions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20">
                        <FileTextIcon className="h-10 w-10 text-gray-300 mb-3" />
                        <p className="text-gray-500">No transactions found</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-6 py-3 font-semibold text-gray-600">Date</th>
                              <th className="px-6 py-3 font-semibold text-gray-600">Particulars</th>
                              <th className="px-6 py-3 font-semibold text-gray-600">Type</th>
                              <th className="px-6 py-3 font-semibold text-gray-600 text-right">Commit</th>
                              <th className="px-6 py-3 font-semibold text-gray-600 text-right">Payment</th>
                              <th className="px-6 py-3 font-semibold text-gray-600 text-right">Balance</th>
                              <th className="px-6 py-3 font-semibold text-gray-600 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {ledgerTransactions.map((txn) => (
                              <tr key={txn.transactionId} className="hover:bg-gray-50/50">
                                <td className="px-6 py-3 text-gray-900 whitespace-nowrap">
                                  {txn.transactionDate ? new Date(txn.transactionDate).toLocaleDateString('en-IN') : '-'}
                                </td>
                                <td className="px-6 py-3 text-gray-900">
                                  <div className="max-w-xs truncate" title={txn.particulars}>{txn.particulars}</div>
                                  {txn.refDetails && <div className="text-xs text-gray-500 mt-0.5">{txn.refDetails}</div>}
                                </td>
                                <td className="px-6 py-3 text-gray-600">
                                  <span className={cn(
                                    "inline-flex px-2 py-0.5 rounded text-xs font-medium",
                                    txn.transactionType === 'PAYMENT' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                                  )}>
                                    {txn.transactionType}
                                  </span>
                                </td>
                                <td className="px-6 py-3 text-right font-medium text-gray-900">
                                  {txn.commitAmount ? `₹${txn.commitAmount.toLocaleString('en-IN')}` : '-'}
                                </td>
                                <td className="px-6 py-3 text-right font-medium text-gray-900">
                                  {txn.paymentAmount ? `₹${txn.paymentAmount.toLocaleString('en-IN')}` : '-'}
                                </td>
                                <td className="px-6 py-3 text-right font-bold text-[#0EA5A4]">
                                  {txn.balance ? `₹${txn.balance.toLocaleString('en-IN')}` : '0'}
                                </td>
                                <td className="px-6 py-3 text-center">
                                  <span className={cn(
                                    "inline-flex px-2.5 py-1 rounded-full text-xs font-semibold",
                                    txn.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                      txn.status === 'PARTIALLY_PAID' ? 'bg-yellow-100 text-yellow-700' :
                                        txn.status === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                                          'bg-gray-100 text-gray-700'
                                  )}>
                                    {txn.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {activeTab === "quick-actions" && (
                <QuickActions projectName={projectName || ''} onNavigate={navigate} />
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
          <aside className="lg:col-span-1 space-y-4 lg:sticky lg:top-28 lg:self-start">
            {/* Section 1: Latest Activity */}
            <div className="frappe-widget">
              <h3 className="frappe-widget-title mb-3 flex items-center justify-between">
                Latest Activity
                <span
                  className="text-xs font-normal text-gray-500 cursor-pointer hover:text-[#0EA5A4]"
                  onClick={() => setActiveTab('activity')}
                >
                  View All
                </span>
              </h3>
              {activityData?.message && activityData.message.length > 0 ? (
                <div className="space-y-3 max-h-[100px] overflow-y-auto pr-1 custom-scrollbar">
                  {activityData.message.map((activity, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[#E0F7F6] flex items-center justify-center font-bold text-[#0EA5A4] text-xs">
                        {activity.owner?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <div className="min-w-0">
                        <div
                          className="text-sm text-gray-800 line-clamp-2 prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: activity.content }}
                        />
                        <p className="text-xs text-gray-500 mt-0.5">
                          {activity.owner} · {activity.creation ? new Date(activity.creation).toLocaleString() : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No recent activity found.</p>
              )}
            </div>

            {/* Section 2: Add Comment (Moved Up) */}
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

            {/* Section 3: Commits (Moved Down) */}
            {isRnDStaff && (
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
                      {ledgerHeadTabs.filter(head => head !== "All").map((head) => (
                        <option key={head} value={head}>{head}</option>
                      ))}
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
                  <div className="pt-2 border-t border-gray-100 mt-2">
                    <button
                      onClick={() => setIsLedgerOpen(true)}
                      className="w-full text-center text-sm font-medium text-[#0EA5A4] hover:text-[#0C8F8E] hover:underline"
                    >
                      View Project Ledger
                    </button>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div >

        {/* Budget Ledger Modal */}
        {
          isLedgerOpen && (
            <div className="frappe-modal-backdrop" onClick={() => setIsLedgerOpen(false)} role="dialog" aria-modal="true" aria-labelledby="modal-title">
              <div className="frappe-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1200px', width: '95%' }}>
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
                  {/* Head-wise Tabs */}
                  <div className="mb-4 border-b border-gray-200">
                    <nav className="flex flex-wrap gap-2" aria-label="Ledger tabs">
                      {ledgerHeadTabs.map((tab) => {
                        const tabEntries = tab === "All"
                          ? budgetData
                          : budgetData.filter((e: any) => (e.head || e.accountHead || "").trim().toLowerCase() === tab.trim().toLowerCase());
                        // Use the last entry's commitableBalance for that head (running total already calculated)
                        const lastEntryForHead = tabEntries.length > 0 ? tabEntries[tabEntries.length - 1] : null;
                        const tabBalance = tab === "All"
                          ? tabEntries.reduce((acc, e) => acc + (e.received || 0) - (e.committed || 0) - (e.payment || 0), 0)
                          : (lastEntryForHead?.commitableBalance || 0);
                        return (
                          <button
                            key={tab}
                            onClick={() => setActiveLedgerTab(tab)}
                            className={cn(
                              "px-4 py-2.5 text-sm font-bold rounded-t-lg transition-colors border-b-2 flex flex-col items-start",
                              activeLedgerTab === tab
                                ? "border-[#0EA5A4] text-[#0EA5A4] bg-[#E0F7F6]"
                                : "border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                            )}
                          >
                            <span className="flex items-center gap-2">
                              {tab}
                              <span className={cn(
                                "px-1.5 py-0.5 text-xs rounded-full",
                                activeLedgerTab === tab ? "bg-[#0EA5A4] text-white" : "bg-gray-200 text-gray-600"
                              )}>
                                {tabEntries.length}
                              </span>
                            </span>
                            <span className={cn(
                              "text-xs font-bold mt-0.5",
                              tabBalance >= 0 ? "text-green-600" : "text-red-600"
                            )}>
                              ₹ {tabBalance.toLocaleString('en-IN')}
                            </span>
                          </button>
                        );
                      })}
                    </nav>
                  </div>

                  {/* Summary for selected head */}
                  {activeLedgerTab !== "All" && (() => {
                    const lastEntry = filteredLedgerData.length > 0 ? filteredLedgerData[filteredLedgerData.length - 1] : null;
                    return (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200 flex flex-wrap gap-6">
                        <div>
                          <span className="text-xs text-gray-500 uppercase font-semibold">Total Received</span>
                          <p className="text-lg font-bold text-green-600">
                            ₹ {filteredLedgerData.reduce((acc, e) => acc + (e.received || 0), 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 uppercase font-semibold">Total Committed</span>
                          <p className="text-lg font-bold text-red-600">
                            ₹ {filteredLedgerData.reduce((acc, e) => acc + (e.committed || 0), 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 uppercase font-semibold">Available Balance</span>
                          <p className="text-lg font-bold text-[#0EA5A4]">
                            ₹ {(lastEntry?.commitableBalance || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="overflow-x-auto">
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
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLedgerData.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="text-center py-8 text-gray-500">
                              No entries found for {activeLedgerTab}
                            </td>
                          </tr>
                        ) : (
                          filteredLedgerData.map((row, index) => (
                            <tr key={index}>
                              <td>{row.sl}</td>
                              <td>{row.date}</td>
                              <td>{row.particulars}</td>
                              <td className="max-w-[200px] truncate" title={row.ref}>{row.ref}</td>
                              <td style={{ textAlign: 'right' }} className={row.received ? "text-green-600 font-medium" : ""}>{row.received ? row.received.toLocaleString('en-IN') : '-'}</td>
                              <td style={{ textAlign: 'right' }} className={row.committed ? "text-red-600 font-medium" : ""}>{row.committed ? row.committed.toLocaleString('en-IN') : '-'}</td>
                              <td style={{ textAlign: 'right' }} className="font-semibold text-gray-900">{row.commitableBalance?.toLocaleString('en-IN')}</td>
                              <td>{row.bmr}</td>
                              <td style={{ textAlign: 'right' }} className={row.payment ? "text-red-600 font-medium" : ""}>{row.payment ? row.payment.toLocaleString('en-IN') : '-'}</td>
                              <td style={{ textAlign: 'right' }} className="font-semibold text-gray-900">
                                {activeLedgerTab === "All"
                                  ? row.actualBalance?.toLocaleString('en-IN')
                                  : (row as any).headActualBalance?.toLocaleString('en-IN')
                                }
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )
        }
      </>
    );
  };

  return (
    <div className="bg-[#F0F4F8] min-h-screen">
      <AppSidebar />
      <main className="flex-1 p-4 md:p-8 w-full">
        {renderContent()}
      </main>

      {/* Sanction Submit Comment Modal */}
      <CommentModal
        isOpen={sanctionModalOpen}
        onClose={() => setSanctionModalOpen(false)}
        onSubmit={handleConfirmSanctionSubmit}
        action="Submit Sanction"
        isLoading={isSubmittingSanction}
      />
    </div>
  );
};

export default ProjectDetailsOverview;

