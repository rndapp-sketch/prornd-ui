/**
 * Administrative Officer (Ado_RnD) Dashboard
 * Enterprise-grade dynamic dashboard with role-based adaptive UI
 *
 * Features:
 * - Permission-based widget rendering
 * - Real-time task monitoring
 * - Financial data visibility controls
 * - Operational metrics tracking
 * - Staff analytics
 * - Performance metrics
 */

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFrappeAuth, useFrappeGetDoc, useFrappeGetCall } from "frappe-react-sdk";
import { AnalyticsCard, CurrentTime } from "../../components/DashboardCards";
import { cn } from "@/lib/utils";
import {
  Building2,
  TrendingUp,
  Users,
  ClipboardList,
  FolderKanban,
  AlertCircle,
  Zap,
  Activity,
  Clock,
  ArrowRight,
  ChevronRight,
  Mail,
  IndianRupee,
  CheckCircle,
  FileText,
  Shield,
  BarChart3,
  CalendarDays,
  Eye,
  EyeOff,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

// ==================== TYPE DEFINITIONS ====================

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

interface UserPermissions {
  can_view_financials: boolean;
  can_approve_projects: boolean;
  can_manage_staff: boolean;
  can_view_analytics: boolean;
  can_process_payments: boolean;
  can_manage_inventory: boolean;
  can_approve_budgets: boolean;
  can_export_data: boolean;
}

interface AdoRndDashboardData {
  overview: {
    total_pending_approvals: number;
    total_processed_today: number;
    active_projects: number;
    pending_payments: number;
    urgent_items: number;
    overdue_items: number;
  };
  financials: {
    total_budget_allocated: number;
    total_disbursed: number;
    pending_disbursements: number;
    monthly_expenditure: number;
    quarterly_expenditure: number;
    budget_utilization_rate: number;
  };
  operations: {
    pending_reimbursements: number;
    pending_advances: number;
    pending_settlements: number;
    pending_purchases: number;
    pending_honorariums: number;
    avg_processing_time: number;
    completion_rate: number;
  };
  staff_analytics: {
    total_staff: number;
    pending_recruitments: number;
    pending_resignations: number;
    pending_honorariums: number;
    active_staff: number;
    contractor_count: number;
  };
  recent_activities: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    user: string;
    doctype: string;
  }>;
  performance_metrics: {
    tasks_processed_today: number;
    average_response_time: number;
    satisfaction_score: number;
  };
}

// ==================== UTILITY FUNCTIONS ====================

const getStatusStyle = (status: string) => {
  const s = status?.toLowerCase() || "";
  if (["pending", "under review", "approval pending"].some((t) => s.includes(t)))
    return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800";
  if (s.includes("approved"))
    return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800";
  if (s.includes("draft"))
    return "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700";
  if (s.includes("rejected"))
    return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800";
  if (s.includes("forwarded") || s.includes("processed"))
    return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800";
  return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800";
};

