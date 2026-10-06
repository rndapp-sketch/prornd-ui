
import { safeStorage } from "@/lib/safeStorage";
import { FRAPPE_BASE_URL, frappeUrl } from "@/utils/frappeUrl";
import React from "react";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    useSidebar,
} from "@/components/ui/sidebar";
import {
    HomeIcon,
    FileText,
    ChevronDownIcon,
    ChevronRightIcon,
    LogOutIcon,
    ListTodo,
    ClipboardCheck,
    CreditCard,
    BarChart3,
    MessageCircle,
    Users as UsersIcon,
    UserCheck,
    IndianRupee,
    Calendar,
    HelpCircle,
    Search,
    Share2 as Share2Icon,
    GraduationCap,
    IdCard,
    FileSpreadsheet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
    useFrappeAuth,
    useFrappeGetDoc,
    useFrappeGetCall,
    useFrappeGetDocList,
} from "frappe-react-sdk";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { GlobalLoader } from "@/components/ui/global-loader";
import { useSWRConfig } from "swr";
import { useUserRoles } from "./UserRole";
import { selectionCommitteeReportAPI } from "@/services/apiService";
import { useAppwriteSession } from "@/hooks/useAppwriteSession";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { HelpModule } from "./HelpModule";
import { AddStudentModal } from "./AddStudentModal";

// --- LOGIC: Interfaces (Unchanged) ---
interface SubMenuItem {
    label: string;
    path: string;
}

interface MenuItem {
    label: string;
    icon: LucideIcon;
    path?: string;
    subMenu?: SubMenuItem[];
    isSubOf?: string;
    action?: () => void;
    alwaysOpen?: boolean;
}

