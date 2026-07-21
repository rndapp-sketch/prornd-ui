
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
    const { mutate } = useSWRConfig();
    const appwriteSession = useAppwriteSession();
    const { unreadCount } = useUnreadCount(appwriteSession.user?.$id ?? null);

    const { data: userDoc, isLoading: isLoadingUserDoc } = useFrappeGetDoc(
        "User",
        currentUser || "",
        {
            fields: ["full_name", "email", "user_image"],
            enabled: !!currentUser,
        },
    );

    const { roles } = useUserRoles(currentUser || null);
    const isHeadApprover = roles?.includes("head_approver_1") ?? false;
    const isPermanentEmployee = roles?.includes("Permanent Employee") ?? false;
    const canUploadDirectorPdf = roles?.includes("staff, RnD") ?? false;
    const isHosRnd = roles?.includes("Hos, RnD (Head of Section, RnD)") ?? false;
    const isAdoRnd = roles?.includes("Ado_RnD") ?? false;

    // Fetch projects assigned to current user as head_approver (same filter as PendingTask.tsx)
    const { data: headApproverProjects } = useFrappeGetDocList("Project Registration", {
        filters: [["head_approver", "=", currentUser ?? ""]],
        fields: ["name"],
        limit: 500,
    }, isHeadApprover && !!currentUser ? undefined : null);

    const allowedProjectNames = React.useMemo(() => {
        if (!isHeadApprover || !headApproverProjects) return null;
        return new Set(headApproverProjects.map((p: { name: string }) => p.name));
    }, [isHeadApprover, headApproverProjects]);

    // Fetch Leave Module names where PI matches current user (for accurate count)
    const { data: piLeaveModules } = useFrappeGetDocList("Leave Module", {
        filters: [["pi", "=", currentUser ?? ""]],
        fields: ["name"],
        limit: 500,
    }, isPermanentEmployee && !!currentUser ? undefined : null);

    const allowedLeaveNames = React.useMemo(() => {
        if (!isPermanentEmployee || !piLeaveModules) return null;
        return new Set(piLeaveModules.map((l: { name: string }) => l.name));
    }, [isPermanentEmployee, piLeaveModules]);

    // Fetch pending task count
    const { data: pendingTaskData } = useFrappeGetCall<{
        message: { results: Array<{ doctype: string; records: any[]; mod_vis?: number }> };
    }>(
        "rndopsapp.rndopsapp.doctype.module_registry.module_registry.get_pending_task",
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
        if (!pendingTaskData?.message?.results) return 0;
        let count = 0;
        pendingTaskData.message.results.forEach((group) => {
            if (SIDEBAR_HIDDEN_DOCTYPES.has(group.doctype)) return;
            const shouldIncludeGroup = group.mod_vis || group.doctype === "Advance Settlement";
            group.records.forEach((record) => {
                const isHosPending = record.status === "Pending HoS Approval";
                if (!shouldIncludeGroup && !(isHosRnd && isHosPending)) return;
                if (isHeadApprover && group.doctype === "Project Registration" && allowedProjectNames && !allowedProjectNames.has(record.name) && !(isHosRnd && isHosPending)) return;
                if (isPermanentEmployee && group.doctype === "Leave Module" && allowedLeaveNames) {
                    if (record.status === "Pending PI Approval" && !allowedLeaveNames.has(record.name)) return;
                }
                if (record.status === "Endorsement Approved") return;
                if (record.status === "Sanction Approved" && group.doctype !== "Direct Purchase") return;
                if (isHosRnd && !isAdoRnd && record.status === "Pending Associate Dean") return;
                if (isAdoRnd && !isHosRnd && record.status === "Pending HoS Approval") return;
                count++;
            });
        });
        return count;
    }, [pendingTaskData, isHeadApprover, allowedProjectNames, isPermanentEmployee, allowedLeaveNames, isHosRnd, isAdoRnd]);

    const pendingDirectorPdfCount = pendingDirectorPdfData?.message?.data?.length ?? 0;

    // Leave Module applications pending the current user's approval as PI —
    // scoped server-side, so no extra client-side filtering is needed here.
    const { data: pendingApplicationData } = useFrappeGetCall<{
        message: { user: string; results: Array<{ name: string }> };
    }>(
        "rndopsapp.rndopsapp.doctype.module_registry.module_registry.get_pending_application",
        {},
        currentUser && isPermanentEmployee ? undefined : null,
    );
    const pendingApplicationCount = pendingApplicationData?.message?.results?.length ?? 0;

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
                { label: "Registration", path: "/project-registration" },
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
            label: "Leave Module",
            icon: Calendar,
            path: "/leave-module",
        },
        {
            label: "Resignation",
            icon: FileText,
            path: "/project-staff-resignation",
        },
        // ...(isPermanentEmployee ? [{
        //     label: "Form Cancellation",
        //     icon: FileText,
        //     path: "/form-application",
        // }] : []),
        {
            label: "Pending Task",
            icon: ListTodo,
            path: "/pending-task",
        },
        ...(isPermanentEmployee ? [{
            label: "Pending Application",
            icon: ClipboardCheck,
            path: "/pending-application",
        }] : []),
        {
            label: "Task Registry",
            icon: FileText,
            path: "/task-registry",
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
        {
            label: "Project Staff",
            icon: UsersIcon,
            action: () => {
                const username = currentUser ? currentUser.split("@")[0] : "";
                const timestamp = Date.now();
                const jsonString = JSON.stringify({ username, projectCodes: [], timestamp });
                const encodedJson = btoa(
                    Array.from(new TextEncoder().encode(jsonString), (b) =>
                        String.fromCharCode(b),
                    ).join(""),
                );
                window.open(`http://172.16.135.27:7079/sso?token=${encodedJson}`, "_blank");
            },
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
        if (item.label === "Project Search") {
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
        if (item.label === "Pending Task") {
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
        if (item.label === "Payments") {
            // Visible only to staff
            const allowedRoles = [
                "staff, RnD",
                "Hos, RnD (Head of Section, RnD)",
            ];
            return roles && allowedRoles.some((role) => roles.includes(role));
        }
        if (item.label === "Projects") {
            const allowedRoles = ["Permanent Employee", "head_approver_1", "Dean, RnD"];
            return roles && allowedRoles.some((role) => roles.includes(role));
        }
        if (item.label === "Project Staff") {
            return roles?.includes("Permanent Employee") ?? false;
        }
        if (item.label === "Stakeholder Registration") {
            return !(roles?.includes("project staff") ?? false);
        }
        if (item.label === "Delegate User") {
            return roles?.includes("Permanent Employee") ?? false;
        }
        if (item.label === "Leave Module") {
            const allowedRoles = ["project staff", "IF - Inspired Faculty", "Independent Researcher"];
            return roles ? allowedRoles.some((role) => roles.includes(role)) : false;
        }
        if (item.label === "Resignation") {
            return roles?.includes("project staff") ?? false;
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
            console.error("Primary logout failed, attempting fallback logout:", error);
            const csrfToken = (window as any).csrf_token || "";
            const requests: Array<{ method: "POST" | "GET"; url: string }> = [
                { method: "POST", url: "/api/method/logout" },
                { method: "GET", url: "/api/method/logout" },
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
            navigate("/login", { replace: true });
            window.location.href = "/login";
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

    return (
        <>
            <GlobalLoader isLoading={isLoggingOut} />
            <Sidebar
                collapsible="icon"
                variant="sidebar"
                className="border-r border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#18181B] z-50 [&_[data-slot=sidebar-container]]:z-50"
                style={{ "--sidebar-width": "13.5rem", "--sidebar-width-icon": "3.5rem" } as React.CSSProperties}
            >
                {/* Header */}
                <SidebarHeader className="gap-0 p-0 border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#18181B]">
                    <div className="h-[2px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-transparent" />
                    <div className={cn(
                        "flex items-center h-[3.25rem] transition-all duration-200",
                        state === "expanded" ? "px-4 gap-3" : "justify-center px-0",
                    )}>
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-white border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm p-0.5">
                            <img src="/IITG_Large_Logo.gif" alt="IITG Logo" className="w-full h-full object-contain" />
                        </div>
                        {state === "expanded" && (
                            <div className="flex flex-col overflow-hidden min-w-0">
                                <span className="text-[13px] font-extrabold tracking-tight text-[#1E3A8A] dark:text-[#93C5FD] whitespace-nowrap leading-tight">
                                    R&D Portal
                                </span>
                                <span className="text-[10px] font-medium text-[#71717A] dark:text-[#71717A] whitespace-nowrap leading-tight">
                                    IIT Guwahati
                                </span>
                            </div>
                        )}
                    </div>
                </SidebarHeader>

                {/* Navigation */}
                <SidebarContent className="bg-white dark:bg-[#18181B] px-2 py-3">
                    <SidebarGroup>
                        <SidebarMenu className="space-y-0.5">
                            {menuItems.map((item) => {
                                if (item.isSubOf) {
                                    if (state !== "expanded") return null;
                                    const isSubActive = item.path ? isActivePath(item.path) : false;
                                    return (
                                        <SidebarMenuItem key={item.label}>
                                            <SidebarMenuSub className="ml-[1.875rem] pl-3 border-l-[1.5px] border-[#C7D2FE] dark:border-[#4A6CF7]/30 space-y-0.5">
                                                <SidebarMenuSubItem>
                                                    <SidebarMenuSubButton
                                                        onClick={() => item.path && navigate(item.path)}
                                                        className={cn(
                                                            "w-full px-2.5 py-1.5 text-[11px] rounded-lg font-semibold transition-all duration-150",
                                                            isSubActive
                                                                ? "bg-[#EEF2FF] text-[#1E3A8A] dark:bg-[#4A6CF7]/15 dark:text-[#93C5FD]"
                                                                : "text-[#52525B] dark:text-[#71717A] hover:bg-[#F4F4F5] dark:hover:bg-[#27272A] hover:text-[#18181B] dark:hover:text-[#E4E4E7]",
                                                        )}
                                                    >
                                                        {item.label}
                                                    </SidebarMenuSubButton>
                                                </SidebarMenuSubItem>
                                            </SidebarMenuSub>
                                        </SidebarMenuItem>
                                    );
                                }

                                const isAnySubMenuActive = item.subMenu?.some((sub) => isActivePath(sub.path)) ?? false;
                                const isActive = (item.path && isActivePath(item.path)) || isAnySubMenuActive;
                                const isSubMenuOpen = openSubMenus.includes(item.label);

                                return (
                                    <SidebarMenuItem key={item.label}>
                                        <SidebarMenuButton
                                            onClick={() => handleMenuItemClick(item)}
                                            className={cn(
                                                "w-full h-8 rounded-lg text-[12px] font-semibold transition-all duration-150",
                                                state === "expanded" ? "px-2.5 justify-start" : "px-0 justify-center",
                                                isActive
                                                    ? "bg-[#EEF2FF] text-[#1E3A8A] dark:bg-[#4A6CF7]/15 dark:text-[#93C5FD] font-bold"
                                                    : "text-[#3F3F46] dark:text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#27272A] hover:text-[#18181B] dark:hover:text-[#E4E4E7]",
                                            )}
                                            tooltip={item.label}
                                        >
                                            <div className={cn(
                                                "flex items-center",
                                                state === "expanded" ? "gap-2.5 w-full" : "justify-center",
                                            )}>
                                                <item.icon
                                                    className={cn(
                                                        state === "expanded" ? "w-[15px] h-[15px]" : "w-5 h-5",
                                                        "flex-shrink-0",
                                                        isActive
                                                            ? "text-[#4A6CF7] dark:text-[#93C5FD]"
                                                            : "text-[#71717A] dark:text-[#71717A]",
                                                    )}
                                                    strokeWidth={isActive ? 2 : 1.75}
                                                />
                                                {state === "expanded" && <span className="break-words leading-tight">{item.label}</span>}
                                            </div>

                                            {item.label === "Pending Task" && pendingTaskCount > 0 && state === "expanded" && (
                                                <span className={cn(
                                                    "ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold leading-none",
                                                    isActive
                                                        ? "bg-[#4A6CF7] text-white"
                                                        : "bg-[#D97757] text-white",
                                                )}>
                                                    {pendingTaskCount > 99 ? "99+" : pendingTaskCount}
                                                </span>
                                            )}

                                            {item.label === "Pending Application" && pendingApplicationCount > 0 && state === "expanded" && (
                                                <span className={cn(
                                                    "ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold leading-none",
                                                    isActive
                                                        ? "bg-[#4A6CF7] text-white"
                                                        : "bg-[#D97757] text-white",
                                                )}>
                                                    {pendingApplicationCount > 99 ? "99+" : pendingApplicationCount}
                                                </span>
                                            )}

                                            {item.label === "Upload Director PDF" && pendingDirectorPdfCount > 0 && state === "expanded" && (
                                                <span className={cn(
                                                    "ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold leading-none",
                                                    isActive
                                                        ? "bg-[#4A6CF7] text-white"
                                                        : "bg-[#D97757] text-white",
                                                )}>
                                                    {pendingDirectorPdfCount > 99 ? "99+" : pendingDirectorPdfCount}
                                                </span>
                                            )}

                                            {item.subMenu && !item.alwaysOpen && state === "expanded" && (
                                                <ChevronDownIcon
                                                    className={cn(
                                                        "w-3.5 h-3.5 transition-transform flex-shrink-0 ml-auto",
                                                        isActive ? "text-[#4A6CF7] dark:text-[#93C5FD]" : "text-[#A1A1AA]",
                                                        isSubMenuOpen && "rotate-180",
                                                    )}
                                                    strokeWidth={2}
                                                />
                                            )}
                                        </SidebarMenuButton>

                                        {item.subMenu && (isSubMenuOpen || item.alwaysOpen) && state === "expanded" && (
                                            <SidebarMenuSub className="ml-[1.875rem] mt-0.5 space-y-0.5 pl-3 border-l-[1.5px] border-[#C7D2FE] dark:border-[#4A6CF7]/30">
                                                {item.subMenu.map((subItem) => {
                                                    const isSubActive = isActivePath(subItem.path);
                                                    return (
                                                        <SidebarMenuSubItem key={subItem.label}>
                                                            <SidebarMenuSubButton
                                                                onClick={() => handleSubMenuItemClick(subItem)}
                                                                className={cn(
                                                                    "w-full px-2.5 py-1.5 text-[11px] rounded-lg font-medium transition-all duration-150",
                                                                    isSubActive
                                                                        ? "bg-[#EEF2FF] text-[#1E3A8A] dark:bg-[#4A6CF7]/15 dark:text-[#93C5FD] font-semibold"
                                                                        : "text-[#52525B] dark:text-[#71717A] hover:bg-[#F4F4F5] dark:hover:bg-[#27272A] hover:text-[#18181B] dark:hover:text-[#E4E4E7]",
                                                                )}
                                                            >
                                                                {subItem.label}
                                                            </SidebarMenuSubButton>
                                                        </SidebarMenuSubItem>
                                                    );
                                                })}
                                            </SidebarMenuSub>
                                        )}
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroup>
                </SidebarContent>

                {/* Footer */}
                <SidebarFooter className="p-0 border-t border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#18181B]">
                    <div className="px-2 py-2 space-y-0.5">
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={() => setIsHelpOpen(true)}
                                className={cn(
                                    "relative w-full h-8 rounded-lg text-[12px] font-medium transition-all duration-150 text-[#3F3F46] dark:text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#27272A] hover:text-[#18181B] dark:hover:text-[#E4E4E7]",
                                    isHelpOpen && "bg-[#EEF2FF] text-[#1E3A8A] dark:bg-[#4A6CF7]/15 dark:text-[#93C5FD] font-semibold",
                                    state === "expanded" ? "px-2.5 justify-start gap-2.5" : "px-0 justify-center",
                                )}
                                tooltip="User Manual"
                            >
                                <HelpCircle
                                    className={cn(state === "expanded" ? "w-[15px] h-[15px]" : "w-5 h-5", "flex-shrink-0 text-[#71717A]")}
                                    strokeWidth={1.75}
                                />
                                {state === "expanded" && <span>User Manual</span>}
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={() => navigate("/messages")}
                                className={cn(
                                    "relative w-full h-8 rounded-lg text-[12px] font-medium transition-all duration-150 text-[#3F3F46] dark:text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#27272A] hover:text-[#18181B] dark:hover:text-[#E4E4E7]",
                                    isActivePath("/messages") && "bg-[#EEF2FF] text-[#1E3A8A] dark:bg-[#4A6CF7]/15 dark:text-[#93C5FD] font-semibold",
                                    state === "expanded" ? "px-2.5 justify-start gap-2.5" : "px-0 justify-center",
                                )}
                                tooltip="Help and Support"
                            >
                                <MessageCircle
                                    className={cn(state === "expanded" ? "w-[15px] h-[15px]" : "w-5 h-5", "flex-shrink-0 text-[#71717A]")}
                                    strokeWidth={1.75}
                                />
                                {state === "expanded" && <span>Help and Support</span>}
                                {unreadCount > 0 && state === "expanded" && (
                                    <span className={cn(
                                        "ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold leading-none",
                                        isActivePath("/messages")
                                            ? "bg-[#4A6CF7] text-white"
                                            : "bg-[#D97757] text-white",
                                    )}>
                                        {unreadCount > 99 ? "99+" : unreadCount}
                                    </span>
                                )}
                                {unreadCount > 0 && state !== "expanded" && (
                                    <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-[#D97757]" />
                                )}
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={handleLogout}
                                className={cn(
                                    "w-full h-8 rounded-lg text-[12px] font-medium transition-all duration-150 text-[#3F3F46] dark:text-[#A1A1AA] hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400",
                                    state === "expanded" ? "px-2.5 justify-start gap-2.5" : "px-0 justify-center",
                                )}
                                tooltip="Log out"
                            >
                                <LogOutIcon
                                    className={cn(state === "expanded" ? "w-[15px] h-[15px]" : "w-5 h-5", "flex-shrink-0 text-[#71717A]")}
                                    strokeWidth={1.75}
                                />
                                {state === "expanded" && <span>Log out</span>}
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </div>

                    <div className="border-t border-[#E4E4E7] dark:border-[#3F3F46] px-2 py-2">
                        {isLoading || isLoadingUserDoc ? (
                            <div className={cn("h-9 rounded-lg bg-[#F4F4F5] dark:bg-[#27272A] animate-pulse", state !== "expanded" && "w-9 mx-auto")} />
                        ) : (
                            <div
                                onClick={() => navigate("/profile")}
                                className={cn(
                                    "flex items-center gap-2.5 p-1.5 rounded-lg cursor-pointer transition-all duration-150 hover:bg-[#F4F4F5] dark:hover:bg-[#27272A] border border-transparent hover:border-[#E4E4E7] dark:hover:border-[#3F3F46]",
                                    state === "expanded" ? "justify-start" : "justify-center",
                                )}
                            >
                                <div className="flex items-center justify-center flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[#EEF2FF] to-[#C7D2FE] text-[#4A6CF7] font-bold text-[11px] border border-[#C7D2FE] dark:from-[#4A6CF7]/20 dark:to-[#1E3A8A]/30 dark:text-[#93C5FD] dark:border-[#4A6CF7]/30">
                                    {userDoc?.user_image ? (
                                        <img src={userDoc.user_image} alt="Profile" className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        userDoc?.full_name?.charAt(0).toUpperCase() || "U"
                                    )}
                                </div>
                                {state === "expanded" && (
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="truncate text-[12px] font-bold text-[#18181B] dark:text-[#E4E4E7] leading-tight">
                                            {userDoc?.full_name || "User Name"}
                                        </div>
                                        <div className="truncate text-[10px] font-medium text-[#71717A] dark:text-[#71717A] leading-tight">
                                            {userDoc?.email || ""}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </SidebarFooter>
            </Sidebar>
            <HelpModule isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
        </>
    );
}