const getTaskRoute = (doctype: string, id: string) => {
  if (doctype === "Fund Received") return `/fund-received/${id}`;
  if (doctype === "Reimbursement") return `/reimbursement/${id}`;
  if (doctype === "Advance Settlement") return `/advance-settlement/${id}`;
  if (doctype === "Temporary Advance")
    return `/pending-tasks/${encodeURIComponent(doctype)}/${id}`;
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

const formatCurrency = (amount: number) => {
  if (!amount) return "₹0";
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
  return `₹${amount.toLocaleString("en-IN")}`;
};

// ==================== PERMISSION-BASED WIDGET COMPONENT ====================

interface PermissionBasedWidgetProps {
  permission: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const PermissionBasedWidget: React.FC<PermissionBasedWidgetProps> = ({
  permission,
  children,
  fallback,
}) => {
  if (!permission) {
    return fallback || null;
  }
  return <>{children}</>;
};

// ==================== MAIN DASHBOARD COMPONENT ====================

export function AdoRndDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useFrappeAuth();
  const [showSensitiveData, setShowSensitiveData] = useState(false);

  // Fetch user data
  const { data: userData } = useFrappeGetDoc("User", currentUser ?? "", {
    fields: ["full_name", "email"],
    enabled: !!currentUser,
  });

  // Fetch user permissions from backend
  const { data: permissionsData, isLoading: isLoadingPermissions, error: permissionError } = useFrappeGetCall<{
    message: UserPermissions;
  }>(
    "rndopsapp.dashboard.get_ado_rnd_permissions",
    { user: currentUser },
    {
      enabled: !!currentUser,
      revalidateOnFocus: false,
    }
  );

  // Fetch pending tasks
  const { data: pendingData, isLoading: pendingLoading } = useFrappeGetCall<PendingTaskResponse>(
    "rndopsapp.rndopsapp.doctype.module_registry.module_registry.get_pending_task",
    { page_name: "pending-task" },
    {
      revalidateOnFocus: false,
    }
  );

  // Fetch task registry
  const { data: registryData, isLoading: registryLoading } = useFrappeGetCall<TaskRegistryResponse>(
    "rndopsapp.rndopsapp.doctype.module_registry.module_registry.get_task_registry",
    { page_name: "task-registry" },
    {
      revalidateOnFocus: false,
    }
  );

  // Fetch Ado_RnD specific dashboard data
  const { data: dashboardData, isLoading: isDashboardLoading, error: dashboardError } = useFrappeGetCall<{
    message: AdoRndDashboardData;
  }>(
    "rndopsapp.dashboard.get_ado_rnd_dashboard_data",
    {},
    {
      enabled: !!currentUser,
      revalidateOnFocus: false,
    }
  );

  const fullName = userData?.full_name || currentUser || "Guest";
  const isLoading = pendingLoading || registryLoading || isDashboardLoading || isLoadingPermissions;

  // User permissions with safe defaults - fallback to read-only if API fails
  const permissions: UserPermissions = useMemo(() => {
    if (permissionError) {
      console.warn("Failed to fetch permissions, using restricted defaults:", permissionError);
      return {
        can_view_financials: false,
        can_approve_projects: false,
        can_manage_staff: false,
        can_view_analytics: true,
        can_process_payments: false,
        can_manage_inventory: false,
        can_approve_budgets: false,
        can_export_data: false,
      };
    }
    return permissionsData?.message || {
      can_view_financials: true,
      can_approve_projects: true,
      can_manage_staff: true,
      can_view_analytics: true,
      can_process_payments: true,
      can_manage_inventory: true,
      can_approve_budgets: true,
      can_export_data: true,
    };
  }, [permissionsData, permissionError]);

  // Dashboard data with safe defaults
  const data: AdoRndDashboardData = useMemo(() => {
    if (dashboardError) {
      console.warn("Failed to fetch dashboard data:", dashboardError);
    }
    return dashboardData?.message || {
      overview: {
        total_pending_approvals: 0,
        total_processed_today: 0,
        active_projects: 0,
        pending_payments: 0,
        urgent_items: 0,
        overdue_items: 0,
      },
      financials: {
        total_budget_allocated: 0,
        total_disbursed: 0,
        pending_disbursements: 0,
        monthly_expenditure: 0,
        quarterly_expenditure: 0,
        budget_utilization_rate: 0,
      },
      operations: {
        pending_reimbursements: 0,
        pending_advances: 0,
        pending_settlements: 0,
        pending_purchases: 0,
        pending_honorariums: 0,
        avg_processing_time: 0,
        completion_rate: 0,
      },
      staff_analytics: {
        total_staff: 0,
        pending_recruitments: 0,
        pending_resignations: 0,
        pending_honorariums: 0,
        active_staff: 0,
        contractor_count: 0,
      },
      recent_activities: [],
      performance_metrics: {
        tasks_processed_today: 0,
        average_response_time: 0,
        satisfaction_score: 0,
      },
    };
  }, [dashboardData, dashboardError]);

  // Computed pending tasks
  const pendingTasks = useMemo(() => {
    if (!pendingData?.message?.results) return [];
    const tasks: (TaskRecord & { doctype: string })[] = [];
    pendingData.message.results.forEach((group) => {
      if (group.mod_vis || group.doctype === "Advance Settlement") {
        group.records.forEach((record) => {
          tasks.push({ ...record, doctype: group.doctype });
        });
      }
    });
    return tasks.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
  }, [pendingData]);

  // Computed registry tasks
  const registryTasks = useMemo(() => {
    if (!registryData?.message?.results) return [];
    const tasks: (TaskRecord & { doctype: string })[] = [];
    registryData.message.results.forEach((group) => {
      if (group.records && Array.isArray(group.records)) {
        group.records.forEach((record) => {
          tasks.push({ ...record, doctype: group.doctype });
        });
      }
    });
    return tasks.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
  }, [registryData]);

  // Stats
  const totalPending = pendingTasks.length;
  const totalProcessed = registryTasks.length;

  const activeModules = useMemo(() => {
    const doctypes = new Set<string>();
    pendingTasks.forEach((t) => doctypes.add(t.doctype));
    registryTasks.forEach((t) => doctypes.add(t.doctype));
    return doctypes.size;
  }, [pendingTasks, registryTasks]);

  const recentActivityCount = useMemo(() => {
    const today = new Date().toDateString();
    return [...pendingTasks, ...registryTasks].filter(
      (t) => new Date(t.modified).toDateString() === today
    ).length;
  }, [pendingTasks, registryTasks]);

  // Module breakdown
  const moduleBreakdown = useMemo(() => {
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
    <div className="min-h-screen bg-[#F8F6F3] dark:bg-zinc-900 font-sans">
      <div className="flex-1 p-4 md:p-8">
        <div className="w-full max-w-[1600px] mx-auto">
          {/* ==================== HEADER ==================== */}
          <header className="mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 bg-[#D97757]/10 rounded-lg">
                    <Shield className="h-6 w-6 text-[#D97757]" />
                  </div>
                  <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                    Administrative Officer Dashboard
                  </h1>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 ml-14">
                  Welcome back, <span className="font-semibold text-zinc-800 dark:text-zinc-200">{fullName}</span>
                  {" • "}Administrative Operations & Finance Management
                </p>
              </div>
              <div className="flex items-center gap-3">
                {permissions.can_view_financials && (
                  <button
                    onClick={() => setShowSensitiveData(!showSensitiveData)}
                    className="px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all flex items-center gap-2 shadow-sm"
                  >
                    {showSensitiveData ? (
                      <>
                        <EyeOff className="h-4 w-4" /> Hide Financials
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4" /> Show Financials
                      </>
                    )}
                  </button>
                )}
                <div className="px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-sm">
                  <CurrentTime />
                </div>
              </div>
            </div>
          </header>

          {/* ==================== ERROR BANNERS ==================== */}
          {permissionError && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-300">
                  Limited Access Mode
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  Unable to load full permissions. Some features may be restricted. Contact system administrator if this persists.
                </p>
              </div>
            </div>
          )}

          {dashboardError && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900 dark:text-red-300">
                  Dashboard Data Unavailable
                </p>
                <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                  Some statistics may not be available. The system will continue to function normally.
                </p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" /> Retry
              </button>
            </div>
          )}

          {/* ==================== QUICK ACTION CARDS ==================== */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Pending Approvals */}
            <button
              onClick={() => navigate("/pending-task")}
              className="group relative bg-white dark:bg-zinc-800 p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md hover:border-[#D97757]/40 transition-all text-left"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg group-hover:bg-[#D97757]/10 transition-colors">
                  <ClipboardList className="h-5 w-5 text-amber-600 dark:text-amber-400 group-hover:text-[#D97757]" />
                </div>
                {totalPending > 0 && (
                  <span className="px-2.5 py-1 bg-[#D97757] text-white text-xs font-bold rounded-full shadow-sm animate-pulse">
                    {totalPending}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">Pending Approvals</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {totalPending > 0 ? `${totalPending} items require action` : "All caught up!"}
              </p>
              <ArrowRight className="absolute bottom-5 right-5 h-4 w-4 text-zinc-300 group-hover:text-[#D97757] group-hover:translate-x-1 transition-all" />
            </button>

            {/* Task Registry */}
            <button
              onClick={() => navigate("/task-registry")}
              className="group relative bg-white dark:bg-zinc-800 p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md hover:border-[#D97757]/40 transition-all text-left"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg group-hover:bg-[#D97757]/10 transition-colors">
                  <FolderKanban className="h-5 w-5 text-purple-600 dark:text-purple-400 group-hover:text-[#D97757]" />
                </div>
                {totalProcessed > 0 && (
                  <span className="px-2.5 py-1 bg-zinc-700 text-white text-xs font-bold rounded-full">
                    {totalProcessed}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">Processed Tasks</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {totalProcessed > 0 ? `${totalProcessed} completed` : "No records yet"}
              </p>
              <ArrowRight className="absolute bottom-5 right-5 h-4 w-4 text-zinc-300 group-hover:text-[#D97757] group-hover:translate-x-1 transition-all" />
            </button>

            {/* Projects */}
            <PermissionBasedWidget permission={permissions.can_view_analytics}>
              <button
                onClick={() => navigate("/projects-view")}
                className="group relative bg-white dark:bg-zinc-800 p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md hover:border-[#D97757]/40 transition-all text-left"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg group-hover:bg-[#D97757]/10 transition-colors">
                    <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 group-hover:text-[#D97757]" />
                  </div>
                  {data.overview.active_projects > 0 && (
                    <span className="px-2.5 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full">
                      {data.overview.active_projects}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">Active Projects</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {data.overview.active_projects} projects running
                </p>
                <ArrowRight className="absolute bottom-5 right-5 h-4 w-4 text-zinc-300 group-hover:text-[#D97757] group-hover:translate-x-1 transition-all" />
              </button>
            </PermissionBasedWidget>

            {/* Payments */}
            <PermissionBasedWidget permission={permissions.can_process_payments}>
              <button
                onClick={() => navigate("/payments")}
                className="group relative bg-white dark:bg-zinc-800 p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md hover:border-[#D97757]/40 transition-all text-left"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:bg-[#D97757]/10 transition-colors">
                    <IndianRupee className="h-5 w-5 text-blue-600 dark:text-blue-400 group-hover:text-[#D97757]" />
                  </div>
                  {data.overview.pending_payments > 0 && (
                    <span className="px-2.5 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
                      {data.overview.pending_payments}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">Pending Payments</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {data.overview.pending_payments} awaiting processing
                </p>
                <ArrowRight className="absolute bottom-5 right-5 h-4 w-4 text-zinc-300 group-hover:text-[#D97757] group-hover:translate-x-1 transition-all" />
              </button>
            </PermissionBasedWidget>
          </section>

          {/* ==================== STATS OVERVIEW ==================== */}
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
                title="Processed"
                value={isLoading ? "—" : String(totalProcessed)}
                subtitle="Total completed"
                icon={<Zap className="h-5 w-5" />}
              />
            </div>
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
              <AnalyticsCard
                title="Active Modules"
                value={isLoading ? "—" : String(activeModules)}
                subtitle="Doctypes in use"
                icon={<FileText className="h-5 w-5" />}
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

          {/* ==================== FINANCIAL OVERVIEW (Permission-Based) ==================== */}
          <PermissionBasedWidget permission={permissions.can_view_financials && showSensitiveData}>
            <section className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl border border-emerald-200 dark:border-emerald-800 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <IndianRupee className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-300">Total Budget</h4>
                </div>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  {isLoading ? "—" : formatCurrency(data.financials.total_budget_allocated)}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Allocated this FY</p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h4 className="text-sm font-bold text-blue-900 dark:text-blue-300">Disbursed</h4>
                </div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {isLoading ? "—" : formatCurrency(data.financials.total_disbursed)}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {data.financials.total_budget_allocated > 0
                    ? `${((data.financials.total_disbursed / data.financials.total_budget_allocated) * 100).toFixed(1)}% utilized`
                    : "No data"}
                </p>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-xl border border-amber-200 dark:border-amber-800 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <h4 className="text-sm font-bold text-amber-900 dark:text-amber-300">Pending Disbursals</h4>
                </div>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                  {isLoading ? "—" : formatCurrency(data.financials.pending_disbursements)}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Awaiting approval</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl border border-purple-200 dark:border-purple-800 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <h4 className="text-sm font-bold text-purple-900 dark:text-purple-300">Monthly Expenditure</h4>
                </div>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {isLoading ? "—" : formatCurrency(data.financials.monthly_expenditure)}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Current month</p>
              </div>
            </section>
          </PermissionBasedWidget>

          {/* ==================== OPERATIONS BREAKDOWN ==================== */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Pending Operations */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 className="h-5 w-5 text-[#D97757]" />
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-lg">Pending Operations</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Reimbursements</span>
                  <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-sm font-bold rounded-full">
                    {isLoading ? "—" : data.operations.pending_reimbursements}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Temporary Advances</span>
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-bold rounded-full">
                    {isLoading ? "—" : data.operations.pending_advances}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Advance Settlements</span>
                  <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-sm font-bold rounded-full">
                    {isLoading ? "—" : data.operations.pending_settlements}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Direct Purchases</span>
                  <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-bold rounded-full">
                    {isLoading ? "—" : data.operations.pending_purchases}
                  </span>
                </div>
              </div>
            </div>

            {/* Staff Analytics */}
            <PermissionBasedWidget
              permission={permissions.can_manage_staff}
              fallback={
                <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <Shield className="h-5 w-5 text-zinc-400" />
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-lg">Staff Analytics</h3>
                  </div>
                  <div className="flex items-center justify-center h-48 text-zinc-400">
                    <div className="text-center">
                      <Shield className="h-12 w-12 mx-auto mb-3 text-zinc-300" />
                      <p className="text-sm font-medium">Insufficient Permissions</p>
                      <p className="text-xs mt-1">Contact admin for access</p>
                    </div>
                  </div>
                </div>
              }
            >
              <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Users className="h-5 w-5 text-[#D97757]" />
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-lg">Staff Analytics</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Total Staff</span>
                    <span className="px-3 py-1 bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 text-sm font-bold rounded-full">
                      {isLoading ? "—" : data.staff_analytics.total_staff}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Pending Recruitments</span>
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-bold rounded-full">
                      {isLoading ? "—" : data.staff_analytics.pending_recruitments}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Pending Resignations</span>
                    <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm font-bold rounded-full">
                      {isLoading ? "—" : data.staff_analytics.pending_resignations}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Pending Honorariums</span>
                    <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-sm font-bold rounded-full">
                      {isLoading ? "—" : data.staff_analytics.pending_honorariums}
                    </span>
                  </div>
                </div>
              </div>
            </PermissionBasedWidget>
          </section>

          {/* ==================== PENDING & PROCESSED TASKS ==================== */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Recent Pending Tasks */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-[#D97757]" />
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm uppercase tracking-wide">
                    Recent Pending
                  </h3>
                </div>
                <button
                  onClick={() => navigate("/pending-task")}
                  className="text-xs text-[#D97757] hover:text-[#c5684a] font-semibold flex items-center gap-1 transition-colors"
                >
                  View All <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-700/50 max-h-[400px] overflow-y-auto">
                {isLoading ? (
                  <div className="p-8 text-center text-zinc-400">
                    <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm">Loading tasks...</p>
                  </div>
                ) : pendingTasks.length === 0 ? (
                  <div className="p-8 text-center text-zinc-400">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-300" />
                    <p className="text-sm font-medium">No pending tasks</p>
                    <p className="text-xs mt-1">All caught up!</p>
                  </div>
                ) : (
                  pendingTasks.slice(0, 8).map((task) => (
                    <button
                      key={task.name}
                      onClick={() => navigate(getTaskRoute(task.doctype, task.name))}
                      className="w-full px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors flex items-center gap-3 text-left group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border", getStatusStyle(task.status))}>
                            {task.status}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-medium">{task.doctype}</span>
                        </div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {task.title}
                        </p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {task.owner} · {formatRelativeTime(task.modified)}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-[#D97757] flex-shrink-0 transition-colors" />
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Recently Processed */}
            <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-[#D97757]" />
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm uppercase tracking-wide">
                    Recently Processed
                  </h3>
                </div>
                <button
                  onClick={() => navigate("/task-registry")}
                  className="text-xs text-[#D97757] hover:text-[#c5684a] font-semibold flex items-center gap-1 transition-colors"
                >
                  View All <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-700/50 max-h-[400px] overflow-y-auto">
                {isLoading ? (
                  <div className="p-8 text-center text-zinc-400">
                    <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm">Loading tasks...</p>
                  </div>
                ) : registryTasks.length === 0 ? (
                  <div className="p-8 text-center text-zinc-400">
                    <FolderKanban className="h-8 w-8 mx-auto mb-2 text-zinc-300" />
                    <p className="text-sm font-medium">No processed documents yet</p>
                  </div>
                ) : (
                  registryTasks.slice(0, 8).map((task) => (
                    <button
                      key={task.name}
                      onClick={() => {
                        if (task.doctype === "Fund Received") navigate(`/fund-received/${task.name}`);
                        else if (task.doctype === "Reimbursement") navigate(`/reimbursement/${task.name}`);
                        else navigate(`/task-registry/${task.doctype}/${task.name}`);
                      }}
                      className="w-full px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors flex items-center gap-3 text-left group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border", getStatusStyle(task.status))}>
                            {task.status}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-medium">{task.doctype}</span>
                        </div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {task.title}
                        </p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          {task.owner} · {formatRelativeTime(task.modified)}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-[#D97757] flex-shrink-0 transition-colors" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* ==================== MODULE BREAKDOWN ==================== */}
          {moduleBreakdown.length > 0 && (
            <section className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm p-6 mb-6">
              <div className="flex items-center gap-2 mb-5">
                <Clock className="h-5 w-5 text-[#D97757]" />
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-lg">Pending by Module</h3>
              </div>
              <div className="space-y-3">
                {moduleBreakdown.map(({ doctype, count }) => (
                  <div key={doctype} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 w-48 truncate flex-shrink-0">
                      {doctype}
                    </span>
                    <div className="flex-1 bg-zinc-100 dark:bg-zinc-700 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#D97757] to-[#c5684a] h-full rounded-full transition-all duration-700 shadow-sm"
                        style={{ width: `${(count / maxModuleCount) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 w-10 text-right flex-shrink-0">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ==================== FOOTER ==================== */}
          <footer className="text-center text-zinc-500 dark:text-zinc-400 mt-6 pb-4">
            <div className="flex items-center justify-center space-x-2 text-xs">
              <Mail className="size-3.5" />
              <p>
                For queries, contact HoS R&D or email{" "}
                <a href="mailto:ernd@iitg.ac.in" className="text-[#D97757] hover:underline font-semibold">
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