export function AppSidebar() {
    // --- LOGIC: Hooks and State (Unchanged) ---
    const { logout, currentUser, isLoading } = useFrappeAuth();
    const { state } = useSidebar();
    const navigate = useNavigate();
    const location = useLocation();
    const [openSubMenus, setOpenSubMenus] = useState<string[]>([]);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
    const { mutate } = useSWRConfig();
    const appwriteSession = useAppwriteSession();
    const { unreadCount } = useUnreadCount(appwriteSession.user?.$id ?? null);

    const { data: userDoc, isLoading: isLoadingUserDoc } = useFrappeGetDoc(
        "User",
        currentUser || "",
        currentUser ? undefined : null,
    );

    const { roles } = useUserRoles(currentUser || null);
    const isHeadApprover = roles?.includes("head_approver_1") ?? false;
    const isPermanentEmployee = roles?.includes("Permanent Employee") ?? false;
    const canUploadDirectorPdf = roles?.includes("staff, RnD") ?? false;
    const isRndStaffRole = roles?.includes("staff, RnD") ?? false;
    const isHosRnd = roles?.includes("Hos, RnD (Head of Section, RnD)") ?? false;
    const isAdoRnd = roles?.includes("Ado_RnD") ?? false;
    const isDoRnd = roles?.includes("Dean, RnD") ?? false;

    // Fetch projects assigned to current user as head_approver (same filter as PendingTask.tsx)
    const { data: headApproverProjects } = useFrappeGetDocList("Project Registration", {
        filters: [["head_approver", "=", currentUser ?? ""]],
        fields: ["name"],
        limit: 500,
    }, isHeadApprover && currentUser ? undefined : null);

    const allowedProjectNames = React.useMemo(() => {
        if (!isHeadApprover || !headApproverProjects) return null;
        return new Set(headApproverProjects.map((p: { name: string }) => p.name));
    }, [isHeadApprover, headApproverProjects]);

    // Fetch Leave Module names where PI matches current user (for accurate count)
    const { data: piLeaveModules } = useFrappeGetDocList("Leave Module", {
        filters: [["pi", "=", currentUser ?? ""]],
        fields: ["name"],
        limit: 500,
    }, isPermanentEmployee && currentUser ? undefined : null);

    const allowedLeaveNames = React.useMemo(() => {
        if (!isPermanentEmployee || !piLeaveModules) return null;
        return new Set(piLeaveModules.map((l: { name: string }) => l.name));
    }, [isPermanentEmployee, piLeaveModules]);

    // Fetch pending task count
    const { data: pendingTaskData } = useFrappeGetCall<{
        message: {
            research: Array<{ status: string; doctype: string; name: string; mod_vis: number | null; owner: string }>;
            consultancy: Array<{ status: string; doctype: string; name: string; mod_vis: number | null; owner: string }>;
            others: Array<{ status: string; doctype: string; name: string; mod_vis: number | null; owner: string }>;
        };
    }>(
        "rndopsapp.rndopsapp.doctype.module_registry.module_registry.get_categorized_pending_task",
        { page_name: "pending-task" },
        currentUser ? undefined : null,
    );

    const { data: pendingDirectorPdfData } = useFrappeGetCall<{
        message: { status: string; data: Array<{ name: string }> };
    }>(
        selectionCommitteeReportAPI.getPendingDirectorUploads,
        {},
        currentUser && canUploadDirectorPdf ? undefined : null,
    );

    // Calculate count matching PendingTask.tsx filter logic exactly
    const SIDEBAR_HIDDEN_DOCTYPES = new Set(["Kafka Commit Staging", "Project Number Generation"]);
    const pendingTaskCount = React.useMemo(() => {
        if (!pendingTaskData?.message) return 0;
        const records = [
            ...(pendingTaskData.message.research ?? []),
            ...(pendingTaskData.message.consultancy ?? []),
            ...(pendingTaskData.message.others ?? []),
        ];
        let count = 0;
        records.forEach((record) => {
            if (SIDEBAR_HIDDEN_DOCTYPES.has(record.doctype)) return;
            const shouldIncludeGroup = !!record.mod_vis || record.doctype === "Advance Settlement";
            const isHosPending = record.status === "Pending HoS Approval";
            if (!shouldIncludeGroup && !(isHosRnd && isHosPending)) return;
            if (isHeadApprover && record.doctype === "Project Registration" && allowedProjectNames && !allowedProjectNames.has(record.name) && !(isHosRnd && isHosPending)) return;
            if (isPermanentEmployee && record.doctype === "Leave Module" && allowedLeaveNames) {
                if (record.status === "Pending PI Approval" && !allowedLeaveNames.has(record.name)) return;
            }
            // Disbursal of Consultancy is filed by the PI themselves, so a record in
            // "Pending PI Approval" is only actionable by that specific PI — mirrors
            // the same owner check in PendingTask.tsx.
            if (record.doctype === "Disbursal of Consultancy" && record.status === "Pending PI Approval" && record.owner !== currentUser) return;
            if (record.status === "Endorsement Approved") return;
            if (record.status === "Sanction Approved" && record.doctype !== "Direct Purchase") return;
            if (isHosRnd && !isAdoRnd && record.status === "Pending Associate Dean") return;
            if (isAdoRnd && !isHosRnd && record.status === "Pending HoS Approval") return;
            count++;
        });
        return count;
    }, [pendingTaskData, isHeadApprover, allowedProjectNames, isPermanentEmployee, allowedLeaveNames, isHosRnd, isAdoRnd, currentUser]);

    const pendingDirectorPdfCount = pendingDirectorPdfData?.message?.data?.length ?? 0;

    // Leave Module applications pending the current user's approval as PI —
    // scoped server-side, so no extra client-side filtering is needed here.
    // Fetched for every role that can see the "Pending Application" menu item
    // (not just Permanent Employee), since head_approver_1 / Dean, RnD users
    // can also be a PI on some applications.
    const { data: pendingApplicationData } = useFrappeGetCall<{
        message: { user: string; results: Array<{ name: string }> };
    }>(
        "rndopsapp.rndopsapp.doctype.module_registry.module_registry.get_pending_application",
        {},
        currentUser && (isPermanentEmployee || isHeadApprover || isDoRnd) ? undefined : null,
    );
    const pendingApplicationCount = pendingApplicationData?.message?.results?.length ?? 0;

    // Fetch pending ID Card requests for HR (Submitted state only)
    const isHrUser = roles?.some(r => ["staff, RnD", "System Manager"].includes(r)) ?? false;
    const { data: pendingIdCardList } = useFrappeGetDocList("Employee ID Card", {
        filters: [
            ["workflow_state", "=", "Submitted"],
            ["docstatus", "=", 1]
        ],
        fields: ["name"],
        limit: 500,
    }, currentUser && isHrUser ? undefined : null);
    const pendingIdCardCount = isHrUser ? (pendingIdCardList?.length ?? 0) : 0;

    // Fetch returned ID Card requests for project staff (Draft state with HR remarks)
    const isProjectStaff = roles?.includes("project staff") ?? false;
    const { data: myReturnedIdCardsData } = useFrappeGetCall<any>(
        "rndopsapp.rndopsapp.doctype.employee_id_card.employee_id_card.get_my_id_card_details",
        undefined,
        currentUser && isProjectStaff ? undefined : null
    );
    const myReturnedIdCards = Array.isArray(myReturnedIdCardsData?.message)
        ? myReturnedIdCardsData.message
        : Array.isArray(myReturnedIdCardsData) ? myReturnedIdCardsData : [];
    const returnedIdCardCount = isProjectStaff
        ? myReturnedIdCards.filter((c: any) => (c.workflow_state === "Draft" || !c.workflow_state) && (c.remarks || c.hr_comments)).length
        : 0;

    // --- LOGIC: Menu Data (Unchanged) ---
    const isDirector = roles?.includes("Director");
    const hasOverviewAccess = roles?.some(r => ["Director", "Dean, RnD", "Ado_RnD", "Hos, RnD (Head of Section, RnD)"].includes(r));

    const menuItems: MenuItem[] = [
        ...(!isDirector ? [{
            label: "Home",
            icon: HomeIcon,
            path: "/dashboard"
        }] : []),
        ...(hasOverviewAccess ? [
            {
                label: "Overview",
                icon: BarChart3,
                path: "/director-dashboard?view=Director",
            },
            {
                label: "Departments",
                icon: BarChart3,
                path: "/director-dashboard?view=Department",
                isSubOf: "Overview",
            },
            {
                label: "PI Projects",
                icon: BarChart3,
                path: "/director-dashboard?view=PI",
                isSubOf: "Overview",
            },
        ] : []),

        // HEAD OVERVIEW (Specific view for head_approver_1)
        ...(isHeadApprover && !hasOverviewAccess ? [
            { label: "Overview", icon: BarChart3, path: "/head-overview?view=Overview" },
            { label: "PI Projects", icon: UsersIcon, path: "/head-overview?view=PI", isSubOf: "Overview" },
        ] : []),
        {
            label: "Projects",
            icon: FileText,
            alwaysOpen: true,
            subMenu: [
                { label: "Projects View", path: "/projects-view" },
                { label: "Co-Projects", path: "/co-projects" },
                { label: "Apply on Other PI Projects", path: "/other-pi" },
                { label: "Project Registration", path: "/project-registration" },
            ],
        },
        // {
        //   label: "HR Portal",
        //   icon: UsersIcon,
        //   path: "/hr-portal",
        // },
        // {
        //   label: "Reimbursement",
        //   icon: HandCoinsIcon,
        //   path: "/reimbursement",
        // },
        {
            label: "Stakeholder Registration",
            icon: FileText,
            path: "/universal-registration",
        },
        {
            label: "Delegate User",
            icon: UserCheck,
            path: "/delegate-user",
        },
        {
            label: "Delegated to Me",
            icon: Share2Icon,
            path: "/delegated-to-me",
        },
        {
            label: "Leave Module",
            icon: Calendar,
            path: "/leave-module",
        },
        {
            label: "Resignation",
            icon: FileText,
            path: "/project-staff-resignation",
        },
        {
            label: "Extension",
            icon: FileText,
            path: "/project-staff-extension",
        },
        {
            label: "ID Card Request",
            icon: IdCard,
            path: "/id-card-request",
        },
        ...(isPermanentEmployee ? [{
            label: "Form Cancellation",
            icon: FileText,
            path: "/form-application",
        }] : []),
        {
            label: "Pending Task (as Approver)",
            icon: ListTodo,
            path: "/pending-task",
        },
        ...(isPermanentEmployee || isHeadApprover || isDoRnd ? [{
            label: "Pending Application (as PI)",
            icon: ClipboardCheck,
            path: "/pending-application",
        }] : []),
        {
            label: "Task Registry",
            icon: FileText,
            path: "/task-registry",
        },
        {
            label: "ID Card Management",
            icon: IdCard,
            path: "/hr-id-card-management",
        },
        {
            label: "Track Application",
            icon: Search,
            path: "/track-application",
        },
        {
            label: "Payments",
            icon: CreditCard,
            path: "/payments",
        },
        {
            label: "Upload Director PDF",
            icon: FileText,
            path: "/director-pdf-upload",
        },
        {
            label: "Faculty Admission PDF Upload",
            icon: FileText,
            path: "/top-up-fellowship-faculty-admission",
        },
        ...(isRndStaffRole ? [{
            label: "Project Staff Details",
            icon: UsersIcon,
            path: "/project-staff-details",
        }] : []),
        {
            label: "Project Staff",
            icon: UsersIcon,
            path: "/project-staff-attendance",
        },
        {
            label: "Add Student",
            icon: GraduationCap,
            action: () => setIsAddStudentOpen(true),
        },
        {
            label: "Salary Module",
            icon: IndianRupee,
            path: "/salary-module",
        },
        {
            label: "Commit / De-Commit",
            icon: CreditCard,
            path: "/miscellaneous-commit",
        },
        {
            label: "Project Search",
            icon: Search,
            path: "/project-search",
        },
        {
            label: "Ledger Export",
            icon: FileSpreadsheet,
            path: "/project-ledger-export",
        },
    ].filter((item) => {
        if (item.label === "Upload Director PDF") {
            return canUploadDirectorPdf;
        }
        if (item.label === "Faculty Admission PDF Upload") {
            return canUploadDirectorPdf;
        }
        if (item.label === "Salary Module") {
            return roles?.includes("staff, RnD") ?? false;
        }
        if (item.label === "Commit / De-Commit") {
            return roles?.includes("staff, RnD") ?? false;
        }
        if (item.label === "Project Search" || item.label === "Ledger Export") {
            return roles?.includes("staff, RnD") ?? false;
        }
        if (item.label === "Universal Forms") {
            // Visible only to staff, RnD
            const allowedRoles = ["staff, RnD"];
            return roles && allowedRoles.some((role) => roles.includes(role));
        }
        if (item.label === "Agency Registration") {
            const allowedRoles = ["staff, RnD", "Permanent Employee"];
            return roles && allowedRoles.some((role) => roles.includes(role));
        }
        if (item.label === "Pending Task (as Approver)") {
            const allowedRoles = [
                "Dean, RnD",
                "Ado_RnD",
                "head_approver_1",
                "Hos, RnD (Head of Section, RnD)",
                "staff, RnD",
            ];
            return roles && allowedRoles.some((role) => roles.includes(role));
        }
        if (item.label === "Task Registry") {
            // Visible to staff, HOS, Dean, DoRnD, Head Approver, Ado_RnD - NOT permanent employees
            const allowedRoles = [
                "staff, RnD",
                "Hos, RnD (Head of Section, RnD)",
                "Dean, RnD",
                "Ado_RnD",
                "head_approver_1",
            ];
            return roles && allowedRoles.some((role) => roles.includes(role));
        }
        if (item.label === "Track Application") {
            const allowedRoles = [
                "staff, RnD",
                "Permanent Employee",
                "head_approver_1",
                "Hos, RnD (Head of Section, RnD)",
                "Dean, RnD",
                "Ado_RnD",
            ];
            return roles && allowedRoles.some((role) => roles.includes(role));
        }
        if (item.label === "Payments") {
            // Visible only to staff
            const allowedRoles = [
                "staff, RnD",
                "Hos, RnD (Head of Section, RnD)",
            ];
            return roles && allowedRoles.some((role) => roles.includes(role));
        }
        if (item.label === "Projects") {
            const allowedRoles = ["Permanent Employee", "head_approver_1", "Dean, RnD", "Independent Researcher"];
            return roles && allowedRoles.some((role) => roles.includes(role));
        }
        if (item.label === "Project Staff") {
            return roles?.includes("Permanent Employee") ?? false;
        }
        if (item.label === "Add Student") {
            return roles?.includes("Permanent Employee") ?? false;
        }
        if (item.label === "Stakeholder Registration") {
            return !(roles?.includes("project staff") ?? false);
        }
        if (item.label === "Delegate User") {
            const allowedRoles = [
                "Permanent Employee",
                "HoS (Head of School)",
                "Hos, RnD (Head of Section, RnD)",
                "HOSRnD",
                "HoC (Head of Center)",
                "HoD",
                "HoD (Head of Department)",
                "head_department_center_school",
                "head_approver_1",
                "Ado_RnD",
                "Associate Dean, RND",
                "Dean, RnD",
                "Director",
            ];
            return roles ? allowedRoles.some((role) => roles.includes(role)) : false;
        }
        if (item.label === "Delegated to Me") {
            return roles?.includes("project staff") ?? false;
        }
        if (item.label === "Leave Module") {
            const allowedRoles = ["project staff", "IF - Inspired Faculty", "Independent Researcher"];
            return roles ? allowedRoles.some((role) => roles.includes(role)) : false;
        }
        if (item.label === "Resignation" || item.label === "Extension" || item.label === "ID Card Request") {
            return roles?.includes("project staff") ?? false;
        }
        if (item.label === "ID Card Management") {
            return roles?.includes("staff, RnD") ?? false;
        }
        return true;
    });

    const handleMenuItemClick = (item: MenuItem) => {
        if (item.action) {
            item.action();
        } else if (item.subMenu && !item.alwaysOpen) {
            setOpenSubMenus((prev) =>
                prev.includes(item.label)
                    ? prev.filter((label) => label !== item.label)
                    : [...prev, item.label],
            );
        } else if (item.path) {
            navigate(item.path);
        } else if (item.label === "Home") {
            navigate("/dashboard");
        }
    };

    const handleSubMenuItemClick = (subItem: SubMenuItem) => {
        navigate(subItem.path);
    };

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await logout();
        } catch (error) {
            const csrfToken = (window as any).csrf_token || "";
            const requests: Array<{ method: "POST" | "GET"; url: string }> = [
                { method: "POST", url: `${FRAPPE_BASE_URL}/api/method/logout` },
                { method: "GET", url: `${FRAPPE_BASE_URL}/api/method/logout` },
            ];
            for (const req of requests) {
                try {
                    await fetch(req.url, {
                        method: req.method,
                        credentials: "include",
                        headers:
                            req.method === "POST"
                                ? {
                                    "Content-Type": "application/json",
                                    ...(csrfToken ? { "X-Frappe-CSRF-Token": csrfToken } : {}),
                                }
                                : undefined,
                    });
                } catch {
                    // best-effort fallback path
                }
            }
        } finally {
            // Clear all SWR cache
            await mutate(
                () => true, // Match all keys
                undefined, // No data to update
                { revalidate: false }, // Do not revalidate
            );
            safeStorage.removeItem("prornd_last_user");
            navigate("/login", { replace: true });
            // Hard reload for a clean slate (fresh Frappe session/socket state) — must
            // use the configured base path, not a bare "/login": under a non-root base
            // (e.g. /dev/), an unprefixed absolute path is outside the SPA's mount
            // point and the backend/proxy won't resolve it to the login page, so this
            // used to silently strand the user instead of logging them out.
            window.location.href = `${import.meta.env.BASE_URL}login`;
            setIsLoggingOut(false);
        }
    };

    // --- LOGIC: Path Checking (Unchanged) ---
    const isActivePath = (path: string) => {
        if (path === "/home") {
            return (
                location.pathname === "/home" ||
                location.pathname === "/pihomepage"
            );
        }

        if (path.startsWith("/director-dashboard")) {
            const searchParams = new URLSearchParams(location.search);
            const viewMode = searchParams.get("view") || "Director";
            return location.pathname === "/director-dashboard" && path === `/director-dashboard?view=${viewMode}`;
        }

        if (path.startsWith("/head-overview")) {
            const searchParams = new URLSearchParams(location.search);
            const viewMode = searchParams.get("view") || "Overview";
            return location.pathname === "/head-overview" && path === `/head-overview?view=${viewMode}`;
        }

        return location.pathname.startsWith(path) && path !== "/";
    };

    // --- Presentation helpers ---
    const expanded = state === "expanded";

    // Subtle section dividers before these groups (skipped when first in list)
    const DIVIDER_BEFORE = new Set([
        "Stakeholder Registration",
        "Pending Task (as Approver)",
        "Track Application",
        "Upload Director PDF",
        "Salary Module",
    ]);

    // Right-aligned notification badges: orange = pending, red = secondary
    const getBadge = (label: string): { count: number; tone: "orange" | "red" } | null => {
        const map: Record<string, { count: number; tone: "orange" | "red" }> = {
            "Pending Task (as Approver)": { count: pendingTaskCount, tone: "orange" },
            "Pending Application (as PI)": { count: pendingApplicationCount, tone: "orange" },
            "Upload Director PDF": { count: pendingDirectorPdfCount, tone: "orange" },
            "ID Card Management": { count: pendingIdCardCount, tone: "red" },
            "ID Card Request": { count: returnedIdCardCount, tone: "red" },
        };
        const badge = map[label];
        return badge && badge.count > 0 ? badge : null;
    };

    const NavBadge = ({ count, tone }: { count: number; tone: "orange" | "red" }) => (
        <span
            className={cn(
                "ml-auto inline-flex items-center justify-center min-w-[20px] h-[18px] px-1.5 rounded-full text-[10px] font-bold leading-none text-white",
                tone === "orange" ? "bg-[#F97316]" : "bg-[#EF4444]",
            )}
        >
            {count > 99 ? "99+" : count}
        </span>
    );

    const navButtonClass = (active: boolean) =>
        cn(
            "relative w-full rounded-[10px] text-[12px] transition-colors duration-150",
            expanded ? "px-3 py-2 !h-auto min-h-[42px] justify-start items-center "+"[&>span:last-child]:whitespace-normal [&>span:last-child]:overflow-visible [&>span:last-child]:text-clip" : "px-0 justify-center",
            active
                ? "bg-[#E8F0FF] text-[#1D4ED8] font-semibold dark:bg-[#2563EB]/20 dark:text-[#93C5FD]"
                : "text-[#0F172A] font-medium hover:bg-[#DCE4F0] hover:text-[#123B7A] dark:text-[#A1A1AA] dark:hover:bg-[#27272A] dark:hover:text-[#E4E4E7]",
        );

    const UTIL_TONES = {
        manual: {
            idle: "text-[#1E293B] hover:bg-[#C7D2FE] hover:text-[#3730A3] dark:text-[#A5B4FC]",
            active: "bg-[#C7D2FE] text-[#3730A3] font-semibold",
            icon: "text-[#4F46E5]",
        },
        support: {
            idle: "text-[#1E293B] hover:bg-[#A7F3D0] hover:text-[#065F46] dark:text-[#6EE7B7]",
            active: "bg-[#A7F3D0] text-[#065F46] font-semibold",
            icon: "text-[#059669]",
        },
    } as const;

    const utilButtonClass = (active: boolean, tone?: keyof typeof UTIL_TONES) =>
        cn(
            "relative w-full rounded-[10px] text-[12px] transition-colors duration-150",
            expanded ? "px-3 py-2 !h-auto min-h-[40px] justify-start gap-3 "+"[&>span:last-child]:whitespace-normal [&>span:last-child]:overflow-visible [&>span:last-child]:text-clip" : "px-0 justify-center",
            tone
                ? cn("font-medium", active ? UTIL_TONES[tone].active : UTIL_TONES[tone].idle)
                : active
                ? "bg-[#E8F0FF] text-[#1D4ED8] font-semibold dark:bg-[#2563EB]/20 dark:text-[#93C5FD]"
                : "text-[#1E293B] font-medium hover:bg-[#DCE4F0] hover:text-[#123B7A] dark:text-[#A1A1AA] dark:hover:bg-[#27272A] dark:hover:text-[#E4E4E7]",
        );

    const subButtonClass = (active: boolean) =>
        cn(
            "w-full h-auto px-3 py-2 text-[11px] rounded-[10px] whitespace-normal break-words transition-colors duration-150",
            active
                ? "bg-[#E8F0FF] text-[#1D4ED8] font-semibold dark:bg-[#2563EB]/20 dark:text-[#93C5FD]"
                : "text-[#1E293B] font-medium hover:bg-[#DCE4F0] hover:text-[#123B7A] dark:text-[#A1A1AA] dark:hover:bg-[#27272A] dark:hover:text-[#E4E4E7]",
        );

    const subListClass = "ml-[1.6rem] mt-0.5 pl-3 border-l border-[#CBD5E1] dark:border-[#3F3F46] space-y-0.5";

    const ActiveBar = () => (
        <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-[#2563EB]" />
    );

    const sidebarBg = "bg-[#FAFAFA] dark:bg-[#18181B]";

    return (
        <>
            <GlobalLoader isLoading={isLoggingOut} />
            <Sidebar
                collapsible="icon"
                variant="sidebar"
                className={cn("border-r border-[#CBD5E1] dark:border-[#3F3F46] z-50 [&_[data-slot=sidebar-container]]:z-50", sidebarBg)}
                style={{ "--sidebar-width": "16.25rem", "--sidebar-width-icon": "4rem" } as React.CSSProperties}
            >
                {/* Header / Branding */}
                <SidebarHeader className={cn("sidebar-glass-header gap-0 p-0 h-[55px] box-border justify-center")}>
                    <div className={cn(
                        "flex items-center transition-all duration-200",
                        expanded ? "px-[18px] gap-3 h-full" : "justify-center px-0 h-full",
                    )}>
                        <div className="flex items-center justify-center h-9 w-auto flex-shrink-0">
                            <img src={`${import.meta.env.BASE_URL}pragati_rnd_logo_light.png`} alt="PRAGATI R&D Logo" className="h-full w-auto object-contain dark:hidden" />
                            <img src={`${import.meta.env.BASE_URL}pragati_rnd_logo_dark.png`} alt="PRAGATI R&D Logo" className="hidden h-full w-auto object-contain dark:block" />
                        </div>
                        {expanded && (
                            <div className="flex flex-col overflow-hidden min-w-0">
                                <span className="text-[13px] font-bold tracking-tight text-[#123B7A] dark:text-[#93C5FD] whitespace-nowrap leading-tight">
                                    PRAGATI R&D
                                </span>
                                <span className="text-[9px] font-semibold tracking-[0.12em] text-[#475569] whitespace-nowrap leading-tight mt-0.5">
                                    IIT GUWAHATI
                                </span>
                            </div>
                        )}
                    </div>
                </SidebarHeader>

                {/* Navigation */}
                <SidebarContent className={cn("px-3 py-4", sidebarBg)}>
                    <SidebarGroup className="p-0">
                        {expanded && (
                            <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                                Main
                            </div>
                        )}
                        <SidebarMenu className="gap-0.5">
                            {menuItems.map((item, index) => {
                                if (item.isSubOf) {
                                    if (!expanded) return null;
                                    const isSubActive = item.path ? isActivePath(item.path) : false;
                                    return (
                                        <SidebarMenuItem key={item.label}>
                                            <SidebarMenuSub className={cn(subListClass, "mt-0")}>
                                                <SidebarMenuSubItem>
                                                    <SidebarMenuSubButton
                                                        onClick={() => item.path && navigate(item.path)}
                                                        className={subButtonClass(isSubActive)}
                                                    >
                                                        {item.label}
                                                    </SidebarMenuSubButton>
                                                </SidebarMenuSubItem>
                                            </SidebarMenuSub>
                                        </SidebarMenuItem>
                                    );
                                }

                                const isAnySubMenuActive = item.subMenu?.some((sub) => isActivePath(sub.path)) ?? false;
                                const isActive = !!((item.path && isActivePath(item.path)) || isAnySubMenuActive);
                                const isSubMenuOpen = openSubMenus.includes(item.label);
                                const badge = getBadge(item.label);
                                const showDivider = index > 0 && DIVIDER_BEFORE.has(item.label);

                                return (
                                    <SidebarMenuItem
                                        key={item.label}
                                        className={cn(showDivider && "border-t border-[#CBD5E1] dark:border-[#52525B] mt-2 pt-2")}
                                    >
                                        <SidebarMenuButton
                                            onClick={() => handleMenuItemClick(item)}
                                            className={cn(navButtonClass(isActive), expanded && "gap-3")}
                                            tooltip={item.label}
                                        >
                                            {isActive && expanded && <ActiveBar />}
                                            <item.icon
                                                className={cn(
                                                    "!w-5 !h-5 flex-shrink-0",
                                                    isActive ? "text-[#2563EB] dark:text-[#93C5FD]" : "text-[#475569]",
                                                )}
                                                strokeWidth={1.75}
                                            />
                                            {expanded && <span className="leading-snug break-words min-w-0">{item.label}</span>}

                                            {badge && expanded && <NavBadge {...badge} />}
                                            {badge && !expanded && (
                                                <span className={cn(
                                                    "absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full",
                                                    badge.tone === "orange" ? "bg-[#F97316]" : "bg-[#EF4444]",
                                                )} />
                                            )}

                                            {item.subMenu && !item.alwaysOpen && expanded && (
                                                <ChevronDownIcon
                                                    className={cn(
                                                        "w-4 h-4 transition-transform flex-shrink-0 ml-auto",
                                                        isActive ? "text-[#2563EB]" : "text-[#64748B]",
                                                        isSubMenuOpen && "rotate-180",
                                                    )}
                                                    strokeWidth={2}
                                                />
                                            )}
                                        </SidebarMenuButton>

                                        {item.subMenu && (isSubMenuOpen || item.alwaysOpen) && expanded && (
                                            <SidebarMenuSub className={subListClass}>
                                                {item.subMenu.map((subItem) => (
                                                    <SidebarMenuSubItem key={subItem.label}>
                                                        <SidebarMenuSubButton
                                                            onClick={() => handleSubMenuItemClick(subItem)}
                                                            className={subButtonClass(isActivePath(subItem.path))}
                                                        >
                                                            {subItem.label}
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                ))}
                                            </SidebarMenuSub>
                                        )}
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroup>
                </SidebarContent>

                {/* Footer: utility links + profile */}
                <SidebarFooter className={cn("p-0 border-t border-[#CBD5E1] dark:border-[#3F3F46]", sidebarBg)}>
                    <div className="mx-3 mt-3 mb-2 p-1.5 space-y-0.5 rounded-xl bg-[#EEF2F7] dark:bg-[#27272A]">
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={() => setIsHelpOpen(true)}
                                className={utilButtonClass(isHelpOpen, "manual")}
                                tooltip="User Manual"
                            >
                                <HelpCircle className={cn("!w-5 !h-5 flex-shrink-0", UTIL_TONES.manual.icon)} strokeWidth={1.75} />
                                {expanded && <span>User Manual</span>}
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={() => navigate("/messages")}
                                className={utilButtonClass(isActivePath("/messages"), "support")}
                                tooltip="Help and Support"
                            >
                                <MessageCircle className={cn("!w-5 !h-5 flex-shrink-0", UTIL_TONES.support.icon)} strokeWidth={1.75} />
                                {expanded && <span>Help and Support</span>}
                                {unreadCount > 0 && expanded && <NavBadge count={unreadCount} tone="orange" />}
                                {unreadCount > 0 && !expanded && (
                                    <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-[#F97316]" />
                                )}
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={handleLogout}
                                className={cn(
                                    utilButtonClass(false),
                                    "hover:!bg-red-200 hover:!text-red-700 dark:hover:!bg-red-950/20 dark:hover:!text-red-400",
                                )}
                                tooltip="Log out"
                            >
                                <LogOutIcon className="!w-5 !h-5 flex-shrink-0 text-[#475569]" strokeWidth={1.75} />
                                {expanded && <span>Log out</span>}
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </div>

                    <div className="px-3 pb-3 pt-1">
                        {isLoading || isLoadingUserDoc ? (
                            <div className={cn("h-[58px] rounded-xl bg-[#F1F5F9] dark:bg-[#27272A] animate-pulse", !expanded && "w-9 h-9 mx-auto")} />
                        ) : (
                            <div
                                onClick={() => navigate("/profile")}
                                className={cn(
                                    "flex items-center cursor-pointer transition-colors duration-150",
                                    expanded
                                        ? "gap-3 px-3 py-2.5 rounded-xl bg-white border border-[#E2E8F0] hover:bg-[#F4F4F5] dark:bg-[#27272A] dark:border-[#3F3F46]"
                                        : "justify-center",
                                )}
                            >
                                <div className="flex items-center justify-center flex-shrink-0 w-9 h-9 rounded-full bg-[#DBEAFE] text-[#2563EB] font-semibold text-[14px]">
                                    {userDoc?.user_image ? (
                                        <img src={frappeUrl(userDoc.user_image)} alt="Profile" className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        userDoc?.full_name?.charAt(0).toUpperCase() || "U"
                                    )}
                                </div>
                                {expanded && (
                                    <>
                                        <div className="flex-1 min-w-0 text-left">
                                            <div className="truncate text-[12px] font-semibold text-[#1E293B] dark:text-[#E4E4E7] leading-tight">
                                                {userDoc?.full_name || "User Name"}
                                            </div>
                                            <div className="truncate text-[9px] text-[#475569] leading-tight mt-0.5">
                                                {userDoc?.email || ""}
                                            </div>
                                        </div>
                                        <ChevronRightIcon className="w-4 h-4 flex-shrink-0 text-[#475569]" strokeWidth={2} />
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </SidebarFooter>
            </Sidebar>
            <HelpModule isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
            <AddStudentModal isOpen={isAddStudentOpen} onClose={() => setIsAddStudentOpen(false)} />
        </>
    );
}
