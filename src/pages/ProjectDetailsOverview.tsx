import React, {
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";

import { createPortal } from "react-dom";
import {
  useFrappeGetDoc,
  useFrappePostCall,
  useFrappeGetCall,
  useFrappeAuth,
} from "frappe-react-sdk";
import { Textarea } from "@/components/ui/textarea";

import FundDetails from "../components/FundDetails";
// Disbursal of Honorarium moved to separate page
import {
  ArrowLeftIcon,
  FileTextIcon,
  UsersIcon,
  IndianRupeeIcon,
  ShieldIcon,
  MessageSquareIcon,
  DownloadIcon,
  CalendarIcon,
  UserIcon,
  BuildingIcon,
  CreditCardIcon,
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
  CreditCard, Upload, ShoppingCart, Plane, ZapIcon, Users, Settings, FileSpreadsheet as LedgerIcon,
  ExternalLinkIcon,
  ChevronRight,
  Plus,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  paymentBalance: number;
  actualBalance?: number;
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
  <Card className={cn("border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm", className)}>
    <CardHeader className="py-3 px-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/50">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-3.5 w-3.5 text-[#D97757]" />}
        <CardTitle className="text-xs font-semibold font-serif text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">{title}</CardTitle>
      </div>
    </CardHeader>
    <CardContent className="pt-4 px-3">
      {children}
    </CardContent>
  </Card>
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
    <div className="py-3 px-1">
      <div className="flex items-center gap-2 mb-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />}
        <p className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide font-sans">
          {label}
        </p>
      </div>
      <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 pl-0.5">{value}</p>
    </div>
  );
};

// --- FrappeCard Component ---
const FrappeCard = ({ children, className }: any) => (
  <Card className={cn("border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm", className)}>
    <CardContent className="p-6">
      {children}
    </CardContent>
  </Card>
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
        className="prose prose-sm max-w-none text-zinc-600 dark:text-zinc-300 leading-relaxed dark:prose-invert"
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
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <Table>
          <TableHeader className="bg-zinc-50 dark:bg-zinc-900">
            <TableRow className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-transparent">
              {columns.map((col) => (
                <TableHead key={col.fieldname} className="px-6 py-3 h-10 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={index} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                {columns.map((col) => (
                  <TableCell key={col.fieldname} className="px-4 py-2 text-xs text-zinc-700 dark:text-zinc-300">
                    {row[col.fieldname]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
  // Use Button from ui/button with variants mapped
  <Button
    variant={variant === "primary" ? "default" : variant === "ghost" ? "ghost" : "outline"}
    className={cn(
      className,
      variant === "primary" && "bg-[#D97757] hover:bg-[#C66A4E] text-white",
      variant === "outline" && "border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
    )}
    {...props}
  >
    {children}
  </Button>
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
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow-lg w-full max-w-md">
        <h3 className="text-sm font-bold mb-4 capitalize text-zinc-900 dark:text-zinc-100">
          Confirm {action}
        </h3>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Enter your comment here..."
          className="mb-4 min-h-[100px] border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:ring-zinc-500"
        />
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={() => { onSubmit(comment); setComment(""); }} disabled={isLoading}>
            {isLoading ? "Submit..." : "Submit"}
          </Button>
        </div>
      </div>
    </div>
  );
};

const AdvanceSettlementModal = ({ isOpen, onClose, settlements, onConvertNew, onNavigate }: {
  isOpen: boolean;
  onClose: () => void;
  settlements: any[];
  onConvertNew: () => void;
  onNavigate: (path: string) => void;
}) => {
  useEffect(() => {
    if (isOpen) {
      console.log('>>> AdvanceSettlementModal MOUNTED/OPENED with settlements:', settlements);
    }
  }, [isOpen, settlements]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999]">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow-lg w-full max-w-lg relative z-[100000]">
        <h3 className="text-lg font-bold mb-4 text-zinc-900 dark:text-zinc-100">Existing Settlements Found</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
          There are already settlement(s) created for this advance. You can view/edit an existing one or create a new partial settlement.
        </p>

        <div className="space-y-3 mb-6 max-h-[200px] overflow-y-auto">
          {settlements.map((settlement) => (
            <div key={settlement.name} className="flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
              <div>
                <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{settlement.name}</p>
                <p className="text-xs text-zinc-500">{settlement.workflow_state} · ₹ {settlement.total_amount}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full border ${settlement.workflow_state === 'Approved' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                  settlement.workflow_state === 'Submitted' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                    'bg-zinc-100 text-zinc-800 border-zinc-200'
                  }`}>
                  {settlement.workflow_state || 'Draft'}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onNavigate(`/advance-settlement/${settlement.name}`);
                  }}
                >
                  View
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConvertNew} className="bg-[#D97757] hover:bg-[#C66A4E] text-white">
            Create New Settlement
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// --- START: REFACTORED QuickActions COMPONENT ---

interface QuickActionsProps {
  projectName: string;
  projectNo?: string;
  projectTitle?: string;
  onNavigate: (path: string) => void;
  onSwitchTab?: (tab: string) => void;
}

const QuickActions = ({ projectName, projectNo, projectTitle, onNavigate, onSwitchTab }: QuickActionsProps) => {
  const { currentUser } = useFrappeAuth();
  const location = useLocation();

  // Use location state if available (from navigation back), fallback to sessionStorage, then default
  const [activeTab, setActiveTabState] = useState(() =>
    location.state?.category || sessionStorage.getItem(`activeTab_${projectName}`) || "Reimbursement"
  );
  const [selectedApplication, setSelectedApplication] = useState<string | null>(() =>
    location.state?.app || sessionStorage.getItem(`selectedApp_${projectName}`) || null
  );

  const handleTabChange = (tab: string) => {
    setActiveTabState(tab);

    // Auto-select if the tab only has one item
    const group = groups.find(g => g.title === tab);
    if (group && group.items.length === 1) {
      setSelectedApplication(group.items[0]);
      sessionStorage.setItem(`selectedApp_${projectName}`, group.items[0]);
    } else {
      setSelectedApplication(null);
      sessionStorage.removeItem(`selectedApp_${projectName}`);
    }

    sessionStorage.setItem(`activeTab_${projectName}`, tab);
  };

  const clearAppSelection = () => {
    setSelectedApplication(null);
    sessionStorage.removeItem(`selectedApp_${projectName}`);
  };

  useEffect(() => {
    if (selectedApplication) {
      sessionStorage.setItem(`selectedApp_${projectName}`, selectedApplication);
    }
  }, [selectedApplication, projectName]);

  const [applicationData, setApplicationData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Settle Modal State
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [existingSettlements, setExistingSettlements] = useState<any[]>([]);
  const [selectedAdvanceForSettle, setSelectedAdvanceForSettle] = useState<any>(null);

  const handleSettleClick = async (item: any) => {
    setIsLoading(true);
    console.log('>>> handleSettleClick triggered for:', item.name);
    try {
      // Check for existing settlements
      console.log('Fetching ALL Advance Settlements to debug filter (client-side filtering enabled)');
      const response = await fetchReimbursements({
        doctype: "Advance Settlement",
        fields: ["name", "total_amount", "creation", "temporary_advance_application", "owner", "docstatus"],
        order_by: "creation desc",
        limit_page_length: 50
      });

      console.log('>>> ALL Advance Settlements (last 50):', response);
      const allSettlements = (response?.message || []).map((s: any) => ({
        ...s,
        workflow_state: s.workflow_state || (s.docstatus === 1 ? "Submitted" : s.docstatus === 2 ? "Cancelled" : "Draft")
      }));

      // Client-side filter
      const settlements = allSettlements.filter((s: any) =>
        s.temporary_advance_application === item.name
      );

      console.log('>>> Match candidate ID:', item.name);
      console.log('>>> Filtered Settlements (Client-Side):', settlements);

      if (settlements.length > 0) {
        setExistingSettlements(settlements);
        setSelectedAdvanceForSettle(item);
        setIsSettleModalOpen(true);
        console.log('>>> Opening Modal (Client-Side Match)');
      } else {
        console.log('>>> No settlements found, navigating to new form');
        // No existing settlements, go straight to new form
        onNavigate(`/advance-settlement?advance=${item.name}&project=${projectName}`);
      }
    } catch (error) {
      console.error("Error checking for settlements:", error);
      // Fallback: just go to new form
      onNavigate(`/advance-settlement?advance=${item.name}&project=${projectName}`);
    } finally {
      setIsLoading(false);
    }
  };

  const groups = [
    { title: "Reimbursement", icon: IndianRupeeIcon, items: ["Reimbursement"] },
    { title: "Advance", icon: CreditCard, items: ["Temporary Advance Apply"] },
    { title: "Disbursal", icon: Upload, items: ["Top Up Fellowship", "Disbursal of Consultancy", "Disbursement of Honorarium"] },
    { title: "Purchase", icon: ShoppingCart, items: ["Direct purchase", "General Indent", "Generate NIQ", "Indent cum Sanction Sheet", "Rate Contract"] },
    { title: "Recruitment", icon: Users, items: ["Adhoc", "Committee Member Change Request", "Contractual", "Selection Committee Report", "Project Staff Resignation"] },
    { title: "Travel", icon: Plane, items: ["Travel"] },
    { title: "Utilities", icon: Settings, items: ["Add New User", "Application History", "Form Tracking", "IPR", "Incharge Assignment", "Legal"] },
  ];

  // Frappe SDK hooks for fetching data
  const { call: fetchReimbursements } = useFrappePostCall<{ message: any[] }>(
    'frappe.client.get_list'
  );

  // Fetch data when application is selected
  const fetchApplicationData = useCallback(async () => {
    console.log('>>> fetchApplicationData triggered. selectedApplication:', selectedApplication, 'projectName:', projectName);

    if (!selectedApplication || !projectName) {
      console.log('>>> Early return - missing selectedApplication or projectName');
      setApplicationData([]);
      return;
    }

    // Temporary Advance is handled here with manual fetch
    // if (selectedApplication === "Temporary Advance Apply") { ... }

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
      } else if (selectedApplication === "Temporary Advance Apply") {
        try {
          console.log('=== FETCHING TEMPORARY ADVANCE (V2) ===');
          const timestamp = Date.now();
          const projectCode = projectNo || projectName;
          // Filter at API level by project_code
          const filters = projectCode ? `&filters=[["project_code","=","${projectCode}"]]` : '';
          const apiUrl = `/api/v2/document/Temporary Advance?fields=["*"]&limit_page_length=0${filters}&_=${timestamp}`;

          console.log('Fetching with project_code filter:', projectCode);

          const fetchResponse = await fetch(apiUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            credentials: 'include'
          });

          if (!fetchResponse.ok) throw new Error(`HTTP error! status: ${fetchResponse.status}`);

          const result = await fetchResponse.json();
          data = result?.data || [];
          console.log(`Fetched ${data.length} Temporary Advance items for project_code: ${projectCode}`);

          // Map for display consistency
          data = data.map((item: any) => ({
            ...item,
            workflow_state: item.workflow_state || item.status || (item.docstatus === 1 ? "Submitted" : item.docstatus === 2 ? "Cancelled" : "Draft"),
            applicant_webmail: item.applicant_webmail || item.owner
          }));

          console.log(`Mapped ${data.length} Temporary Advance items`);
        } catch (fetchError) {
          console.error('Temporary Advance fetch error:', fetchError);
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
        } catch (e) {
          console.error(e);
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
        } catch (e) {
          console.error(e);
          data = [];
        }
      } else if (selectedApplication === "Travel") {
        try {
          // Use v2 API which works correctly
          const travelPromise = fetch(`/api/v2/document/Travel?fields=["name","creation","workflow_state","owner","travel_project_title","travel_project_number","webmail_id_travel","applicant_name_travel"]&order_by=creation desc&limit_page_length=0`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            credentials: 'include'
          }).then(res => res.ok ? res.json() : { data: [] });

          const settlementPromise = fetch(`/api/v2/document/TA DA Settlement?fields=["name","creation","workflow_state","owner","ta_da_project_code","ta_da_name"]&order_by=creation desc&limit_page_length=0`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            credentials: 'include'
          }).then(res => res.ok ? res.json() : { data: [] });

          const [travelRes, settlementRes] = await Promise.all([travelPromise, settlementPromise]);

          console.log('[Travel Fetch] Raw travelRes.data:', travelRes.data);
          console.log('[Travel Fetch] Filtering by travel_project_title:', projectName);

          // Filter by travel_project_title which contains the project ID
          const travelItems = (travelRes.data || [])
            .filter((item: any) => item.travel_project_title === projectName)
            .map((item: any) => ({
              ...item,
              applicant_webmail: item.webmail_id_travel,
              type: 'Travel Apply'
            }));

          console.log('[Travel Fetch] Filtered travelItems:', travelItems.length, 'items');

          const settlementItems = (settlementRes.data || [])
            .filter((item: any) => item.ta_da_project_code === projectName)
            .map((item: any) => ({
              ...item,
              applicant_webmail: item.ta_da_name,
              type: 'TA DA Settlement'
            }));

          // Combine and sort by creation date desc
          data = [...travelItems, ...settlementItems].sort((a: any, b: any) =>
            new Date(b.creation).getTime() - new Date(a.creation).getTime()
          );
          console.log('[Travel Fetch] Combined data:', data.length, 'items');
        } catch (fetchError) {
          console.error('Travel combined fetch error:', fetchError);
          data = [];
        }
      } else if (selectedApplication === "Disbursal of Honorarium") {
        try {
          const timestamp = Date.now();
          const apiUrl = `/api/resource/Disbursal of Honorarium?fields=["name","creation","workflow_state","owner","total_amount","webmail_id","name_of_applicant","department"]&order_by=creation desc&limit_page_length=0&_=${timestamp}`;
          const fetchResponse = await fetch(apiUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            credentials: 'include'
          });
          if (!fetchResponse.ok) throw new Error(`HTTP error! status: ${fetchResponse.status}`);
          const result = await fetchResponse.json();
          data = (result?.data || []).map((item: any) => ({
            ...item,
            applicant_webmail: item.webmail_id || item.owner
          }));
        } catch (fetchError) {
          console.error('Disbursal of Honorarium fetch error:', fetchError);
          data = [];
        }
      } else if (selectedApplication === "Direct Purchase") {
        try {
          const timestamp = Date.now();
          const apiUrl = `/api/v2/document/Direct%20Purchase?fields=["*"]&limit_page_length=0&_=${timestamp}`;
          const fetchResponse = await fetch(apiUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            credentials: 'include'
          });
          if (!fetchResponse.ok) throw new Error(`HTTP error! status: ${fetchResponse.status}`);
          const result = await fetchResponse.json();
          const allItems = result?.data || [];
          const userStr = (currentUser || '').toLowerCase();

          console.log('[Direct Purchase Fetch] Total items fetched:', allItems.length);
          console.log('[Direct Purchase Fetch] Current User:', userStr);
          console.log('[Direct Purchase Fetch] Project ID:', projectName, 'Project No:', projectNo);

          data = allItems
            .filter((item: any) => {
              const itemOwner = (item.owner || '').toLowerCase();
              const itemApplicant = (item.applicant_webmail || '').toLowerCase();

              // More robust project matching
              const matchesProject =
                (item.project_name === projectName) ||
                (item.project_name === projectNo) ||
                (item.project_number === projectName) ||
                (item.project_number === projectNo);

              // For Direct Purchase, show if user is owner OR applicant OR if no owner/applicant specified
              const matchesUser = !userStr || itemOwner === userStr || itemApplicant === userStr;

              const isMatch = matchesProject && matchesUser;

              if (!isMatch && allItems.length < 20) {
                console.log('[Direct Purchase Filter] Item excluded:', item.name, {
                  matchesProject,
                  matchesUser,
                  itemProject: item.project_name,
                  itemOwner
                });
              }

              return isMatch;
            })
            .map((item: any) => ({
              ...item,
              workflow_state: item.workflow_state || (item.docstatus === 1 ? "Submitted" : item.docstatus === 2 ? "Cancelled" : "Draft"),
              applicant_webmail: item.applicant_name || item.owner
            }));

          console.log('[Direct Purchase Fetch] Filtered data items count:', data.length);
        } catch (fetchError) {
          console.error('Direct Purchase fetch error:', fetchError);
          data = [];
        }
      }
      setApplicationData(data);
    } catch (error) {
      console.error("Error fetching application data:", error);
      setApplicationData([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedApplication, projectName, fetchReimbursements]);

  useEffect(() => {
    fetchApplicationData();
  }, [fetchApplicationData]);


  const ActionButton = ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button
      onClick={onClick}
      className={cn(
        "w-full justify-start text-left text-sm font-medium text-zinc-700 dark:text-zinc-300",
        "px-4 py-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800",
        "shadow-sm transition-all duration-150",
        "hover:shadow-md hover:border-[#D97757]/20 hover:text-[#D97757]",
        "focus:outline-none focus:ring-2 focus:ring-[#D97757]/20"
      )}>
      {children}
    </button>
  );



  const handleApplyNew = () => {
    // Use projectNo if available, otherwise fallback to projectName (compatibility)
    const projectParam = projectNo || projectName;

    // Navigate based on application type
    switch (selectedApplication) {
      case "Top Up Fellowship":
      case "Disbursal of Consultancy":
        alert(`Apply New: ${selectedApplication} - Route not configured yet`);
        break;
      case "Disbursal of Honorarium":
      case "Disbursement of Honorarium":
        onNavigate(`/disbursal-of-honorarium-form?project=${projectParam}`);
        break;
      case "Reimbursement":
        onNavigate(`/reimbursement?project=${projectParam}`);
        break;
      case "Temporary Advance Apply":
        onNavigate(`/temporary-advance?project=${projectParam}&projectTitle=${encodeURIComponent(projectTitle || '')}`);
        break;
      case "Advance Settlement":
        onNavigate(`/advance-settlement?project=${projectParam}`);
        break;
      case "Rate Contract":
        onNavigate(`/rate-contract?project=${projectParam}`);
        break;
      case "Travel Apply":
        onNavigate(`/travel?project=${projectParam}`);
        break;
      case "Travel":
        onNavigate(`/travel?project=${projectParam}`);
        break;
      case "TA DA Settlement":
        onNavigate(`/ta-da-settlement?project=${projectParam}`);
        break;
      case "Project Staff Resignation":
        onNavigate(`/project-staff-resignation?project=${projectParam}`);
        break;
      case "Direct Purchase":
      case "Direct purchase":
        onNavigate(`/direct-purchase?project=${projectParam}`);
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
      <div className="p-5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
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
                    "frappe-tab flex items-center gap-2 font-bold",
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
                onClick={clearAppSelection}
                className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-zinc-600 dark:text-zinc-400 rotate-180" />
              </button>
            )}
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{selectedApplication}</h3>
          </div>

          <button
            onClick={handleApplyNew}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm",
              "bg-[#D97757] text-white hover:bg-[#C66A4E]",
              "shadow-sm transition-all duration-150"
            )}
          >
            <Plus className="w-4 h-4" />
            Apply New
          </button>
        </div>

        {/* Applications Table */}
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D97757] mx-auto"></div>
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">Loading applications...</p>
            </div>
          ) : applicationData.length > 0 ? (
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Application ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Applicant</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {applicationData.map((item: any, index: number) => (
                  <tr key={item.name || index} className="hover:bg-zinc-50 dark:bg-zinc-800/50">
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{formatDate(item.creation)}</td>
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">{item.applicant_webmail || item.owner}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex px-2 py-1 text-xs font-medium rounded-full",
                        item.workflow_state === "Approved" && "bg-green-100 text-green-700",
                        item.workflow_state === "Pending" && "bg-yellow-100 text-yellow-700",
                        item.workflow_state === "Rejected" && "bg-red-100 text-red-700",
                        item.workflow_state === "Draft" && "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300",
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
                                onNavigate(`/travel/${item.name}`);
                                break;
                              case "TA DA Settlement":
                                onNavigate(`/ta-da-settlement?edit=${item.name}`);
                                break;
                              case "Disbursal of Honorarium":
                              case "Disbursement of Honorarium":
                                onNavigate(`/disbursal-of-honorarium-form/${item.name}`);
                                break;
                              case "Direct Purchase":
                              case "Direct purchase":
                                onNavigate(`/direct-purchase/${item.name}`);
                                break;
                              default:
                                // Check item.type for Travel consolidated view
                                if (item.type === 'Travel Apply') {
                                  onNavigate(`/travel/${item.name}`);
                                } else if (item.type === 'TA DA Settlement') {
                                  onNavigate(`/ta-da-settlement?edit=${item.name}`);
                                } else if (item.type === 'Advance Settlement') {
                                  onNavigate(`/advance-settlement/${item.name}`);
                                } else {
                                  onNavigate(`/reimbursement/${item.name}`);
                                }
                                break;
                            }
                          }}
                          className="text-sm text-[#D97757] hover:underline whitespace-nowrap"
                        >
                          View
                        </button>
                        {(selectedApplication === "Temporary Advance Apply") && (
                          <button
                            onClick={() => handleSettleClick(item)}
                            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:underline whitespace-nowrap"
                          >
                            Settle
                          </button>
                        )}
                        {(selectedApplication === "Travel" && item.type === 'Travel Apply') && (
                          <button
                            onClick={() => onNavigate(`/ta-da-settlement?project=${projectName}&travel_ref=${item.name}`)}
                            className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:text-zinc-100 hover:underline whitespace-nowrap"
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
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <FileTextIcon className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
              </div>
              <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">No applications yet</h4>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                You haven't submitted any {selectedApplication?.toLowerCase()} applications for this project.
              </p>
              <button
                onClick={handleApplyNew}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm",
                  "bg-[#D97757] text-white hover:bg-[#C66A4E]",
                  "shadow-sm transition-all duration-150"
                )}
              >
                <Plus className="w-4 h-4" />
                Apply New
              </button>
            </div>
          )}
        </div>

        <AdvanceSettlementModal
          isOpen={isSettleModalOpen}
          onClose={() => setIsSettleModalOpen(false)}
          settlements={existingSettlements}
          onConvertNew={() => {
            setIsSettleModalOpen(false);
            if (selectedAdvanceForSettle) {
              onNavigate(`/advance-settlement?advance=${selectedAdvanceForSettle.name}&project=${projectName}`);
            }
          }}
          onNavigate={onNavigate}
        />
      </div >
    );
  }

  // Otherwise, render grid of cards
  const activeGroupData = groups.find(g => g.title === activeTab);

  return (
    <div className="p-5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
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
                  "frappe-tab flex items-center gap-2 font-bold",
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeGroupData?.items.map((item) => (
          <ActionButton key={item} onClick={() => {
            setSelectedApplication(item);
            sessionStorage.setItem(`selectedApp_${projectName}`, item);
          }}>
            {item}
          </ActionButton>
        ))}
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
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <CardContent className="p-4">
            <label htmlFor="comment-textarea" className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3 block">
              Add a comment
            </label>
            <Textarea
              id="comment-textarea"
              placeholder="Type here... (Ctrl+Enter to submit)"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isSubmitting}
              className="min-h-[100px] border-zinc-200 dark:border-zinc-800"
              rows={4}
            />
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{newComment.length}/1000</span>
              <FrappeButton onClick={handleCommentSubmit} disabled={isSubmitting || !newComment.trim()}>
                {isSubmitting ? "Submitting..." : "Submit"}
              </FrappeButton>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-3">
          {activityData?.message?.map((item, index) => (
            <div
              key={`${item.creation} -${index} `}
              className="flex items-start gap-4 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-sm"
            >
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-semibold text-zinc-600 dark:text-zinc-300 text-lg">
                {item.owner?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.owner || "Unknown User"}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                    <ClockIcon className="h-3.5 w-3.5" />
                    {item.creation ? new Date(item.creation).toLocaleString() : "N/A"}
                  </p>
                </div>
                <div className="text-sm text-zinc-700 dark:text-zinc-300 prose prose-sm max-w-none leading-relaxed dark:prose-invert"
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
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() =>
    location.state?.tab || sessionStorage.getItem(`mainTab_${projectName}`) || "overview"
  );
  const activityStreamRef = useRef<ActivityStreamHandle>(null);
  const { currentUser } = useFrappeAuth();
  const { data, error, isLoading, mutate } = useFrappeGetDoc(
    "Project Registration",
    projectName ?? "",
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0, // Don't auto-refresh
      dedupingInterval: 60000, // Cache for 60 seconds
    }
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

  // --- Payment Modal State ---
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedCommitmentForPayment, setSelectedCommitmentForPayment] = useState<BudgetEntry | null>(null);
  const [paymentFormData, setPaymentFormData] = useState<Record<string, any>>({});
  const [paymentFieldDefs, setPaymentFieldDefs] = useState<any[]>([]);
  const [paymentLinkOptions, setPaymentLinkOptions] = useState<Record<string, any[]>>({});
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false);

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

  // Track which heads have data (non-empty transactions)
  const [headsWithData, setHeadsWithData] = useState<Set<number>>(new Set());
  const [isCheckingHeads, setIsCheckingHeads] = useState(false);

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
      }
    };
    fetchBudgetHeads();
  }, []);

  // Check which budget heads have data when entering ledger tab
  useEffect(() => {
    const checkHeadsWithData = async () => {
      if (!projectName || budgetHeadList.length === 0) return;

      setIsCheckingHeads(true);
      const headsSet = new Set<number>();

      try {
        // Check each head for data
        const promises = budgetHeadList.map(async (head) => {
          try {
            const response = await fetch(`/ledger-api/commit-payment-transactions?projectNumber=${data?.project_no || projectName}&accountHeadId=${head.id}`);
            if (response.ok) {
              const data = await response.json();
              if (Array.isArray(data) && data.length > 0) {
                headsSet.add(head.id);
              }
            }
          } catch (err) {
            console.error(`Failed to check data for head ${head.name}:`, err);
          }
        });

        await Promise.all(promises);
        setHeadsWithData(headsSet);
        console.log("Heads with data:", headsSet);
      } catch (err) {
        console.error("Failed to check heads with data:", err);
      } finally {
        setIsCheckingHeads(false);
      }
    };

    if (activeTab === 'ledger') {
      checkHeadsWithData();
    }
  }, [activeTab, projectName, budgetHeadList, data?.project_no]);

  // Use budgetHeadList filtered to only heads with data for ledger tabs
  const ledgerHeads = budgetHeadList.filter(head => headsWithData.has(head.id));

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
      const response = await fetch(`/ledger-api/commit-payment-transactions?projectNumber=${data?.project_no || projectName}&accountHeadId=${headId}`);
      console.log("Ledger API response status:", response, "for projectNumber:", projectName, "headId:", headId);
      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText} `);
      }

      const result = await response.json();
      console.log("Ledger API response data:", result, "for projectNumber:", projectName, "headId:", headId);

      const rawData = Array.isArray(result) ? result : [];
      let runningPaymentBalance = 0;

      // Sort by date ascending to ensure accurate running balance
      const sortedData = [...rawData].sort((a: any, b: any) =>
        new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
      );

      const calculatedData = sortedData.map((txn: any) => {
        const received = txn.fundReceivedAmount || 0;
        const paid = txn.paymentAmount || 0;
        runningPaymentBalance = runningPaymentBalance + received - paid;
        return {
          ...txn,
          paymentBalance: runningPaymentBalance
        };
      });

      setLedgerTransactions(calculatedData);
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

    const headFundTotals: Record<string, number> = {};
    const headCommitTotals: Record<string, number> = {};
    const headPaymentTotals: Record<string, number> = {};

    // 3. Calculate Running Totals
    let runningPaymentBalance = 0; // Global Payment Balance (Received - Paid)

    const calculatedEntries = allRawEntries.map((entry, idx) => {
      // Determine Head
      let head = (entry as any).head || (entry as any).accountHead;

      // Fallback parsing
      if (!head) {
        if (entry.particulars.startsWith("Commitment for ")) {
          head = entry.particulars.replace("Commitment for ", "").trim();
        } else if (entry.particulars.startsWith("Fund Received - ")) {
          head = entry.particulars.replace("Fund Received - ", "").trim();
        }
      }
      head = head || "Unspecified";

      if (entry.type === 'transaction') {
        runningPaymentBalance += (entry.received || 0);
        headFundTotals[head] = (headFundTotals[head] || 0) + (entry.received || 0);
      } else if (entry.type === 'commitment') {
        headCommitTotals[head] = (headCommitTotals[head] || 0) + (entry.committed || 0);
      }

      // Track payments
      if (entry.payment) {
        runningPaymentBalance -= entry.payment;
        headPaymentTotals[head] = (headPaymentTotals[head] || 0) + (entry.payment);
      }

      const headActualBalance = (headFundTotals[head] || 0) - (headPaymentTotals[head] || 0);

      // Per-Head Commitable Balance = Received - Committed - Payment
      const currentHeadBalance = (headFundTotals[head] || 0) - (headCommitTotals[head] || 0) - (headPaymentTotals[head] || 0);

      return {
        ...entry,
        sl: idx + 1,
        paymentBalance: runningPaymentBalance, // Global Running Total (Received - Paid)
        actualBalance: runningPaymentBalance, // Global Running Total
        headActualBalance: headActualBalance, // Per-Head Actual Balance
        commitableBalance: currentHeadBalance, // Specific Head Balance
        head: head // Persist resolved head
      };
    });

    setBudgetData(calculatedEntries);
  }, [JSON.stringify(fundReceivedData), manualCommitments]);


  // Calculate balances based on selected Commit Head
  // Filter budget data for the selected head to calculate specific balance




  // Total project balances from Frappe API - for header display
  // Memoize params and options to prevent infinite re-renders
  const targetProjectNumber = data?.project_no || projectName;

  const balanceParams = useMemo(() => ({ project_number: targetProjectNumber || '' }), [targetProjectNumber]);
  const balanceOptions = useMemo(() => ({
    revalidateOnFocus: false,
    // Wait until we have a project number. If Project document is still loading,
    // wait for data.project_no so we don't accidentally fetch with just the doc name (which might be wrong).
    isPaused: () => !targetProjectNumber || (isLoading && !data?.project_no)
  }), [targetProjectNumber, isLoading, data?.project_no]);

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
      paymentBalance: 0, // Recalculated in effect
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

  // --- Payment Modal Handlers ---
  const openPaymentModal = useCallback(async (row: BudgetEntry) => {
    setSelectedCommitmentForPayment(row);
    try {
      // Fetch payment field definitions from API
      const response = await fetch('/api/method/rndopsapp.rndopsapp.commitPayment.get_account_head_payment_fields');
      const result = await response.json();
      if (result?.message) {
        const { fields, prefill_data, link_options } = result.message;
        setPaymentFieldDefs(fields || []);
        setPaymentLinkOptions(link_options || {});

        // Prefill form data from the committed row
        const accountHeadValue = budgetHeadList.find(bh =>
          bh.name.toLowerCase() === ((row as any).head || (row as any).accountHead || '').toLowerCase()
        );

        setPaymentFormData({
          ...prefill_data,
          project_ref_number: projectName || '',
          payment_amount: row.committed || 0,
          budget_head: accountHeadValue?.name || (row as any).head || '',
          payment_bmr: row.bmr || '',
          payment_date: new Date().toISOString().split('T')[0],
          payment_particular: row.particulars || '',
          commit_id: (row as any).transactionId || '',
        });
      }
      setPaymentModalOpen(true);
    } catch (err) {
      console.error('Failed to fetch payment fields:', err);
      alert('Failed to load payment form. Please try again.');
    }
  }, [projectName, budgetHeadList]);

  const handlePaymentFieldChange = (fieldname: string, value: any) => {
    setPaymentFormData(prev => ({ ...prev, [fieldname]: value }));
  };

  const handleSubmitPayment = useCallback(async () => {
    if (!selectedCommitmentForPayment) return;
    setIsPaymentSubmitting(true);
    try {
      const response = await fetch('/api/method/rndopsapp.rndopsapp.doctype.accountheadpayment.accountheadpayment.submit_payment_data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          doctype: 'AccountHeadPayment',
          name: '',
          project_name: paymentFormData.project_ref_number || projectName,
          payment_amount: paymentFormData.payment_amount,
          budget_head: paymentFormData.budget_head,
          bmr: paymentFormData.payment_bmr,
        })
      });
      const result = await response.json();
      if (result.exc || result.exception) {
        throw new Error(result.exc || result.exception);
      }
      // Success - close modal and refresh ledger
      setPaymentModalOpen(false);
      setSelectedCommitmentForPayment(null);
      setPaymentFormData({});
      // Refresh ledger data
      if (activeLedgerHeadId) {
        fetchLedgerData(activeLedgerHeadId);
      }
      alert('Payment submitted successfully!');
    } catch (err: any) {
      console.error('Payment submission failed:', err);
      alert('Failed to submit payment: ' + (err.message || 'Unknown error'));
    } finally {
      setIsPaymentSubmitting(false);
    }
  }, [selectedCommitmentForPayment, paymentFormData, projectName, activeLedgerHeadId]);

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

  // React Router state has already initialized tabs from location.state above.
  // We can remove the searchParams effect.

  const handleAddFunds = () => navigate(`/add-fund-received/${projectName}/`);
  const handleAddSanctionDetails = () => {
    navigate(`/project-details-overview/${projectName}/add-fund-sanction`);
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: FileTextIcon },
    { id: "sanction-details", label: "Sanction Details", icon: CreditCardIcon },
    // { id: "sanction-details", label: "Sanction Details", icon: CreditCardIcon },
    // { id: "disbursal", label: "Disbursal", icon: Upload }, // Removed as per request
    { id: "ledger", label: "Ledger", icon: LedgerIcon },
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
        return "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700";
    }
  };

  // Helper function to get budget head name from ID or name
  const getBudgetHeadName = (accountHeadValue: string | number): string => {
    // If it's already a string name (not a number), return it
    if (typeof accountHeadValue === 'string' && isNaN(Number(accountHeadValue))) {
      return accountHeadValue;
    }
    // Otherwise, try to find the name from budgetHeadList
    const budgetHead = budgetHeadList.find(
      (bh) => bh.id === Number(accountHeadValue) || bh.name === accountHeadValue
    );
    return budgetHead?.name || String(accountHeadValue);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-screen">
          <p className="text-sm font-semibold">Loading Project Details...</p>
        </div>
      );
    }
    // Show loading instead of error for transient failures
    if (error && !data) {
      return (
        <div className="flex flex-col items-center justify-center h-screen gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Loading Project Details...</p>
          <button
            onClick={() => mutate()}
            className="text-sm text-teal-600 hover:underline"
          >
            Click to retry
          </button>
        </div>
      );
    }

    console.log("data:", data);

    return (
      <>
        <header className="sticky top-0 z-50 mb-4 p-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all duration-200">
          <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/projects-view")}
                aria-label="Back to projects"
                className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:bg-zinc-800 transition-colors"
              >
                <ArrowLeftIcon className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
              </button>
              <div>
                <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{data?.project_title || "Project Details"}</h1>
                <p className="text-xs text-[#6B7280] dark:text-zinc-400 mt-0.5">ID: {data?.project_no || projectName} · <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FDF3F0] dark:bg-[#D97757]/20 text-[#D97757]">{data?.workflow_state || "Draft"}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Budget Summary in Header */}
              <div className="hidden lg:flex items-center gap-6 mr-6 border-r border-zinc-200 dark:border-zinc-800 pr-6">
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 dark:text-zinc-400 mb-0.5">Actual Balance</p>
                  {isBalanceLoading ? (
                    <div className="h-6 w-20 bg-zinc-200 dark:bg-zinc-700 animate-pulse rounded" />
                  ) : (
                    <p className="text-sm font-bold text-[#D97757] leading-none">₹ {actualBalance.toLocaleString('en-IN')}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 dark:text-zinc-400 mb-0.5">Commitable</p>
                  {isBalanceLoading ? (
                    <div className="h-6 w-20 bg-zinc-200 dark:bg-zinc-700 animate-pulse rounded" />
                  ) : (
                    <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300 leading-none">₹ {commitableBalance.toLocaleString('en-IN')}</p>
                  )}
                </div>
                {/* <button
                  onClick={() => setActiveTab('ledger')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#D97757] bg-[#FDF3F0] dark:bg-[#D97757]/20 hover:bg-[#B2DFDB] rounded-lg transition-colors"
                >
                  <LedgerIcon className="w-3.5 h-3.5" />
                  View Ledger
                </button> */}
              </div>

              {isCurrentUserPI && (
                <div className="flex gap-2">
                  <FrappeButton
                    onClick={handleAddFunds}
                    aria-label="Add funds to project"
                  >
                    <PlusIcon className="h-3.5 w-3.5" /> Add Funds
                  </FrappeButton>
                  {/* Only show Add Sanction button if no sanction exists */}
                  {(!sanctionData?.message || sanctionData.message.length === 0) && (
                    <FrappeButton
                      onClick={handleAddSanctionDetails}
                      variant="outline"
                      aria-label="Add sanction details"
                    >
                      <FilePlusIcon className="h-3.5 w-3.5" /> Add Sanction
                    </FrappeButton>
                  )}
                </div>
              )}
              <WorkflowActions docname={projectName!} onAction={handleWorkflowAction} isLoading={isActionLoading} />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Main Content Column */}
          <div className="lg:col-span-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="border-b border-zinc-200 dark:border-zinc-800 p-2">
              <nav className="frappe-tabs" aria-label="Page tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      sessionStorage.setItem(`mainTab_${projectName}`, tab.id);
                    }}
                    aria-selected={activeTab === tab.id}
                    className={cn(
                      "frappe-tab flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-bold",
                      activeTab === tab.id && "active bg-[#FDF3F0] dark:bg-[#D97757]/20 text-[#D97757] dark:bg-[#D97757]/20"

                    )}
                  >
                    <tab.icon className="h-3.5 w-3.5" /> {tab.label}
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
            <div className="bg-zinc-50/50 dark:bg-zinc-900/50 p-4">
              {activeTab === "overview" && (
                <div className="space-y-5">
                  {/* ... existing overview content ... */}
                  <SectionWrapper title="General Information" icon={FileTextIcon}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 divide-y md:divide-y-0">
                      <FieldDisplay label="Project Type" value={data?.project_type} icon={FileTextIcon} />
                      <FieldDisplay label="Project No" value={data?.project_no} icon={FileTextIcon} />
                      <FieldDisplay label="Implementation Dept" value={data?.implementation_department ? <DepartmentName name={data?.implementation_department} /> : null} icon={BuildingIcon} />
                      <FieldDisplay label="Status" value={data?.sanction_workflow_status} icon={TargetIcon} />
                      <FieldDisplay label="Project Duration" value={`${data?.project_duration_months}m ${data?.project_duration_days || 0}d`} icon={CalendarIcon} />
                      <FieldDisplay label="Start Date" value={data?.prj_start_date} icon={CalendarIcon} />
                      <FieldDisplay label="End Date" value={data?.prj_end_date} icon={CalendarIcon} />
                      <FieldDisplay label="International Travel" value={data?.involves_international_travel} icon={PlaneIcon} />
                      {data?.upload_proj_prop && (
                        <div className="py-2">
                          <div className="flex items-center gap-1.5 mb-1">
                            <FileTextIcon className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">Project Proposal</p>
                          </div>
                          <a
                            href={data.upload_proj_prop.startsWith('http') ? data.upload_proj_prop : `/files/${data.upload_proj_prop}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-[#D97757] hover:underline flex items-center gap-1"
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
                    <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 uppercase">Principal Investigator (PI)</h4>
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

                  {/* Enhanced Proposed Budget Breakup with Grand Total */}
                  {data?.proposed_budget_breakup && data.proposed_budget_breakup.length > 0 && (
                    <SectionWrapper title="Proposed Budget Breakup" icon={IndianRupeeIcon}>
                      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                          <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Budget Head</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Year 1</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Year 2</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Year 3</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Year 4</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Year 5</th>
                              <th className="px-4 py-3 text-right text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Total</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-800">
                            {data.proposed_budget_breakup.map((row: any, index: number) => (
                              <tr key={index} className="hover:bg-zinc-50 dark:bg-zinc-800/50">
                                <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{getBudgetHeadName(row.account_head)}</td>
                                <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 text-right whitespace-nowrap">{(row.first_year_budget || 0).toLocaleString('en-IN')}</td>
                                <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 text-right whitespace-nowrap">{(row.second_year_budget || 0).toLocaleString('en-IN')}</td>
                                <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 text-right whitespace-nowrap">{(row.third_year_budget || 0).toLocaleString('en-IN')}</td>
                                <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 text-right whitespace-nowrap">{(row.fourth_year_budget || 0).toLocaleString('en-IN')}</td>
                                <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 text-right whitespace-nowrap">{(row.fifth_year_budget || 0).toLocaleString('en-IN')}</td>
                                <td className="px-4 py-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100 text-right whitespace-nowrap">
                                  {((row.first_year_budget || 0) + (row.second_year_budget || 0) + (row.third_year_budget || 0) + (row.fourth_year_budget || 0) + (row.fifth_year_budget || 0)).toLocaleString('en-IN')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-zinc-100 dark:bg-zinc-800">
                            <tr>
                              <td className="px-4 py-3 text-sm font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">GRAND TOTAL</td>
                              <td className="px-4 py-3 text-sm font-bold text-zinc-900 dark:text-zinc-100 text-right whitespace-nowrap">{data.proposed_budget_breakup.reduce((sum: number, row: any) => sum + (row.first_year_budget || 0), 0).toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3 text-sm font-bold text-zinc-900 dark:text-zinc-100 text-right whitespace-nowrap">{data.proposed_budget_breakup.reduce((sum: number, row: any) => sum + (row.second_year_budget || 0), 0).toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3 text-sm font-bold text-zinc-900 dark:text-zinc-100 text-right whitespace-nowrap">{data.proposed_budget_breakup.reduce((sum: number, row: any) => sum + (row.third_year_budget || 0), 0).toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3 text-sm font-bold text-zinc-900 dark:text-zinc-100 text-right whitespace-nowrap">{data.proposed_budget_breakup.reduce((sum: number, row: any) => sum + (row.fourth_year_budget || 0), 0).toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3 text-sm font-bold text-zinc-900 dark:text-zinc-100 text-right whitespace-nowrap">{data.proposed_budget_breakup.reduce((sum: number, row: any) => sum + (row.fifth_year_budget || 0), 0).toLocaleString('en-IN')}</td>
                              <td className="px-4 py-3 text-sm font-bold text-[#D97757] text-right whitespace-nowrap">
                                ₹ {(data.total_budget_amount || data.proposed_budget_breakup.reduce((sum: number, row: any) =>
                                  sum + (row.first_year_budget || 0) + (row.second_year_budget || 0) + (row.third_year_budget || 0) + (row.fourth_year_budget || 0) + (row.fifth_year_budget || 0), 0
                                )).toLocaleString('en-IN')}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                      {/* Display total_budget_amount from project data */}
                      <div className="mt-4 p-4 bg-[#FDF3F0] dark:bg-[#D97757]/20 rounded-lg flex justify-between items-center">
                        <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase">Total Budget Amount (from proposal)</span>
                        <span className="text-xl font-bold text-[#D97757]">₹ {(data.total_budget_amount || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </SectionWrapper>
                  )}
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
                <div className="space-y-5">
                  {/* ... existing sanction details content ... */}
                  {sanctionIsLoading && <p>Loading Sanction Details...</p>}
                  {sanctionError && <p className="text-red-600">Error: {sanctionError.message}</p>}

                  {sanctionData?.message && sanctionData.message.length > 0 ? (
                    <>
                      {/* Sanction Selector - only show if more than 1 sanction */}
                      {sanctionData.message.length > 1 && (
                        <div className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Select Sanction:</label>
                          <select
                            value={selectedSanctionIndex}
                            onChange={(e) => setSelectedSanctionIndex(Number(e.target.value))}
                            className="flex-1 max-w-md px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757]"
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

                        const budgetColumnsAll = [
                          { fieldname: "account_head", label: "Account Head" },
                          { fieldname: "first_year_budget", label: "Year 1" },
                          { fieldname: "second_year_budget", label: "Year 2" },
                          { fieldname: "third_year_budget", label: "Year 3" },
                          { fieldname: "fourth_year_budget", label: "Year 4" },
                          { fieldname: "fifth_year_budget", label: "Year 5" },
                        ];
                        // Filter to only show years that have data
                        const budgetColumns = budgetColumnsAll.filter(c => {
                          if (c.fieldname === 'account_head') return true;
                          return (sanction.sanctioned_budget_breakup || []).some((row: any) => (parseFloat(row[c.fieldname]) || 0) > 0);
                        });
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
                            <div className="pb-4 border-b border-zinc-200 dark:border-zinc-800">
                              <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex-1">
                                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                    Sanction: {sanction.name}
                                  </h3>
                                  <div className="text-sm text-[#6B7280] dark:text-zinc-400 mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                                    <span className="inline-flex items-center gap-1.5">
                                      Status: <span className={cn("font-medium px-2.5 py-0.5 rounded-full text-xs", getStatusBadgeClass(sanction.sanction_workflow_status))}>{sanction.sanction_workflow_status || 'DRAFT'}</span>
                                    </span>
                                    <span>
                                      Letter No: <span className="font-medium text-zinc-700 dark:text-zinc-300">{sanction.sanctioned_letter_no}</span>
                                    </span>
                                    <span>
                                      Date: <span className="font-medium text-zinc-700 dark:text-zinc-300">{sanction.sanctioned_letter_date}</span>
                                    </span>
                                    <span>
                                      Amount: <span className="font-semibold text-[#D97757]">{(sanction.total_sanctioned_amount || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
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
                                <div className="flex items-start gap-3 p-4 border border-yellow-400 rounded-lg bg-[#FFFDF5] dark:bg-yellow-900/20 shadow-sm">
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
                                <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-3">Budget Breakup</h4>
                                <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                                  <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                                    <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                                      <tr>
                                        {budgetColumns.map(c => (
                                          <th key={c.fieldname} className={`px-4 py-3 text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider ${c.fieldname === 'account_head' ? 'text-left' : 'text-right'}`}>{c.label}</th>
                                        ))}
                                        <th className="px-4 py-3 text-right text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">Total</th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-800">
                                      {(sanction.sanctioned_budget_breakup || []).map((row: any, i: number) => {
                                        const rowTotal = budgetYearFieldnames.reduce((sum, fieldname) => {
                                          return sum + (parseFloat(row[fieldname]) || 0);
                                        }, 0);

                                        return (
                                          <tr key={i} className="hover:bg-zinc-50 dark:bg-zinc-800/50">
                                            {budgetColumns.map(c => (
                                              <td key={c.fieldname} className={`px-4 py-3 text-sm whitespace-nowrap ${c.fieldname === 'account_head' ? 'text-zinc-900 dark:text-zinc-100 text-left' : 'text-zinc-700 dark:text-zinc-300 text-right'}`}>
                                                {c.fieldname === 'account_head' ? row[c.fieldname] : (parseFloat(row[c.fieldname]) || 0).toLocaleString('en-IN')}
                                              </td>
                                            ))}
                                            <td className="px-4 py-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100 text-right whitespace-nowrap">{rowTotal.toLocaleString('en-IN')}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                    <tfoot className="bg-zinc-100 dark:bg-zinc-800">
                                      <tr>
                                        <td className="px-4 py-3 text-sm font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">Total</td>
                                        {budgetYearFieldnames.map(fieldname => (
                                          <td key={fieldname} className="px-4 py-3 text-sm font-bold text-zinc-900 dark:text-zinc-100 text-right whitespace-nowrap">
                                            {columnTotals[fieldname].toLocaleString('en-IN')}
                                          </td>
                                        ))}
                                        <td className="px-4 py-3 text-sm font-bold text-[#D97757] text-right whitespace-nowrap">
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
                                <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-3">Attached Files</h4>
                                <div className="space-y-2">
                                  {sanction.sanction_related_files.map((file: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between gap-4 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-zinc-800 dark:text-zinc-200 text-sm truncate">{file.file_name || 'File'}</p>
                                        <p className="text-xs text-[#6B7280] dark:text-zinc-400">{file.description}</p>
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
                    <div className="text-center py-16 text-[#6B7280] dark:text-zinc-400 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                      <CreditCardIcon className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                      <p className="font-medium text-zinc-700 dark:text-zinc-300">No Sanction Details Found</p>
                      <p className="text-sm mt-1">Click "Add Sanction" to create the first entry.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Disbursal Tab Removed */}

              {/* --- LEDGER TAB CONTENT --- */}
              {activeTab === "ledger" && (
                <div className="space-y-6">
                  {/* Ledger Head Tabs */}
                  {/* Ledger Head Tabs and Actions */}
                  <div className="bg-white dark:bg-zinc-900 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between gap-4">
                    <div className="flex space-x-2 overflow-x-auto hide-scrollbar">
                      {isCheckingHeads ? (
                        <div className="px-4 py-2 text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#D97757]"></div>
                          Checking account heads...
                        </div>
                      ) : ledgerHeads.length > 0 ? (
                        ledgerHeads.map((head: { name: string; id: string | number }) => (
                          <button
                            key={head.id}
                            onClick={() => setActiveLedgerHeadId(head.id)}
                            className={cn(
                              "px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                              activeLedgerHeadId === head.id
                                ? "bg-[#FDF3F0] dark:bg-[#D97757]/20 text-[#D97757]"
                                : "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:bg-zinc-800"
                            )}
                          >
                            {head.name}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-sm text-zinc-500 dark:text-zinc-400">No account heads with transactions found</div>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0 h-9 w-9 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                      onClick={() => navigate(`/project-ledger-full/${targetProjectNumber || projectName}`)}
                      title="Open Full Ledger"
                    >
                      <ExternalLinkIcon className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Ledger Table */}
                  <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden min-h-[300px]">
                    {isLedgerLoading ? (
                      <div className="flex flex-col items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D97757] mb-4"></div>
                        <p className="text-zinc-500 dark:text-zinc-400">Loading ledger...</p>
                      </div>
                    ) : ledgerError ? (
                      <div className="flex flex-col items-center justify-center py-20">
                        <p className="text-red-500 font-medium mb-2">Failed to load data</p>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">{ledgerError}</p>
                        <button onClick={() => fetchLedgerData(activeLedgerHeadId)} className="mt-4 text-[#D97757] hover:underline text-sm font-medium">Try Again</button>
                      </div>
                    ) : ledgerTransactions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20">
                        <FileTextIcon className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mb-3" />
                        <p className="text-zinc-500 dark:text-zinc-400">No transactions found</p>
                      </div>
                    ) : (
                      <div className="overflow-auto max-h-[70vh]">
                        <table className="w-full text-sm text-left">
                          <thead className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-800/50 shadow-sm">
                            <tr>
                              <th className="px-3 py-1.5 font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 uppercase text-[10px]">TID</th>
                              <th className="px-3 py-1.5 font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 uppercase text-[10px]">Date</th>
                              <th className="px-3 py-1.5 font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 uppercase text-[10px]">Particulars</th>
                              <th className="px-3 py-1.5 font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 uppercase text-[10px]">BMR</th>
                              <th className="px-3 py-1.5 font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 uppercase text-[10px] text-right">Fund Received</th>
                              <th className="px-3 py-1.5 font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 uppercase text-[10px] text-right">Commit Amt</th>
                              <th className="px-3 py-1.5 font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 uppercase text-[10px] text-right">Commitable Bal</th>
                              <th className="px-3 py-1.5 font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 uppercase text-[10px] text-right">Payment Amt</th>
                              <th className="px-3 py-1.5 font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 uppercase text-[10px] text-right">Payment Bal</th>
                              <th className="px-3 py-1.5 font-semibold text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 uppercase text-[10px] text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {ledgerTransactions.map((txn) => (
                              <tr key={txn.transactionId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                <td className="px-3 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-mono whitespace-nowrap">{txn.transactionId || '-'}</td>
                                <td className="px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                                  {txn.transactionDate ? new Date(txn.transactionDate).toLocaleDateString('en-IN') : '-'}
                                </td>
                                <td className="px-3 py-1.5 text-xs text-zinc-900 dark:text-zinc-100">
                                  <div className="max-w-[180px] truncate" title={txn.particulars}>{txn.particulars}</div>
                                  {txn.refDetails && <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate max-w-[180px]">{txn.refDetails}</div>}
                                </td>
                                <td className="px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{txn.bmr || '-'}</td>
                                <td className="px-3 py-1.5 text-xs text-right font-medium text-green-600 whitespace-nowrap">
                                  {txn.fundReceivedAmount ? `₹${txn.fundReceivedAmount.toLocaleString('en-IN')}` : '-'}
                                </td>
                                <td className="px-3 py-1.5 text-xs text-right font-medium text-red-600 whitespace-nowrap">
                                  {txn.commitAmount ? `₹${txn.commitAmount.toLocaleString('en-IN')}` : '-'}
                                </td>
                                <td className="px-3 py-1.5 text-xs text-right font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                                  {txn.commitableBalance ? `₹${txn.commitableBalance.toLocaleString('en-IN')}` : '-'}
                                </td>
                                <td className="px-3 py-1.5 text-xs text-right font-medium text-red-600 whitespace-nowrap">
                                  {txn.paymentAmount ? `₹${txn.paymentAmount.toLocaleString('en-IN')}` : '-'}
                                </td>
                                <td className="px-3 py-1.5 text-xs text-right font-bold text-[#D97757] whitespace-nowrap">
                                  {txn.paymentBalance ? `₹${txn.paymentBalance.toLocaleString('en-IN')}` : '0'}
                                </td>
                                <td className="px-3 py-1.5 text-center">
                                  <span className={cn(
                                    "inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap",
                                    txn.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                      txn.status === 'PARTIALLY_PAID' ? 'bg-yellow-100 text-yellow-700' :
                                        txn.status === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                                          'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
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
                <QuickActions
                  projectName={projectName || ''}
                  projectNo={data?.project_no || data?.project_number}
                  projectTitle={data?.project_title || ''}
                  onNavigate={navigate}
                  onSwitchTab={(tab) => {
                    setActiveTab(tab);
                    sessionStorage.setItem(`mainTab_${projectName}`, tab);
                  }}
                />
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
                  className="text-xs font-normal text-zinc-500 dark:text-zinc-400 cursor-pointer hover:text-[#D97757]"
                  onClick={() => setActiveTab('activity')}
                >
                  View All
                </span>
              </h3>
              {activityData?.message && activityData.message.length > 0 ? (
                <div className="space-y-3 max-h-[100px] overflow-y-auto pr-1 custom-scrollbar">
                  {activityData.message.map((activity, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[#FDF3F0] dark:bg-[#D97757]/20 flex items-center justify-center font-bold text-[#D97757] text-xs">
                        {activity.owner?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <div className="min-w-0">
                        <div
                          className="text-sm text-zinc-800 dark:text-zinc-200 line-clamp-2 prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: activity.content }}
                        />
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {activity.owner} · {activity.creation ? new Date(activity.creation).toLocaleString() : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 italic">No recent activity found.</p>
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

            {/* Section 3: Commits - Only visible on Application tab */}
            {isRnDStaff && activeTab === 'quick-actions' && (
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
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      Available: <span className="font-medium text-[#D97757]">{actualBalance.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</span>
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
                  {/* <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-2">
                    <button
                      onClick={() => setIsLedgerOpen(true)}
                      className="w-full text-center text-sm font-medium text-[#D97757] hover:text-[#D97757] hover:underline"
                    >
                      View Project Ledger
                    </button>
                  </div> */}
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
                  <div className="mb-4 border-b border-zinc-200 dark:border-zinc-800">
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
                                ? "border-[#D97757] text-[#D97757] bg-[#FDF3F0] dark:bg-[#D97757]/20"
                                : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:bg-zinc-800/50"
                            )}
                          >
                            <span className="flex items-center gap-2">
                              {tab}
                              <span className={cn(
                                "px-1.5 py-0.5 text-xs rounded-full",
                                activeLedgerTab === tab ? "bg-[#D97757] text-white" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
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
                      <div className="mb-4 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-800 flex flex-wrap gap-6">
                        <div>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase font-semibold">Total Received</span>
                          <p className="text-sm font-bold text-green-600">
                            ₹ {filteredLedgerData.reduce((acc, e) => acc + (e.received || 0), 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase font-semibold">Total Committed</span>
                          <p className="text-sm font-bold text-red-600">
                            ₹ {filteredLedgerData.reduce((acc, e) => acc + (e.committed || 0), 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase font-semibold">Available Balance</span>
                          <p className="text-sm font-bold text-[#D97757]">
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
                          <th>TID</th>
                          <th>Date</th>
                          <th>Particulars</th>
                          <th>BMR</th>
                          <th style={{ textAlign: 'right' }}>Fund Received</th>
                          <th style={{ textAlign: 'right' }}>Commit Amt</th>
                          <th style={{ textAlign: 'right' }}>Commitable Bal</th>
                          <th style={{ textAlign: 'right' }}>Payment Amt</th>
                          <th style={{ textAlign: 'right' }}>Payment Bal</th>
                          <th>Status</th>
                          <th>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLedgerData.length === 0 ? (
                          <tr>
                            <td colSpan={11} className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                              No entries found for {activeLedgerTab}
                            </td>
                          </tr>
                        ) : (
                          filteredLedgerData.map((row, index) => (
                            <tr key={index}>
                              <td>{row.sl}</td>
                              <td>{row.date}</td>
                              <td>{row.particulars}</td>
                              <td>{row.bmr}</td>
                              <td style={{ textAlign: 'right' }} className={row.received ? "text-green-600 font-medium" : ""}>{row.received ? row.received.toLocaleString('en-IN') : '-'}</td>
                              <td style={{ textAlign: 'right' }} className={row.committed ? "text-red-600 font-medium" : ""}>{row.committed ? row.committed.toLocaleString('en-IN') : '-'}</td>
                              <td style={{ textAlign: 'right' }} className="font-semibold text-zinc-900 dark:text-zinc-100">{row.commitableBalance?.toLocaleString('en-IN')}</td>
                              <td style={{ textAlign: 'right' }} className={row.payment ? "text-red-600 font-medium" : ""}>{row.payment ? row.payment.toLocaleString('en-IN') : '-'}</td>
                              <td style={{ textAlign: 'right' }} className="font-semibold text-zinc-900 dark:text-zinc-100">
                                {activeLedgerTab === "All"
                                  ? row.actualBalance?.toLocaleString('en-IN')
                                  : (row as any).headActualBalance?.toLocaleString('en-IN')
                                }
                              </td>
                              <td>
                                <span className={(row as any).status === 'Paid' ? 'text-green-600 font-medium' : (row as any).status === 'Pending' ? 'text-amber-600 font-medium' : ''}>
                                  {(row as any).status || '-'}
                                </span>
                              </td>
                              <td>
                                {row.committed > 0 && !row.payment && (
                                  // Restrict "Pay" button to RnD Staff roles
                                  (isRnDStaff) && (
                                    <button
                                      onClick={() => openPaymentModal(row)}
                                      className="px-3 py-1.5 text-xs font-semibold text-white bg-[#D97757] hover:bg-[#C66A4E] rounded-md shadow-sm transition-colors"
                                    >
                                      Pay
                                    </button>
                                  )
                                )}
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
    <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen">

      <main className="flex-1 p-3 md:p-6 w-full">
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

      {/* Payment Form Modal */}
      {paymentModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setPaymentModalOpen(false)}>
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Record Payment</h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">Submit payment for committed amount</p>
              </div>
              <button onClick={() => setPaymentModalOpen(false)} className="p-2 hover:bg-zinc-200 dark:bg-zinc-700 rounded-full transition-colors">
                <X className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-6 space-y-4">
              {paymentFieldDefs.filter((f: any) => !f.hidden).map((field: any) => {
                const value = paymentFormData[field.fieldname] || '';
                const options = paymentLinkOptions[field.fieldname] || [];

                if (field.fieldtype === 'Section Break') {
                  return (
                    <div key={field.fieldname} className="pt-4 border-t border-zinc-200 dark:border-zinc-800 first:border-0 first:pt-0">
                      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">{field.label}</h3>
                    </div>
                  );
                }

                return (
                  <div key={field.fieldname}>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      {field.label} {field.mandatory ? <span className="text-red-500">*</span> : ''}
                    </label>

                    {/* Select for Select/Link fieldtypes */}
                    {(field.fieldtype === 'Select' || field.fieldtype === 'Link') ? (
                      <select
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757]"
                        value={value}
                        onChange={(e) => handlePaymentFieldChange(field.fieldname, e.target.value)}
                        disabled={field.read_only}
                      >
                        <option value="">Select {field.label}...</option>
                        {options.map((opt: any) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label || opt.value}
                          </option>
                        ))}
                      </select>
                    ) : field.fieldtype === 'Date' ? (
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757]"
                        value={value}
                        onChange={(e) => handlePaymentFieldChange(field.fieldname, e.target.value)}
                        disabled={field.read_only}
                      />
                    ) : field.fieldtype === 'Currency' ? (
                      <input
                        type="number"
                        step="0.01"
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757]"
                        value={value}
                        onChange={(e) => handlePaymentFieldChange(field.fieldname, parseFloat(e.target.value) || 0)}
                        disabled={field.read_only}
                        placeholder="0.00"
                      />
                    ) : (
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757]"
                        value={value}
                        onChange={(e) => handlePaymentFieldChange(field.fieldname, e.target.value)}
                        disabled={field.read_only}
                        placeholder={field.description || ''}
                      />
                    )}
                    {field.description && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{field.description}</p>}
                  </div>
                );
              })}

              {/* Commitment Info */}
              {selectedCommitmentForPayment && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-800 mb-2">Commitment Details</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-blue-600">Particulars:</span> <span className="text-blue-900">{selectedCommitmentForPayment.particulars}</span></div>
                    <div><span className="text-blue-600">Committed:</span> <span className="font-bold text-blue-900">₹{selectedCommitmentForPayment.committed?.toLocaleString('en-IN')}</span></div>
                    <div><span className="text-blue-600">BMR:</span> <span className="text-blue-900">{selectedCommitmentForPayment.bmr || '-'}</span></div>
                    <div><span className="text-blue-600">Head:</span> <span className="text-blue-900">{(selectedCommitmentForPayment as any).head || '-'}</span></div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:bg-zinc-800/50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitPayment}
                disabled={isPaymentSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-[#D97757] rounded-lg hover:bg-[#C66A4E] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPaymentSubmitting ? 'Submitting...' : 'Submit Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetailsOverview;

