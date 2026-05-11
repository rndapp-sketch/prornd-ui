
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
    CreditCard,
    BarChart3,
    MessageSquare,
    MessageCircle,
    X,
    Paperclip,
    Users as UsersIcon,
    UserCheck,
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useAppwriteSession } from "@/hooks/useAppwriteSession";
import { useUnreadCount } from "@/hooks/useUnreadCount";

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
    const { mutate } = useSWRConfig();
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState("");
    const [feedbackUrgent, setFeedbackUrgent] = useState(false);
    const [feedbackFiles, setFeedbackFiles] = useState<File[]>([]);
    const [isSendingFeedback, setIsSendingFeedback] = useState(false);
    const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "success" | "error">("idle");
    const feedbackFileInputRef = React.useRef<HTMLInputElement>(null);

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

    // Fetch pending task count
    const { data: pendingTaskData } = useFrappeGetCall<{
        message: { results: Array<{ doctype: string; records: any[]; mod_vis?: number }> };
    }>(
        "rndopsapp.rndopsapp.doctype.module_registry.module_registry.get_pending_task",
        { page_name: "pending-task" },
        currentUser ? undefined : null,
    );

    // Appwrite messaging — unread count for the sidebar badge.
    const appwriteSession = useAppwriteSession();
    const { unreadCount } = useUnreadCount(appwriteSession.user?.$id ?? null);

    // Calculate count matching PendingTask.tsx filter logic
    const pendingTaskCount = React.useMemo(() => {
        if (!pendingTaskData?.message?.results) return 0;
        let count = 0;
        pendingTaskData.message.results.forEach((group) => {
            if (group.mod_vis || group.doctype === "Advance Settlement") {
                group.records.forEach((record) => {
                    if (isHeadApprover && group.doctype === "Project Registration" && allowedProjectNames && !allowedProjectNames.has(record.name)) {
                        return;
                    }
                    count++;
                });
            }
        });
        return count;
    }, [pendingTaskData, isHeadApprover, allowedProjectNames]);

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
            label: "Pending Task",
            icon: ListTodo,
            path: "/pending-task",
        },
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
            label: "Messages",
            icon: MessageCircle,
            path: "/messages",
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
    ].filter((item) => {
        if (item.label === "Upload Director PDF") {
            const allowedRoles = ["staff, RnD"];
            return roles && allowedRoles.some((role) => roles.includes(role));
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
            // Visible to staff, HOS, Dean, DoRnD, Head Approver - NOT permanent employees
            const allowedRoles = [
                "staff, RnD",
                "Hos, RnD (Head of Section, RnD)",
                "Dean, RnD",

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
        if (item.label === "Delegate User") {
            return roles?.includes("Permanent Employee") ?? false;
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
            // Clear all SWR cache
            await mutate(
                () => true, // Match all keys
                undefined, // No data to update
                { revalidate: false }, // Do not revalidate
            );
            navigate("/login");
        } catch (error) {
            console.error("Logout failed:", error);
            setIsLoggingOut(false);
        }
    };

    const handleSendFeedback = async () => {
        if (!feedbackMessage.trim()) return;
        setIsSendingFeedback(true);
        setFeedbackStatus("idle");
        try {
            const form = new FormData();
            form.append("message", feedbackMessage.trim());
            form.append("urgent", feedbackUrgent ? "1" : "0");
            form.append("channel_id", "jnkacpywbjnh9frhg1bb8gs85y");
            form.append("feedback", "1");
            form.append("current_user_email", currentUser || "");
            feedbackFiles.forEach((file) => form.append("files", file, file.name));

            const res = await fetch(
                "/api/method/rndopsapp.rndopsapp.api.publish_to_mattermost",
                {
                    method: "POST",
                    headers: { "X-Frappe-CSRF-Token": "fetch" },
                    body: form,
                },
            );
            if (!res.ok) throw new Error("Failed");
            setFeedbackStatus("success");
            setFeedbackMessage("");
            setFeedbackUrgent(false);
            setFeedbackFiles([]);
            setTimeout(() => {
                setIsFeedbackOpen(false);
                setFeedbackStatus("idle");
            }, 1500);
        } catch {
            setFeedbackStatus("error");
        } finally {
            setIsSendingFeedback(false);
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
                                                {state === "expanded" && <span className="truncate">{item.label}</span>}
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

                                            {item.label === "Messages" && unreadCount > 0 && state === "expanded" && (
                                                <span className={cn(
                                                    "ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full text-[10px] font-bold leading-none",
                                                    isActive
                                                        ? "bg-[#4A6CF7] text-white"
                                                        : "bg-[#D97757] text-white",
                                                )}>
                                                    {unreadCount > 99 ? "99+" : unreadCount}
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
                                onClick={() => setIsFeedbackOpen(true)}
                                className={cn(
                                    "w-full h-8 rounded-lg text-[12px] font-medium transition-all duration-150 text-[#3F3F46] dark:text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#27272A] hover:text-[#18181B] dark:hover:text-[#E4E4E7]",
                                    state === "expanded" ? "px-2.5 justify-start gap-2.5" : "px-0 justify-center",
                                )}
                                tooltip="Help & Support"
                            >
                                <MessageSquare
                                    className={cn(state === "expanded" ? "w-[15px] h-[15px]" : "w-5 h-5", "flex-shrink-0 text-[#71717A]")}
                                    strokeWidth={1.75}
                                />
                                {state === "expanded" && <span>Help & Support</span>}
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

            {/* Help & Support Modal */}
            {isFeedbackOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                    <div className="w-full max-w-md overflow-hidden rounded-2xl border-[1.5px] border-[#D4D4D8] dark:border-[#52525B] bg-white dark:bg-[#27272A] shadow-2xl">
                        <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-transparent" />
                        <div className="px-6 py-4 border-b border-[#E4E4E7] dark:border-[#3F3F46] flex items-center justify-between">
                            <h2 className="text-[14px] font-extrabold text-[#18181B] dark:text-[#E4E4E7] flex items-center gap-2.5">
                                <span className="w-7 h-7 rounded-lg bg-[#EEF2FF] dark:bg-[#4A6CF7]/15 flex items-center justify-center flex-shrink-0">
                                    <MessageSquare className="w-3.5 h-3.5 text-[#4A6CF7] dark:text-[#93C5FD]" />
                                </span>
                                Help & Support
                            </h2>
                            <button
                                onClick={() => { setIsFeedbackOpen(false); setFeedbackMessage(""); setFeedbackUrgent(false); setFeedbackFiles([]); setFeedbackStatus("idle"); }}
                                className="p-1.5 rounded-lg hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] text-[#71717A] transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <Textarea
                                placeholder="Write your message or feedback..."
                                value={feedbackMessage}
                                onChange={(e) => setFeedbackMessage(e.target.value)}
                                rows={4}
                                className="resize-none text-[13px] border-[1.5px] border-[#D4D4D8] dark:border-[#52525B] focus:border-[#4A6CF7] rounded-xl"
                            />

                            <div>
                                <input ref={feedbackFileInputRef} type="file" multiple className="hidden"
                                    onChange={(e) => { const picked = Array.from(e.target.files || []); setFeedbackFiles((prev) => [...prev, ...picked]); e.target.value = ""; }}
                                />
                                <button type="button" onClick={() => feedbackFileInputRef.current?.click()}
                                    className="flex items-center gap-1.5 text-[11px] font-semibold text-[#4A6CF7] dark:text-[#93C5FD] hover:text-[#3558E8] transition-colors">
                                    <Paperclip className="w-3.5 h-3.5" />
                                    Attach files
                                </button>
                                {feedbackFiles.length > 0 && (
                                    <ul className="mt-2 space-y-1">
                                        {feedbackFiles.map((f, i) => (
                                            <li key={i} className="flex items-center justify-between text-[11px] bg-[#F4F4F5] dark:bg-[#3F3F46] rounded-lg px-2.5 py-1.5 border border-[#E4E4E7] dark:border-[#52525B]">
                                                <span className="truncate text-[#3F3F46] dark:text-[#D4D4D8] max-w-[80%] font-medium">{f.name}</span>
                                                <button type="button" onClick={() => setFeedbackFiles((prev) => prev.filter((_, idx) => idx !== i))} className="ml-2 text-[#A1A1AA] hover:text-red-500 transition-colors">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div className="flex items-start gap-2.5">
                                <Checkbox id="urgent" checked={feedbackUrgent} onCheckedChange={(v) => setFeedbackUrgent(!!v)} className="mt-0.5 border-[#D4D4D8]" />
                                <div>
                                    <label htmlFor="urgent" className="text-[12px] font-semibold text-[#3F3F46] dark:text-[#D4D4D8] cursor-pointer select-none">
                                        Mark as urgent
                                    </label>
                                    <p className="text-[11px] text-[#A1A1AA] mt-0.5">Requires immediate attention.</p>
                                </div>
                            </div>

                            {feedbackStatus === "success" && (
                                <p className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-lg px-3 py-2">
                                    Feedback sent successfully!
                                </p>
                            )}
                            {feedbackStatus === "error" && (
                                <p className="text-[11px] text-red-600 font-semibold bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-lg px-3 py-2">
                                    Failed to send. Please try again.
                                </p>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-[#E4E4E7] dark:border-[#3F3F46] flex justify-end gap-2">
                            <Button variant="outline" size="sm"
                                onClick={() => { setIsFeedbackOpen(false); setFeedbackMessage(""); setFeedbackUrgent(false); setFeedbackFiles([]); setFeedbackStatus("idle"); }}
                                className="border-[1.5px] border-[#D4D4D8] dark:border-[#52525B] text-[#3F3F46] dark:text-[#D4D4D8] hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] rounded-lg text-[11px] font-semibold"
                            >
                                Cancel
                            </Button>
                            <Button size="sm"
                                disabled={!feedbackMessage.trim() || isSendingFeedback}
                                onClick={handleSendFeedback}
                                className="bg-[#4A6CF7] hover:bg-[#3558E8] text-white rounded-lg text-[11px] font-semibold shadow-sm disabled:opacity-50"
                            >
                                {isSendingFeedback ? "Sending…" : "Send"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
