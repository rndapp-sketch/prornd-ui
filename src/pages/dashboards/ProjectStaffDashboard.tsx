import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  useFrappeAuth,
  useFrappeGetDoc,
  useFrappeGetCall,
  useFrappeGetDocList,
} from "frappe-react-sdk";
import { AnalyticsCard, CurrentTime } from "../../components/DashboardCards";
import { cn } from "@/lib/utils";
import {
  ClipboardCheck,
  Briefcase,
  BarChart,
  Layers,
  AlertCircle,
  Zap,
  Activity,
  Clock,
  ArrowRight,
  ChevronRight,
  Mail,
  User as UserIcon,
  IdCard,
  Receipt,
  Wallet,
  RotateCcw,
  ShoppingCart,
  FileText,
  Search,
  ListTodo,
  Eye,
  CheckCircle2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { resignationAPI, extensionAPI } from "@/services/apiService";

// --- Interfaces ---
interface TaskRecord {
  name: string;
  title: string;
  status: string;
  creation: string;
  modified: string;
  owner: string;
}

interface TaskGroup {
  doctype: string;
  records: TaskRecord[];
  mod_vis?: number;
}

interface PendingTaskResponse {
  message: {
    page: string;
    status_value: string;
    results: TaskGroup[];
  };
}

interface TaskRegistryResponse {
  message: {
    results: TaskGroup[];
    pagination: any;
    filters: any;
  };
}

interface BasicDetailsRecord {
  name: string;
  erp_mail?: string;
  ps_first_name?: string;
  ps_middle_name?: string;
  ps_last_name?: string;
  ps_fathers_name?: string;
  ps_gender?: string;
  ps_date_of_birth?: string;
  ps_blood_group?: string;
  ps_maritial_status?: string;
  ps_citizenship?: string;
  ps_phone_number?: string;
  ps_email_id?: string;
  ps_present_address?: string;
  ps_permanent_address?: string;
  ps_department?: string;
  ps_department_name?: string;
  ps_designation?: string;
  ps_emp_id?: string;
  project_no?: string;
  ps_joining_date?: string;
  ps_term_completion_date?: string;
  bank_account_number?: string;
  ps_aadhar_number?: string;
  ps_pan?: string;
  ps_photo?: string;
  username?: string;
  full_name?: string;
  email?: string;
}

// --- Helpers ---
const getStatusStyle = (status: string) => {
  const s = status?.toLowerCase() || "";
  if (
    ["pending", "under review", "approval pending"].some((t) => s.includes(t))
  )
    return "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400";
  if (s.includes("approved") || s.includes("verified"))
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400";
  if (s.includes("draft"))
    return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
  if (s.includes("rejected"))
    return "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400";
  if (
    s.includes("forwarded") ||
    s.includes("processed") ||
    s.includes("generated")
  )
    return "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400";
  return "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400";
};

const getTaskRoute = (doctype: string, id: string) => {
  if (doctype === "Fund Received") return `/fund-received/${id}`;
  if (doctype === "Reimbursement") return `/reimbursement/${id}`;
  if (doctype === "Advance Settlement") return `/advance-settlement/${id}`;
  if (doctype === "Temporary Advance")
    return `/pending-tasks/${encodeURIComponent(doctype)}/${id}`;
  if (doctype === "Project Staff Details")
    return `/project-staff-joining?docname=${encodeURIComponent(id)}`;
  return `/pending-tasks/${doctype}/${id}`;
};

const formatRelativeTime = (dateStr: string) => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

// --- Application Module Groups ---
const applicationGroups = [
  {
    group: "Purchase",
    icon: ShoppingCart,
    color: {
      icon: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
    items: [
      {
        label: "Direct Purchase",
        description: "Raise a direct purchase request",
        icon: ShoppingCart,
        path: "/direct-purchase",
      },
      {
        label: "Indent General Form",
        description: "Submit a general indent request",
        icon: FileText,
        path: "/indent-general-form",
      },
      {
        label: "Indent Cum Sanction Sheet",
        description: "Submit indent with sanction details",
        icon: Receipt,
        path: "/indent-cum-sanction-sheet",
      },
    ],
  },
  {
    group: "Advance",
    icon: Wallet,
    color: {
      icon: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/20",
    },
    items: [
      {
        label: "Temporary Advance",
        description: "Apply for a temporary advance",
        icon: Wallet,
        path: "/temporary-advance",
      },
      {
        label: "Advance Settlement",
        description: "Settle a previously taken advance",
        icon: RotateCcw,
        path: "/advance-settlement",
      },
    ],
  },
  {
    group: "Reimbursement",
    icon: Receipt,
    color: {
      icon: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    items: [
      {
        label: "Reimbursement",
        description: "Claim expense reimbursement",
        icon: Receipt,
        path: "/reimbursement",
      },
    ],
  },
  {
    group: "Staff Services",
    icon: UserIcon,
    color: {
      icon: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-900/20",
    },
    items: [
      {
        label: "ID Card Request",
        description: "Request your Employee ID Card",
        icon: IdCard,
        path: "/id-card-request",
      },
      {
        label: "Project Staff Extension",
        description: "Apply for extension of project staff tenure",
        icon: Clock,
        path: "/project-staff-extension",
      },
      {
        label: "Project Staff Resignation",
        description: "Submit project staff resignation request",
        icon: FileText,
        path: "/project-staff-resignation",
      },
    ],
  },
];

// --- Main Component ---
export function ProjectStaffDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "";
  const { currentUser } = useFrappeAuth();
  const { data: userData } = useFrappeGetDoc("User", currentUser ?? "", {
    fields: ["full_name"],
    enabled: !!currentUser,
  });

  // Basic Details (joined via username = part of erp_mail before '@')
  const { data: basicResp, isLoading: basicLoading } = useFrappeGetCall<{
    message: BasicDetailsRecord | null;
  }>(
    "rndopsapp.rndopsapp.doctype.project_staff_details.project_staff_details.get_my_basic_details",
    undefined,
    currentUser ? undefined : null,
  );
  const basic = basicResp?.message ?? undefined;
  const basicFullName = basic
    ? [basic.ps_first_name, basic.ps_middle_name, basic.ps_last_name]
        .filter(Boolean)
        .join(" ")
    : "";

  // Fetch Pending Tasks
  const { data: pendingData, isLoading: pendingLoading } =
    useFrappeGetCall<PendingTaskResponse>(
      "rndopsapp.rndopsapp.doctype.module_registry.module_registry.get_pending_task",
      { page_name: "pending-task" },
    );

  // Fetch Task Registry
  const { data: registryData, isLoading: registryLoading } =
    useFrappeGetCall<TaskRegistryResponse>(
      "rndopsapp.rndopsapp.doctype.module_registry.module_registry.get_task_registry",
      { page_name: "task-registry" },
    );

  const fullName = userData?.full_name || currentUser || "Guest";
  const isLoading = pendingLoading || registryLoading;

  // Parallel list queries for all forms owned by current user
  const dpResult = useFrappeGetDocList<any>("Direct Purchase", {
    fields: ["name", "workflow_state", "modified", "creation", "owner"],
    filters: currentUser
      ? [["owner", "=", currentUser]]
      : [["name", "=", "NON_EXISTENT"]],
    limit: 100,
  });

  const igResult = useFrappeGetDocList<any>("Indent General Form", {
    fields: ["name", "workflow_state", "modified", "creation", "owner"],
    filters: currentUser
      ? [["owner", "=", currentUser]]
      : [["name", "=", "NON_EXISTENT"]],
    limit: 100,
  });

  const icResult = useFrappeGetDocList<any>("Indent Cum Sanction Sheet", {
    fields: ["name", "workflow_state", "modified", "creation", "owner"],
    filters: currentUser
      ? [["owner", "=", currentUser]]
      : [["name", "=", "NON_EXISTENT"]],
    limit: 100,
  });

  const taResult = useFrappeGetDocList<any>("Temporary Advance", {
    fields: ["name", "workflow_state", "modified", "creation", "owner"],
    filters: currentUser
      ? [["owner", "=", currentUser]]
      : [["name", "=", "NON_EXISTENT"]],
    limit: 100,
  });

  const asResult = useFrappeGetDocList<any>("Advance Settlement", {
    fields: ["name", "workflow_state", "modified", "creation", "owner"],
    filters: currentUser
      ? [["owner", "=", currentUser]]
      : [["name", "=", "NON_EXISTENT"]],
    limit: 100,
  });

  const rbResult = useFrappeGetDocList<any>("Reimbursement", {
    fields: ["name", "workflow_state", "modified", "creation", "owner"],
    filters: currentUser
      ? [["owner", "=", currentUser]]
      : [["name", "=", "NON_EXISTENT"]],
    limit: 100,
  });

  const trResult = useFrappeGetDocList<any>("Travel", {
    fields: ["name", "workflow_state", "modified", "creation", "owner"],
    filters: currentUser
      ? [["owner", "=", currentUser]]
      : [["name", "=", "NON_EXISTENT"]],
    limit: 100,
  });

  const tdResult = useFrappeGetDocList<any>("TA DA Settlement", {
    fields: ["name", "workflow_state", "modified", "creation", "owner"],
    filters: currentUser
      ? [["owner", "=", currentUser]]
      : [["name", "=", "NON_EXISTENT"]],
    limit: 100,
  });
  const { data: rsListResp, isLoading: rsLoading } = useFrappeGetCall<any>(
    resignationAPI.getList,
    undefined,
    currentUser ? undefined : null,
    { revalidateOnFocus: false },
  );

  const { data: exListResp, isLoading: exLoading } = useFrappeGetCall<any>(
    extensionAPI.getList,
    undefined,
    currentUser ? undefined : null,
    { revalidateOnFocus: false },
  );

  const lvResult = useFrappeGetDocList<any>("Leave Module", {
    fields: ["name", "workflow_state", "modified", "creation", "owner"],
    filters: currentUser
      ? [["owner", "=", currentUser]]
      : [["name", "=", "NON_EXISTENT"]],
    limit: 100,
  });

  const peResult = useFrappeGetDocList<any>("Project Staff Extension", {
    fields: [
      "name",
      "workflow_state",
      "modified",
      "creation",
      "owner",
      "ex_emp_id",
    ],
    filters: currentUser
      ? [["owner", "=", currentUser]]
      : [["name", "=", "NON_EXISTENT"]],
    limit: 100,
  });

  const { data: myIdCardDetailsResp, isLoading: idCardLoading } =
    useFrappeGetCall<any>(
      "rndopsapp.rndopsapp.doctype.employee_id_card.employee_id_card.get_my_id_card_details",
      undefined,
      currentUser ? undefined : null,
    );

  const myIdCardList = React.useMemo(() => {
    if (Array.isArray(myIdCardDetailsResp?.message))
      return myIdCardDetailsResp.message;
    if (Array.isArray(myIdCardDetailsResp)) return myIdCardDetailsResp;
    return [];
  }, [myIdCardDetailsResp]);

  const returnedIdCardAlert = React.useMemo(() => {
    if (!myIdCardList || !Array.isArray(myIdCardList)) return null;
    return myIdCardList.find(
      (d: any) =>
        (d.workflow_state === "Draft" || !d.workflow_state) &&
        (d.remarks || d.hr_comments),
    );
  }, [myIdCardList]);

  const activeIdCardAlert = React.useMemo(() => {
    if (
      !myIdCardList ||
      !Array.isArray(myIdCardList) ||
      myIdCardList.length === 0
    )
      return null;
    const doc = myIdCardList[0];
    const st = (doc?.workflow_state || "").toLowerCase();
    if (st.includes("verified")) {
      return { type: "verified", doc };
    }
    if (st.includes("generated")) {
      return { type: "generated", doc };
    }
    return null;
  }, [myIdCardList]);

  const trackingLoading =
    dpResult.isLoading ||
    igResult.isLoading ||
    icResult.isLoading ||
    taResult.isLoading ||
    asResult.isLoading ||
    rbResult.isLoading ||
    trResult.isLoading ||
    tdResult.isLoading ||
    rsLoading ||
    exLoading ||
    peResult.isLoading ||
    lvResult.isLoading ||
    idCardLoading;
  const [searchTerm, setSearchTerm] = React.useState("");
  const [actionSearch, setActionSearch] = React.useState("");
  const [selectedDoctype, setSelectedDoctype] = React.useState("All");
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  const trackingItems = React.useMemo(() => {
    const items: {
      id: string;
      doctype: string;
      workflow_state: string;
      modified: string;
      creation: string;
      route: string;
    }[] = [];

    const formatState = (state?: string) => state || "Draft";
    const extSeen = new Set<string>();

    if (dpResult.data) {
      dpResult.data.forEach((d) =>
        items.push({
          id: d.name,
          doctype: "Direct Purchase",
          workflow_state: formatState(d.workflow_state),
          modified: d.modified,
          creation: d.creation,
          route: `/direct-purchase/${d.name}`,
        }),
      );
    }
    if (igResult.data) {
      igResult.data.forEach((d) =>
        items.push({
          id: d.name,
          doctype: "Indent General Form",
          workflow_state: formatState(d.workflow_state),
          modified: d.modified,
          creation: d.creation,
          route: `/indent-general-form-details/${d.name}`,
        }),
      );
    }
    if (icResult.data) {
      icResult.data.forEach((d) =>
        items.push({
          id: d.name,
          doctype: "Indent Cum Sanction Sheet",
          workflow_state: formatState(d.workflow_state),
          modified: d.modified,
          creation: d.creation,
          route: `/indent-cum-sanction-sheet?edit=${d.name}`,
        }),
      );
    }
    if (taResult.data) {
      taResult.data.forEach((d) =>
        items.push({
          id: d.name,
          doctype: "Temporary Advance",
          workflow_state: formatState(d.workflow_state),
          modified: d.modified,
          creation: d.creation,
          route: `/temporary-advance/${d.name}`,
        }),
      );
    }
    if (asResult.data) {
      asResult.data.forEach((d) =>
        items.push({
          id: d.name,
          doctype: "Advance Settlement",
          workflow_state: formatState(d.workflow_state),
          modified: d.modified,
          creation: d.creation,
          route: `/advance-settlement/${d.name}`,
        }),
      );
    }
    if (rbResult.data) {
      rbResult.data.forEach((d) =>
        items.push({
          id: d.name,
          doctype: "Reimbursement",
          workflow_state: formatState(d.workflow_state),
          modified: d.modified,
          creation: d.creation,
          route: `/reimbursement/${d.name}`,
        }),
      );
    }
    if (trResult.data) {
      trResult.data.forEach((d) =>
        items.push({
          id: d.name,
          doctype: "Travel",
          workflow_state: formatState(d.workflow_state),
          modified: d.modified,
          creation: d.creation,
          route: `/travel/${d.name}`,
        }),
      );
    }
    if (tdResult.data) {
      tdResult.data.forEach((d) =>
        items.push({
          id: d.name,
          doctype: "TA DA Settlement",
          workflow_state: formatState(d.workflow_state),
          modified: d.modified,
          creation: d.creation,
          route: `/ta-da-settlement?edit=${d.name}`,
        }),
      );
    }
    if (rsListResp?.message?.data) {
      rsListResp.message.data.forEach((d: any) => {
        const isMine =
          (basic?.erp_mail && d.applicant_email_id === basic.erp_mail) ||
          d.owner === currentUser ||
          (currentUser &&
            d.applicant_email_id?.startsWith(currentUser.split("@")[0]));
        if (isMine) {
          items.push({
            id: d.name,
            doctype: "Project Staff Resignation",
            workflow_state: formatState(d.workflow_state),
            modified:
              d.modified || d.resignation_date || new Date().toISOString(),
            creation:
              d.creation || d.resignation_date || new Date().toISOString(),
            route: `/project-staff-resignation?edit=${d.name}`,
          });
        }
      });
    }

    if (peResult.data) {
      peResult.data.forEach((d) => {
        extSeen.add(d.name);
        items.push({
          id: d.name,
          doctype: "Project Staff Extension",
          workflow_state: formatState(d.workflow_state),
          modified: d.modified,
          creation: d.creation,
          route: `/project-staff-extension?edit=${d.name}`,
        });
      });
    }

    const rawExtData =
      exListResp?.message?.data || exListResp?.message || exListResp?.data;
    if (Array.isArray(rawExtData)) {
      rawExtData.forEach((d: any) => {
        if (extSeen.has(d.name)) return;
        const isMine =
          (basic?.ps_emp_id && d.ex_emp_id === basic.ps_emp_id) ||
          d.owner === currentUser ||
          (currentUser && d.ex_emp_id === basic?.ps_emp_id) ||
          (currentUser && d.owner === currentUser) ||
          (currentUser &&
            d.owner?.toLowerCase() === currentUser?.toLowerCase());
        if (isMine) {
          extSeen.add(d.name);
          items.push({
            id: d.name,
            doctype: "Project Staff Extension",
            workflow_state: formatState(d.workflow_state),
            modified: d.modified || new Date().toISOString(),
            creation: d.creation || d.modified || new Date().toISOString(),
            route: `/project-staff-extension?edit=${d.name}`,
          });
        }
      });
    }

    if (lvResult.data) {
      lvResult.data.forEach((d) =>
        items.push({
          id: d.name,
          doctype: "Leave Module",
          workflow_state: formatState(d.workflow_state),
          modified: d.modified,
          creation: d.creation,
          route: `/leave-module`,
        }),
      );
    }

    if (myIdCardList && myIdCardList.length > 0) {
      myIdCardList.forEach((d: any) =>
        items.push({
          id: d.name,
          doctype: "Employee ID Card",
          workflow_state: formatState(d.workflow_state),
          modified: d.modified,
          creation: d.creation,
          route: `/id-card-request?edit=${d.name}`,
        }),
      );
    }

    return items.sort(
      (a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime(),
    );
  }, [
    dpResult.data,
    igResult.data,
    icResult.data,
    taResult.data,
    asResult.data,
    rbResult.data,
    trResult.data,
    tdResult.data,
    rsListResp,
    exListResp,
    peResult.data,
    lvResult.data,
    myIdCardList,
    basic?.erp_mail,
    basic?.ps_emp_id,
    currentUser,
  ]);

  const filteredItems = React.useMemo(() => {
    return trackingItems.filter((item) => {
      const matchesSearch =
        item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.doctype.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.workflow_state.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDoctype =
        selectedDoctype === "All" || item.doctype === selectedDoctype;

      return matchesSearch && matchesDoctype;
    });
  }, [trackingItems, searchTerm, selectedDoctype]);

  const paginatedItems = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredItems, currentPage]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const uniqueDoctypes = React.useMemo(() => {
    const list = new Set<string>();
    trackingItems.forEach((item) => list.add(item.doctype));
    return ["All", ...Array.from(list)];
  }, [trackingItems]);

  const totalActionsCount = React.useMemo(
    () => applicationGroups.reduce((sum, g) => sum + g.items.length, 0),
    [],
  );

  const filteredApplicationGroups = React.useMemo(() => {
    const q = actionSearch.trim().toLowerCase();
    if (!q) return applicationGroups;
    return applicationGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            group.group.toLowerCase().includes(q),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [actionSearch]);

  // --- Computed Data ---
  const pendingTasks = React.useMemo(() => {
    if (!pendingData?.message?.results) return [];
    const tasks: (TaskRecord & { doctype: string })[] = [];
    pendingData.message.results.forEach((group) => {
      if (group.mod_vis || group.doctype === "Advance Settlement") {
        group.records.forEach((record) => {
          tasks.push({ ...record, doctype: group.doctype });
        });
      }
    });
    return tasks.sort(
      (a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime(),
    );
  }, [pendingData]);

  const registryTasks = React.useMemo(() => {
    if (!registryData?.message?.results) return [];
    const tasks: (TaskRecord & { doctype: string })[] = [];
    registryData.message.results.forEach((group) => {
      if (group.records && Array.isArray(group.records)) {
        group.records.forEach((record) => {
          tasks.push({ ...record, doctype: group.doctype });
        });
      }
    });
    return tasks.sort(
      (a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime(),
    );
  }, [registryData]);

  // Stats
  const totalPending = pendingTasks.length;
  const totalProcessed = registryTasks.length;

  const activeModules = React.useMemo(() => {
    const doctypes = new Set<string>();
    pendingTasks.forEach((t) => doctypes.add(t.doctype));
    registryTasks.forEach((t) => doctypes.add(t.doctype));
    return doctypes.size;
  }, [pendingTasks, registryTasks]);

  const recentActivityCount = React.useMemo(() => {
    const today = new Date().toDateString();
    return [...pendingTasks, ...registryTasks].filter(
      (t) => new Date(t.modified).toDateString() === today,
    ).length;
  }, [pendingTasks, registryTasks]);

  // Module breakdown for pending tasks
  const moduleBreakdown = React.useMemo(() => {
    const counts: Record<string, number> = {};
    pendingTasks.forEach((t) => {
      counts[t.doctype] = (counts[t.doctype] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([doctype, count]) => ({ doctype, count }))
      .sort((a, b) => b.count - a.count);
  }, [pendingTasks]);

  const maxModuleCount = Math.max(...moduleBreakdown.map((m) => m.count), 1);

  return (
    <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#18181B] font-sans">
      <div className="flex-1 p-4 md:p-8">
        <div className="w-full max-w-7xl mx-auto">
          {/* Header */}
          <header className="mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <h1 className="text-2xl font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] tracking-tight">
                  Project Staff Dashboard
                </h1>
                <p className="text-sm text-zinc-600 dark:text-[#A1A1AA] mt-1">
                  Welcome back,{" "}
                  <span className="font-semibold text-[#27272A] dark:text-[#E4E4E7]">
                    {fullName}
                  </span>
                </p>
              </div>
              <CurrentTime />
            </div>
          </header>

          {/* Internal Navigation Tabs */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-700 mb-6 gap-2">
            <button
              onClick={() => navigate("/project-staff-dashboard")}
              className={cn(
                "px-5 py-2.5 text-sm font-semibold border-b-2 transition-all duration-200 flex items-center gap-2",
                !activeTab || activeTab === "overview"
                  ? "border-[#4A6CF7] text-[#4A6CF7] font-bold"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:border-zinc-300",
              )}
            >
              <UserIcon className="h-4 w-4" />
              Overview
            </button>
            {/* New Application tab — commented out, keep code for later re-enable.
            <button
              onClick={() => navigate("/project-staff-dashboard?tab=quick-actions")}
              className={cn(
                "px-5 py-2.5 text-sm font-semibold border-b-2 transition-all duration-200 flex items-center gap-2",
                activeTab === "quick-actions"
                  ? "border-[#4A6CF7] text-[#4A6CF7] font-bold"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:border-zinc-300"
              )}
            >
              <Layers className="h-4 w-4" />
              New Application
            </button>
            */}
            <button
              onClick={() => navigate("/project-staff-dashboard?tab=tracking")}
              className={cn(
                "px-5 py-2.5 text-sm font-semibold border-b-2 transition-all duration-200 flex items-center gap-2",
                activeTab === "tracking"
                  ? "border-[#4A6CF7] text-[#4A6CF7] font-bold"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:border-zinc-300",
              )}
            >
              <ListTodo className="h-4 w-4" />
              Track Applications
            </button>
          </div>

          {/* Tab Content: Overview */}
          {(!activeTab || activeTab === "overview") && (
            <>
              {/* Action Required Alert for Returned ID Card Request */}
              {returnedIdCardAlert && (
                <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-600 rounded-xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-amber-900 dark:text-amber-100 text-sm">
                        Action Required: Your ID Card Request was Returned by HR
                      </h3>
                      <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 mt-1 bg-amber-100/90 dark:bg-amber-900/60 p-2 rounded-lg border border-amber-200 dark:border-amber-700">
                        HR Comment: "
                        {returnedIdCardAlert.remarks ||
                          returnedIdCardAlert.hr_comments}
                        "
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      navigate(
                        `/id-card-request?edit=${returnedIdCardAlert.name}`,
                      )
                    }
                    className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm flex-shrink-0 transition-colors flex items-center gap-1.5 self-end sm:self-auto"
                  >
                    Edit & Resubmit <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* HR Verified Alert Banner */}
              {activeIdCardAlert?.type === "verified" && (
                <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-400 dark:border-emerald-600 rounded-xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-emerald-900 dark:text-emerald-100 text-sm">
                        Status: HR Verified
                      </h3>
                      <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 mt-1">
                        Your ID card request has been Verified by the HR.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      navigate(
                        `/id-card-request?edit=${activeIdCardAlert.doc.name}`,
                      )
                    }
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex-shrink-0 transition-colors flex items-center gap-1.5 self-end sm:self-auto"
                  >
                    View Status <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* ID Card Generated Alert Banner */}
              {activeIdCardAlert?.type === "generated" && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-400 dark:border-blue-600 rounded-xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <IdCard className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-bold text-blue-900 dark:text-blue-100 text-sm">
                        Status: ID Card Generated.
                      </h3>
                      <p className="text-xs font-semibold text-blue-800 dark:text-blue-200 mt-1">
                        Your ID card got Generated. Please collect you ID Card
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      navigate(
                        `/id-card-request?edit=${activeIdCardAlert.doc.name}`,
                      )
                    }
                    className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex-shrink-0 transition-colors flex items-center gap-1.5 self-end sm:self-auto"
                  >
                    View Status <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              {/* Basic Details */}
              <section className="mb-6 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-[#4A6CF7]/10 rounded-lg">
                    <UserIcon className="h-4 w-4 text-[#4A6CF7]" />
                  </div>
                  <h2 className="font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                    Basic Details
                  </h2>
                </div>
                {basicLoading ? (
                  <p className="text-sm text-[#71717A] dark:text-[#A1A1AA]">
                    Loading…
                  </p>
                ) : !basic ? (
                  <p className="text-sm text-[#71717A] dark:text-[#A1A1AA]">
                    No project staff record linked to your account.
                  </p>
                ) : (
                  <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                    <div>
                      <dt className="text-[#71717A] dark:text-[#A1A1AA] flex items-center gap-1.5">
                        <UserIcon className="h-3.5 w-3.5" /> Name
                      </dt>
                      <dd className="font-medium text-[#27272A] dark:text-[#E4E4E7]">
                        {basicFullName || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#71717A] dark:text-[#A1A1AA] flex items-center gap-1.5">
                        <IdCard className="h-3.5 w-3.5" /> Employee ID
                      </dt>
                      <dd className="font-medium text-[#27272A] dark:text-[#E4E4E7]">
                        {basic.ps_emp_id || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#71717A] dark:text-[#A1A1AA] flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" /> ERP Mail
                      </dt>
                      <dd className="font-medium text-[#27272A] dark:text-[#E4E4E7] break-all">
                        {basic.erp_mail || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#71717A] dark:text-[#A1A1AA]">
                        Department
                      </dt>
                      <dd className="font-medium text-[#27272A] dark:text-[#E4E4E7]">
                        {basic.ps_department_name || basic.ps_department || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#71717A] dark:text-[#A1A1AA]">
                        Designation
                      </dt>
                      <dd className="font-medium text-[#27272A] dark:text-[#E4E4E7]">
                        {basic.ps_designation || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#71717A] dark:text-[#A1A1AA]">
                        Project No
                      </dt>
                      <dd className="font-medium text-[#27272A] dark:text-[#E4E4E7]">
                        {basic.project_no || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#71717A] dark:text-[#A1A1AA]">
                        Phone
                      </dt>
                      <dd className="font-medium text-[#27272A] dark:text-[#E4E4E7]">
                        {basic.ps_phone_number || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#71717A] dark:text-[#A1A1AA]">
                        Date of Birth
                      </dt>
                      <dd className="font-medium text-[#27272A] dark:text-[#E4E4E7]">
                        {basic.ps_date_of_birth || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#71717A] dark:text-[#A1A1AA]">
                        Joining Date
                      </dt>
                      <dd className="font-medium text-[#27272A] dark:text-[#E4E4E7]">
                        {basic.ps_joining_date || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#71717A] dark:text-[#A1A1AA]">
                        Term Completion Date
                      </dt>
                      <dd className="font-medium text-[#27272A] dark:text-[#E4E4E7]">
                        {basic.ps_term_completion_date || "—"}
                      </dd>
                    </div>
                  </dl>
                )}
              </section>

              {/* Recent Submissions */}
              <section className="mb-6 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                      <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h2 className="font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                      Recent Submissions
                    </h2>
                  </div>
                  {trackingItems.length > 0 && (
                    <button
                      onClick={() =>
                        navigate("/project-staff-dashboard?tab=tracking")
                      }
                      className="text-xs text-[#4A6CF7] hover:text-[#3b5cf6] font-semibold flex items-center gap-1 transition-colors"
                    >
                      View All <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {trackingLoading ? (
                  <div className="py-8 text-center text-[#A1A1AA]">
                    <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm">Loading applications...</p>
                  </div>
                ) : trackingItems.length === 0 ? (
                  <div className="py-8 text-center text-[#A1A1AA]">
                    <Layers className="h-8 w-8 mx-auto mb-2 text-[#D4D4D8]" />
                    <p className="text-sm font-medium">No submissions found</p>
                    <p className="text-xs mt-1">
                      Applications you submit will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#F4F4F5] dark:divide-[#27272A]">
                    {trackingItems.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        className="py-3 flex items-center justify-between group"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold border",
                                getStatusStyle(item.workflow_state),
                              )}
                            >
                              {item.workflow_state}
                            </span>
                            <span className="text-[10px] text-[#A1A1AA] font-medium">
                              {item.doctype}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-[#3F3F46] dark:text-[#E4E4E7] truncate">
                            {item.id}
                          </p>
                          <p className="text-[11px] text-[#A1A1AA] mt-0.5">
                            Modified {formatRelativeTime(item.modified)} ·
                            Created{" "}
                            {new Date(item.creation).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </p>
                        </div>
                        <button
                          onClick={() => navigate(item.route)}
                          className="px-3 py-1.5 text-xs font-semibold text-[#4A6CF7] hover:text-white hover:bg-[#4A6CF7] border border-[#4A6CF7]/20 hover:border-[#4A6CF7] rounded-lg transition-all flex items-center gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {/* Tab Content: New Application — commented out (disabled via `false &&`
              rather than a block comment, since this JSX contains nested
              {/* ... *\/} comments that would otherwise prematurely close a
              wrapping comment). Remove `false && ` to re-enable. */}
          {false && activeTab === "quick-actions" && (
            <section className="mb-6 space-y-6">
              {/* Intro + Search */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-800 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
                <div>
                  <h2 className="font-bold text-[#3F3F46] dark:text-[#E4E4E7] text-sm">
                    Start a new application
                  </h2>
                  <p className="text-xs text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
                    {totalActionsCount} application types across{" "}
                    {applicationGroups.length} categories
                  </p>
                </div>
                <div className="relative w-full md:max-w-xs shrink-0">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                  <Input
                    type="text"
                    placeholder="Search application types..."
                    value={actionSearch}
                    onChange={(e) => setActionSearch(e.target.value)}
                    className="pl-9 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-sm h-9 rounded-lg"
                  />
                </div>
              </div>

              {filteredApplicationGroups.length === 0 ? (
                <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm py-12 text-center text-[#A1A1AA]">
                  <Layers className="h-10 w-10 mx-auto mb-3 text-[#D4D4D8]" />
                  <p className="text-sm font-semibold">
                    No matching application types
                  </p>
                  <p className="text-xs mt-1">Try a different search term.</p>
                </div>
              ) : (
                filteredApplicationGroups.map((group) => (
                  <div key={group.group}>
                    {/* Section header */}
                    <div className="flex items-center gap-2.5 mb-3">
                      <div
                        className={cn(
                          "size-6 flex items-center justify-center rounded-md shrink-0",
                          group.color.bg,
                        )}
                      >
                        <group.icon
                          className={cn("size-3.5", group.color.icon)}
                        />
                      </div>
                      <span className="text-[12px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-[0.1em] whitespace-nowrap">
                        {group.group}
                      </span>
                      <span className="text-[10px] font-semibold text-[#A1A1AA] bg-zinc-100 dark:bg-zinc-700/50 rounded-full px-1.5 py-0.5">
                        {group.items.length}
                      </span>
                      <div className="flex-1 h-px bg-[#E4E4E7] dark:bg-[#3F3F46]" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {group.items.map((item) => (
                        <div
                          key={item.label}
                          className="group relative bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md hover:border-[#4A6CF7]/30 transition-all cursor-pointer"
                          onClick={() => {
                            const projectNo = basic?.project_no;
                            const params = new URLSearchParams();
                            if (projectNo) params.set("project", projectNo);
                            if (item.path === "/direct-purchase")
                              params.set("from_project_staff", "1");
                            const qs = params.toString()
                              ? `?${params.toString()}`
                              : "";
                            navigate(`${item.path}${qs}`);
                          }}
                        >
                          <button className="w-full text-left p-5 flex items-start gap-4 h-full">
                            <div
                              className={cn(
                                "p-2.5 rounded-lg transition-colors shrink-0 group-hover:bg-[#4A6CF7]/10",
                                group.color.bg,
                              )}
                            >
                              <item.icon
                                className={cn(
                                  "h-5 w-5 group-hover:text-[#4A6CF7]",
                                  group.color.icon,
                                )}
                              />
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-[#3F3F46] dark:text-[#E4E4E7] mb-1">
                                {item.label}
                              </h3>
                              <p className="text-sm text-[#71717A] dark:text-[#A1A1AA]">
                                {item.description}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 ml-auto mt-1 text-[#D4D4D8] group-hover:text-[#4A6CF7] group-hover:translate-x-1 transition-all shrink-0" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </section>
          )}

          {/* Tab Content: Track Applications */}
          {activeTab === "tracking" && (
            <section className="space-y-4 mb-6">
              {/* Search & Filter Bar */}
              <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-zinc-800 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm w-full">
                <div className="relative w-full md:max-w-xs shrink-0">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                  <Input
                    type="text"
                    placeholder="Search applications..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-sm h-9 rounded-lg"
                  />
                </div>

                <div className="flex items-center gap-2 w-full overflow-x-auto pb-1 md:pb-0 scrollbar-thin justify-start md:justify-end">
                  <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider shrink-0">
                    Filter:
                  </span>
                  {uniqueDoctypes.map((dt) => (
                    <button
                      key={dt}
                      onClick={() => {
                        setSelectedDoctype(dt);
                        setCurrentPage(1);
                      }}
                      className={cn(
                        "px-3 py-1 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap",
                        selectedDoctype === dt
                          ? "bg-[#4A6CF7] text-white border-[#4A6CF7]"
                          : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800",
                      )}
                    >
                      {dt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Applications Table */}
              <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden">
                {trackingLoading ? (
                  <div className="py-12 text-center text-[#A1A1AA]">
                    <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm font-medium">
                      Loading applications list...
                    </p>
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="py-12 text-center text-[#A1A1AA]">
                    <Layers className="h-10 w-10 mx-auto mb-3 text-[#D4D4D8]" />
                    <p className="text-sm font-semibold">
                      No applications found
                    </p>
                    <p className="text-xs mt-1">
                      Try resetting filters or search query.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700">
                        <TableRow>
                          <TableHead className="font-bold text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 h-10 px-4">
                            Application Type
                          </TableHead>
                          <TableHead className="font-bold text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 h-10 px-4">
                            Reference ID
                          </TableHead>
                          <TableHead className="font-bold text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 h-10 px-4">
                            Status
                          </TableHead>
                          <TableHead className="font-bold text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 h-10 px-4">
                            Date Created
                          </TableHead>
                          <TableHead className="font-bold text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 h-10 px-4">
                            Last Modified
                          </TableHead>
                          <TableHead className="font-bold text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400 h-10 px-4 text-right">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedItems.map((item) => (
                          <TableRow
                            key={item.id}
                            className="border-b border-zinc-100 dark:border-zinc-700/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                          >
                            <TableCell className="px-4 py-3 font-semibold text-sm text-zinc-800 dark:text-zinc-200">
                              {item.doctype}
                            </TableCell>
                            <TableCell className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                              {item.id}
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-[11px] font-bold border inline-block",
                                  getStatusStyle(item.workflow_state),
                                )}
                              >
                                {item.workflow_state}
                              </span>
                            </TableCell>
                            <TableCell className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                              {new Date(item.creation).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">
                              {formatRelativeTime(item.modified)}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-right">
                              <button
                                onClick={() => navigate(item.route)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 hover:bg-[#4A6CF7] hover:text-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:border-[#4A6CF7] rounded-lg text-xs font-bold transition-all shadow-sm"
                              >
                                <Eye className="h-3 w-3" /> View
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/10">
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          Showing{" "}
                          <span className="font-semibold">
                            {(currentPage - 1) * itemsPerPage + 1}
                          </span>{" "}
                          to{" "}
                          <span className="font-semibold">
                            {Math.min(
                              currentPage * itemsPerPage,
                              filteredItems.length,
                            )}
                          </span>{" "}
                          of{" "}
                          <span className="font-semibold">
                            {filteredItems.length}
                          </span>{" "}
                          submissions
                        </div>
                        <div className="flex gap-1">
                          <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((prev) => prev - 1)}
                            className="px-3 py-1 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                          >
                            Previous
                          </button>
                          <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage((prev) => prev + 1)}
                            className="px-3 py-1 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Quick Action Cards */}
          {false && (
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Pending Approvals */}
              <button
                onClick={() => navigate("/pending-task")}
                className="group relative bg-white dark:bg-zinc-800 p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md hover:border-[#4A6CF7]/30 transition-all text-left"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg group-hover:bg-[#4A6CF7]/10 transition-colors">
                    <ClipboardCheck className="h-5 w-5 text-amber-600 dark:text-amber-400 group-hover:text-[#4A6CF7]" />
                  </div>
                  {totalPending > 0 && (
                    <span className="px-2.5 py-1 bg-[#D97757] text-white text-xs font-bold rounded-full shadow-sm animate-pulse">
                      {totalPending}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-[#3F3F46] dark:text-[#E4E4E7] mb-1">
                  My Pending Tasks
                </h3>
                <p className="text-sm text-[#71717A] dark:text-[#A1A1AA]">
                  {totalPending > 0
                    ? `${totalPending} tasks awaiting your action`
                    : "No pending tasks"}
                </p>
                <ArrowRight className="absolute bottom-5 right-5 h-4 w-4 text-[#D4D4D8] group-hover:text-[#4A6CF7] group-hover:translate-x-1 transition-all" />
              </button>

              {/* Department Projects */}
              <button
                onClick={() => navigate("/projects")}
                className="group relative bg-white dark:bg-zinc-800 p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md hover:border-[#4A6CF7]/30 transition-all text-left"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg group-hover:bg-[#4A6CF7]/10 transition-colors">
                    <Briefcase className="h-5 w-5 text-emerald-600 dark:text-emerald-400 group-hover:text-[#4A6CF7]" />
                  </div>
                </div>
                <h3 className="font-bold text-[#3F3F46] dark:text-[#E4E4E7] mb-1">
                  My Submissions
                </h3>
                <p className="text-sm text-[#71717A] dark:text-[#A1A1AA]">
                  Monitor ongoing and completed projects
                </p>
                <ArrowRight className="absolute bottom-5 right-5 h-4 w-4 text-[#D4D4D8] group-hover:text-[#4A6CF7] group-hover:translate-x-1 transition-all" />
              </button>

              {/* Task Registry */}
              <button
                onClick={() => navigate("/task-registry")}
                className="group relative bg-white dark:bg-zinc-800 p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md hover:border-[#4A6CF7]/30 transition-all text-left"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg group-hover:bg-[#4A6CF7]/10 transition-colors">
                    <BarChart className="h-5 w-5 text-purple-600 dark:text-purple-400 group-hover:text-[#4A6CF7]" />
                  </div>
                  {totalProcessed > 0 && (
                    <span className="px-2.5 py-1 bg-zinc-700 text-white text-xs font-bold rounded-full">
                      {totalProcessed}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-[#3F3F46] dark:text-[#E4E4E7] mb-1">
                  My History
                </h3>
                <p className="text-sm text-[#71717A] dark:text-[#A1A1AA]">
                  {totalProcessed > 0
                    ? `${totalProcessed} documents submitted`
                    : "View all submitted documents"}
                </p>
                <ArrowRight className="absolute bottom-5 right-5 h-4 w-4 text-[#D4D4D8] group-hover:text-[#4A6CF7] group-hover:translate-x-1 transition-all" />
              </button>
            </section>
          )}

          {/* Stats Row */}
          {false && (
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
                <AnalyticsCard
                  title="Pending"
                  value={isLoading ? "—" : String(totalPending)}
                  subtitle="Awaiting action"
                  icon={<AlertCircle className="h-5 w-5" />}
                />
              </div>
              <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
                <AnalyticsCard
                  title="Submitted"
                  value={isLoading ? "—" : String(totalProcessed)}
                  subtitle="Total documents"
                  icon={<Zap className="h-5 w-5" />}
                />
              </div>
              <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
                <AnalyticsCard
                  title="Active Modules"
                  value={isLoading ? "—" : String(activeModules)}
                  subtitle="Document types in use"
                  icon={<Layers className="h-5 w-5" />}
                />
              </div>
              <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
                <AnalyticsCard
                  title="Today's Activity"
                  value={isLoading ? "—" : String(recentActivityCount)}
                  subtitle="Modified today"
                  icon={<Activity className="h-5 w-5" />}
                />
              </div>
            </section>
          )}

          {/* Two-Column: Recent Pending + Recently Processed */}
          {false && (
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Recent Pending Approvals */}
              <div className="bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-[#D97757]" />
                    <h3 className="font-bold text-[#3F3F46] dark:text-[#E4E4E7] text-sm uppercase tracking-wide">
                      Recent Approvals Needed
                    </h3>
                  </div>
                  <button
                    onClick={() => navigate("/pending-task")}
                    className="text-xs text-[#4A6CF7] hover:text-[#3b5cf6] font-semibold flex items-center gap-1 transition-colors"
                  >
                    View All <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
                <div className="divide-y divide-[#F4F4F5] dark:divide-[#27272A]">
                  {isLoading ? (
                    <div className="p-8 text-center text-[#A1A1AA]">
                      <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-sm">Loading…</p>
                    </div>
                  ) : pendingTasks.length === 0 ? (
                    <div className="p-8 text-center text-[#A1A1AA]">
                      <ClipboardCheck className="h-8 w-8 mx-auto mb-2 text-[#D4D4D8]" />
                      <p className="text-sm font-medium">
                        No pending approvals
                      </p>
                      <p className="text-xs mt-1">You're all caught up!</p>
                    </div>
                  ) : (
                    pendingTasks.slice(0, 5).map((task) => (
                      <button
                        key={task.name}
                        onClick={() =>
                          navigate(getTaskRoute(task.doctype, task.name))
                        }
                        className="w-full px-5 py-3 hover:bg-[#FAFAF9] dark:hover:bg-[#27272A]/50 transition-colors flex items-center gap-3 text-left group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold border",
                                getStatusStyle(task.status),
                              )}
                            >
                              {task.status}
                            </span>
                            <span className="text-[10px] text-[#A1A1AA] font-medium">
                              {task.doctype}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-[#3F3F46] dark:text-[#E4E4E7] truncate">
                            {task.title}
                          </p>
                          <p className="text-[11px] text-[#A1A1AA] mt-0.5">
                            {task.owner} · {formatRelativeTime(task.modified)}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-[#D4D4D8] group-hover:text-[#4A6CF7] flex-shrink-0 transition-colors" />
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Recently Processed */}
              <div className="bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart className="h-4 w-4 text-[#D97757]" />
                    <h3 className="font-bold text-[#3F3F46] dark:text-[#E4E4E7] text-sm uppercase tracking-wide">
                      Recently Processed
                    </h3>
                  </div>
                  <button
                    onClick={() => navigate("/task-registry")}
                    className="text-xs text-[#4A6CF7] hover:text-[#3b5cf6] font-semibold flex items-center gap-1 transition-colors"
                  >
                    View All <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
                <div className="divide-y divide-[#F4F4F5] dark:divide-[#27272A]">
                  {isLoading ? (
                    <div className="p-8 text-center text-[#A1A1AA]">
                      <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-sm">Loading…</p>
                    </div>
                  ) : registryTasks.length === 0 ? (
                    <div className="p-8 text-center text-[#A1A1AA]">
                      <BarChart className="h-8 w-8 mx-auto mb-2 text-[#D4D4D8]" />
                      <p className="text-sm font-medium">
                        No processed documents yet
                      </p>
                    </div>
                  ) : (
                    registryTasks.slice(0, 5).map((task) => (
                      <button
                        key={task.name}
                        onClick={() => {
                          if (task.doctype === "Fund Received")
                            navigate(`/fund-received/${task.name}`);
                          else if (task.doctype === "Reimbursement")
                            navigate(`/reimbursement/${task.name}`);
                          else
                            navigate(
                              `/task-registry/${task.doctype}/${task.name}`,
                            );
                        }}
                        className="w-full px-5 py-3 hover:bg-[#FAFAF9] dark:hover:bg-[#27272A]/50 transition-colors flex items-center gap-3 text-left group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold border",
                                getStatusStyle(task.status),
                              )}
                            >
                              {task.status}
                            </span>
                            <span className="text-[10px] text-[#A1A1AA] font-medium">
                              {task.doctype}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-[#3F3F46] dark:text-[#E4E4E7] truncate">
                            {task.title}
                          </p>
                          <p className="text-[11px] text-[#A1A1AA] mt-0.5">
                            {task.owner} · {formatRelativeTime(task.modified)}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-[#D4D4D8] group-hover:text-[#4A6CF7] flex-shrink-0 transition-colors" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Module Breakdown */}
          {moduleBreakdown.length > 0 && (
            <section className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm p-5 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-[#D97757]" />
                <h3 className="font-bold text-[#3F3F46] dark:text-[#E4E4E7] text-sm uppercase tracking-wide">
                  Pending by Module
                </h3>
              </div>
              <div className="space-y-3">
                {moduleBreakdown.map(({ doctype, count }) => (
                  <div key={doctype} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-zinc-700 dark:text-[#D4D4D8] w-40 truncate flex-shrink-0">
                      {doctype}
                    </span>
                    <div className="flex-1 bg-zinc-100 dark:bg-zinc-700 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-[#4A6CF7] h-full rounded-full transition-all duration-700"
                        style={{ width: `${(count / maxModuleCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-[#3F3F46] dark:text-[#E4E4E7] w-8 text-right flex-shrink-0">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Footer */}
          <footer className="text-center text-[#71717A] dark:text-[#A1A1AA] mt-6 pb-4">
            <div className="flex items-center justify-center space-x-2 text-xs">
              <Mail className="size-3.5" />
              <p>
                For any query, e-mail to{" "}
                <a
                  href="mailto:ernd@iitg.ac.in"
                  className="text-[#D97757] hover:underline font-semibold"
                >
                  ernd@iitg.ac.in
                </a>
              </p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
