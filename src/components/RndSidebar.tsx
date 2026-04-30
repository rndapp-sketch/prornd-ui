
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
    X,
    Paperclip,
    Users as UsersIcon,
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
                className="bg-[#F0EDE4] border-r border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 z-40"
                style={
                    {
                        "--sidebar-width": "13rem",
                        "--sidebar-width-icon": "3.5rem",
                    } as React.CSSProperties
                }
            >
                {/* --- Header with Claude styling --- */}
                <SidebarHeader
                    className={cn(
                        "h-16 border-b border-zinc-200 bg-[#F0EDE4] dark:bg-zinc-900 dark:border-zinc-800 flex items-center transition-all duration-200",
                        state === "expanded" ? "px-4" : "justify-center px-0",
                    )}
                >
                    <div
                        className={cn(
                            "flex items-center",
                            state === "expanded"
                                ? "gap-2 w-full"
                                : "justify-center",
                        )}
                    >
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
                            <img
                                src="/IITG_Large_Logo.gif"
                                alt="IITG Logo"
                                className="w-full h-full object-contain"
                            />
                        </div>
                        {state === "expanded" && (
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-sm font-serif font-bold text-zinc-800 dark:text-zinc-100 tracking-tight whitespace-nowrap leading-none">
                                    R&D Portal
                                </span>
                            </div>
                        )}
                    </div>
                </SidebarHeader>

                {/* --- Menu with Claude styling --- */}
                <SidebarContent className="px-2 py-3 bg-[#F0EDE4] dark:bg-zinc-900">
                    <SidebarGroup>
                        <SidebarMenu className="space-y-1">
                            {menuItems.map((item) => {
                                // Always-visible sub-items (e.g. Overview children)
                                if (item.isSubOf) {
                                    if (state !== "expanded") return null;
                                    const isSubActive = item.path ? isActivePath(item.path) : false;
                                    return (
                                        <SidebarMenuItem key={item.label}>
                                            <SidebarMenuSub className="ml-4 pl-3 border-l border-zinc-200 dark:border-zinc-800 space-y-0.5">
                                                <SidebarMenuSubItem>
                                                    <SidebarMenuSubButton
                                                        onClick={() => item.path && navigate(item.path)}
                                                        className={cn(
                                                            "w-full px-2.5 py-1.5 text-xs rounded-md font-medium transition-all duration-200",
                                                            isSubActive
                                                                ? "bg-[#E4E4E7] text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 font-semibold"
                                                                : "bg-transparent text-zinc-600 hover:bg-[#EBEBEA] hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200",
                                                        )}
                                                    >
                                                        {item.label}
                                                    </SidebarMenuSubButton>
                                                </SidebarMenuSubItem>
                                            </SidebarMenuSub>
                                        </SidebarMenuItem>
                                    );
                                }

                                const isAnySubMenuActive =
                                    item.subMenu?.some((sub) =>
                                        isActivePath(sub.path),
                                    ) ?? false;
                                const isActive =
                                    (item.path && isActivePath(item.path)) ||
                                    isAnySubMenuActive;
                                const isSubMenuOpen = openSubMenus.includes(
                                    item.label,
                                );

                                return (
                                    <SidebarMenuItem key={item.label}>
                                        <SidebarMenuButton
                                            onClick={() =>
                                                handleMenuItemClick(item)
                                            }
                                            className={cn(
                                                "w-full h-8 rounded-md font-bold text-xs transition-all duration-200",
                                                state === "expanded"
                                                    ? "px-2.5 justify-start"
                                                    : "px-0 justify-center",
                                                isActive
                                                    ? "bg-[#E4E4E7] text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                                                    : "bg-transparent text-zinc-600 hover:bg-[#EBEBEA] hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200",
                                            )}
                                            tooltip={item.label}
                                        >
                                            <div
                                                className={cn(
                                                    "flex items-center",
                                                    state === "expanded"
                                                        ? "gap-3 w-full"
                                                        : "justify-center",
                                                )}
                                            >
                                                <item.icon
                                                    className={cn(
                                                        state === "expanded"
                                                            ? "w-4 h-4"
                                                            : "w-5 h-5",
                                                        isActive
                                                            ? "text-zinc-900 dark:text-zinc-100"
                                                            : "text-zinc-500 dark:text-zinc-400",
                                                    )}
                                                    strokeWidth={1.5}
                                                />
                                                {state === "expanded" && (
                                                    <span>{item.label}</span>
                                                )}
                                            </div>

                                            {/* Notification badge for Pending Task */}
                                            {item.label === "Pending Task" &&
                                                pendingTaskCount > 0 &&
                                                state === "expanded" && (
                                                    <div
                                                        className={cn(
                                                            "flex items-center justify-center min-w-[18px] h-4.5 px-1.5 rounded-full text-[10px] font-bold ml-auto",
                                                            isActive
                                                                ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900"
                                                                : "bg-[#D97757] text-white",
                                                        )}
                                                    >
                                                        {pendingTaskCount > 99
                                                            ? "99+"
                                                            : pendingTaskCount}
                                                    </div>
                                                )}

                                            {item.subMenu &&
                                                !item.alwaysOpen &&
                                                state === "expanded" && (
                                                    <ChevronDownIcon
                                                        className={cn(
                                                            "w-4 h-4 transition-transform flex-shrink-0 text-zinc-400 opacity-80 ml-auto",
                                                            isSubMenuOpen &&
                                                            "rotate-180",
                                                        )}
                                                        strokeWidth={1.5}
                                                    />
                                                )}
                                        </SidebarMenuButton>

                                        {item.subMenu &&
                                            (isSubMenuOpen || item.alwaysOpen) &&
                                            state === "expanded" && (
                                                <SidebarMenuSub className="ml-4 mt-1 space-y-0.5 pl-3 border-l border-zinc-200 dark:border-zinc-800">
                                                    {item.subMenu.map(
                                                        (subItem) => {
                                                            const isSubActive =
                                                                isActivePath(
                                                                    subItem.path,
                                                                );
                                                            return (
                                                                <SidebarMenuSubItem
                                                                    key={
                                                                        subItem.label
                                                                    }
                                                                >
                                                                    <SidebarMenuSubButton
                                                                        onClick={() =>
                                                                            handleSubMenuItemClick(
                                                                                subItem,
                                                                            )
                                                                        }
                                                                        className={cn(
                                                                            "w-full px-2.5 py-1.5 text-xs rounded-md font-medium transition-all duration-200",
                                                                            isSubActive
                                                                                ? "bg-[#E4E4E7] text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 font-semibold"
                                                                                : "bg-transparent text-zinc-600 hover:bg-[#EBEBEA] hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200",
                                                                        )}
                                                                    >
                                                                        {
                                                                            subItem.label
                                                                        }
                                                                    </SidebarMenuSubButton>
                                                                </SidebarMenuSubItem>
                                                            );
                                                        },
                                                    )}
                                                </SidebarMenuSub>
                                            )}
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroup>
                </SidebarContent>

                {/* --- Footer with Claude styling --- */}
                <SidebarFooter className="px-2 py-3 border-t border-zinc-200 bg-[#F0EDE4] dark:bg-zinc-900 dark:border-zinc-800">
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={() => setIsFeedbackOpen(true)}
                            className={cn(
                                "w-full h-8 rounded-md font-medium text-xs transition-all duration-200 bg-transparent text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200",
                                state === "expanded"
                                    ? "px-2.5 justify-start"
                                    : "px-0 justify-center",
                            )}
                            tooltip="Help & Support"
                        >
                            <MessageSquare
                                className={cn(
                                    state === "expanded" ? "w-4 h-4" : "w-5 h-5",
                                    "text-zinc-500 dark:text-zinc-400",
                                )}
                                strokeWidth={1.5}
                            />
                            {state === "expanded" && (
                                <span className="ml-2">Help & Support</span>
                            )}
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            onClick={handleLogout}
                            className={cn(
                                "w-full h-8 rounded-md font-medium text-xs transition-all duration-200 bg-transparent text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200",
                                state === "expanded"
                                    ? "px-2.5 justify-start"
                                    : "px-0 justify-center",
                            )}
                            tooltip="Log out"
                        >
                            <LogOutIcon
                                className={cn(
                                    state === "expanded"
                                        ? "w-4 h-4"
                                        : "w-5 h-5",
                                    "text-zinc-500 dark:text-zinc-400",
                                )}
                                strokeWidth={1.5}
                            />
                            {state === "expanded" && (
                                <span className="ml-2">Log out</span>
                            )}
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                        {isLoading || isLoadingUserDoc ? (
                            <div
                                className={cn(
                                    "p-2 text-xs text-zinc-500 font-medium",
                                    state !== "expanded" && "hidden",
                                )}
                            >
                                Loading...
                            </div>
                        ) : (
                            <div
                                onClick={() => navigate("/profile")}
                                className={cn(
                                    "flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer",
                                    state === "expanded"
                                        ? "justify-start"
                                        : "justify-center",
                                )}
                            >
                                <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-full bg-[#E4E4E7] text-zinc-600 font-medium text-xs border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                                    {userDoc?.user_image ? (
                                        <img
                                            src={userDoc.user_image}
                                            alt="Profile"
                                            className="w-full h-full rounded-full object-cover"
                                        />
                                    ) : (
                                        userDoc?.full_name
                                            ?.charAt(0)
                                            .toUpperCase() || "U"
                                    )}
                                </div>
                                {state === "expanded" && (
                                    <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                                        <span className="truncate font-bold text-zinc-900 dark:text-zinc-100">
                                            {userDoc?.full_name || "User Name"}
                                        </span>
                                        <span className="truncate text-xs font-bold text-zinc-500 dark:text-zinc-400">
                                            {userDoc?.email || ""}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </SidebarFooter>
            </Sidebar>

            {/* Feedback Modal */}
            {isFeedbackOpen && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white dark:bg-zinc-900 dark:border-zinc-700 shadow-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-zinc-500" />
                                Help & Support
                            </h2>
                            <button
                                onClick={() => {
                                    setIsFeedbackOpen(false);
                                    setFeedbackMessage("");
                                    setFeedbackUrgent(false);
                                    setFeedbackFiles([]);
                                    setFeedbackStatus("idle");
                                }}
                                className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <Textarea
                            placeholder="Write your message or feedback..."
                            value={feedbackMessage}
                            onChange={(e) => setFeedbackMessage(e.target.value)}
                            rows={4}
                            className="mb-3 resize-none text-sm"
                        />

                        {/* File attachments */}
                        <div className="mb-4">
                            <input
                                ref={feedbackFileInputRef}
                                type="file"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                    const picked = Array.from(e.target.files || []);
                                    setFeedbackFiles((prev) => [...prev, ...picked]);
                                    e.target.value = "";
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => feedbackFileInputRef.current?.click()}
                                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                            >
                                <Paperclip className="w-3.5 h-3.5" />
                                Attach files
                            </button>
                            {feedbackFiles.length > 0 && (
                                <ul className="mt-2 space-y-1">
                                    {feedbackFiles.map((f, i) => (
                                        <li key={i} className="flex items-center justify-between text-xs bg-zinc-50 dark:bg-zinc-800 rounded px-2 py-1 border border-zinc-200 dark:border-zinc-700">
                                            <span className="truncate text-zinc-700 dark:text-zinc-300 max-w-[80%]">{f.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => setFeedbackFiles((prev) => prev.filter((_, idx) => idx !== i))}
                                                className="ml-2 text-zinc-400 hover:text-red-500 transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <div className="flex items-start gap-2 mb-5">
                            <Checkbox
                                id="urgent"
                                checked={feedbackUrgent}
                                onCheckedChange={(v) => setFeedbackUrgent(!!v)}
                                className="mt-0.5"
                            />
                            <div>
                                <label
                                    htmlFor="urgent"
                                    className="text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer select-none"
                                >
                                    Mark as urgent
                                </label>
                                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                                    Check this if the issue requires immediate attention.
                                </p>
                            </div>
                        </div>

                        {feedbackStatus === "success" && (
                            <p className="text-xs text-green-600 font-medium mb-3">
                                Feedback sent successfully!
                            </p>
                        )}
                        {feedbackStatus === "error" && (
                            <p className="text-xs text-red-500 font-medium mb-3">
                                Failed to send. Please try again.
                            </p>
                        )}

                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setIsFeedbackOpen(false);
                                    setFeedbackMessage("");
                                    setFeedbackUrgent(false);
                                    setFeedbackFiles([]);
                                    setFeedbackStatus("idle");
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                disabled={!feedbackMessage.trim() || isSendingFeedback}
                                onClick={handleSendFeedback}
                                className="bg-[#D97757] hover:bg-[#c66a4e] text-white"
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



// -=-=======================



// import React from "react";
// import {
//     Sidebar,
//     SidebarContent,
//     SidebarFooter,
//     SidebarGroup,
//     SidebarHeader,
//     SidebarMenu,
//     SidebarMenuItem,
//     SidebarMenuButton,
//     SidebarMenuSub,
//     SidebarMenuSubButton,
//     SidebarMenuSubItem,
//     useSidebar,
// } from "@/components/ui/sidebar";
// import {
//     HomeIcon,
//     FileText,
//     ChevronDownIcon,
//     LogOutIcon,
//     ListTodo,
//     CreditCard,
//     BarChart3,
//     Users, // For PI Projects
// } from "lucide-react";
// import type { LucideIcon } from "lucide-react";
// import {
//     useFrappeAuth,
//     useFrappeGetDoc,
//     useFrappeGetCall,
//     useFrappeGetDocList,
// } from "frappe-react-sdk";
// import { useNavigate, useLocation } from "react-router-dom";
// import { useState } from "react";
// import { cn } from "@/lib/utils";
// import { GlobalLoader } from "@/components/ui/global-loader";
// import { useSWRConfig } from "swr";
// import { useUserRoles } from "./UserRole";

// // --- Interfaces ---
// interface SubMenuItem {
//     label: string;
//     path: string;
// }

// interface MenuItem {
//     label: string;
//     icon: LucideIcon;
//     path?: string;
//     subMenu?: SubMenuItem[];
//     isSubOf?: string;
// }

// export function AppSidebar() {
//     const { logout, currentUser, isLoading } = useFrappeAuth();
//     const { state } = useSidebar();
//     const navigate = useNavigate();
//     const location = useLocation();
//     const [openSubMenus, setOpenSubMenus] = useState<string[]>([]);
//     const [isLoggingOut, setIsLoggingOut] = useState(false);
//     const { mutate } = useSWRConfig();

//     const { data: userDoc, isLoading: isLoadingUserDoc } = useFrappeGetDoc(
//         "User",
//         currentUser || "",
//         {
//             fields: ["full_name", "email", "user_image"],
//             enabled: !!currentUser,
//         },
//     );

//     const { roles } = useUserRoles(currentUser || null);

//     // --- ROLE LOGIC ---
//     const isDirector = roles?.includes("Director");
//     const isHeadApprover = roles?.includes("head_approver_1") ?? false;

//     // High-level R&D admin roles (Who see the Global Director Dashboard)
//     const hasDirectorOverviewAccess = roles?.some(r =>
//         ["Director", "Dean, RnD", "Ado_RnD", "Hos, RnD (Head of Section, RnD)"].includes(r)
//     );

//     // Fetch pending task counts
//     const { data: headApproverProjects } = useFrappeGetDocList("Project Registration", {
//         filters: [["head_approver", "=", currentUser ?? ""]],
//         fields: ["name"],
//         limit: 500,
//     }, isHeadApprover && !!currentUser ? undefined : null);

//     const allowedProjectNames = React.useMemo(() => {
//         if (!isHeadApprover || !headApproverProjects) return null;
//         return new Set(headApproverProjects.map((p: { name: string }) => p.name));
//     }, [isHeadApprover, headApproverProjects]);

//     const { data: pendingTaskData } = useFrappeGetCall<{
//         message: { results: Array<{ doctype: string; records: any[]; mod_vis?: number }> };
//     }>(
//         "rndopsapp.rndopsapp.doctype.module_registry.module_registry.get_pending_task",
//         { page_name: "pending-task" },
//         { enabled: !!currentUser },
//     );

//     const pendingTaskCount = React.useMemo(() => {
//         if (!pendingTaskData?.message?.results) return 0;
//         let count = 0;
//         pendingTaskData.message.results.forEach((group) => {
//             if (group.mod_vis || group.doctype === "Advance Settlement") {
//                 group.records.forEach((record) => {
//                     if (isHeadApprover && group.doctype === "Project Registration" && allowedProjectNames && !allowedProjectNames.has(record.name)) {
//                         return;
//                     }
//                     count++;
//                 });
//             }
//         });
//         return count;
//     }, [pendingTaskData, isHeadApprover, allowedProjectNames]);

//     // --- MENU ITEMS DEFINITION ---
//     const menuItems: MenuItem[] = [
//         ...(!isDirector ? [{ label: "Home", icon: HomeIcon, path: "/dashboard" }] : []),

//         // 1. DIRECTOR OVERVIEW (Global view for Dean/Director)
//         ...(hasDirectorOverviewAccess ? [
//             { label: "Overview", icon: BarChart3, path: "/director-dashboard?view=Director" },
//             { label: "Departments", icon: BarChart3, path: "/director-dashboard?view=Department", isSubOf: "Overview" },
//             { label: "PI Projects", icon: BarChart3, path: "/director-dashboard?view=PI", isSubOf: "Overview" },
//         ] : []),

//         // 2. HEAD OVERVIEW (Specific view for head_approver_1)
//         ...(isHeadApprover && !hasDirectorOverviewAccess ? [
//             { label: "Overview", icon: BarChart3, path: "/head-overview?view=Overview" },
//             { label: "PI Projects", icon: Users, path: "/head-overview?view=PI", isSubOf: "Overview" },
//         ] : []),

//         // 3. Standard Modules
//         {
//             label: "Projects",
//             icon: FileText,
//             subMenu: [
//                 { label: "Projects View", path: "/projects-view" },
//                 { label: "Registration", path: "/project-registration" },
//             ],
//         },
//         { label: "Stakeholder Registration", icon: FileText, path: "/universal-registration" },
//         { label: "Pending Task", icon: ListTodo, path: "/pending-task" },
//         { label: "Task Registry", icon: FileText, path: "/task-registry" },
//         { label: "Payments", icon: CreditCard, path: "/payments" },
//     ].filter((item) => {
//         // Standard Role Filtering
//         if (item.label === "Pending Task") {
//             const allowed = ["Dean, RnD", "Ado_RnD", "head_approver_1", "Hos, RnD (Head of Section, RnD)", "staff, RnD"];
//             return roles && allowed.some((role) => roles.includes(role));
//         }
//         if (item.label === "Task Registry") {
//             const allowed = ["staff, RnD", "Hos, RnD (Head of Section, RnD)", "Dean, RnD", "head_approver_1"];
//             return roles && allowed.some((role) => roles.includes(role));
//         }
//         if (item.label === "Projects") {
//             const allowed = ["Permanent Employee", "head_approver_1", "Dean, RnD"];
//             return roles && allowed.some((role) => roles.includes(role));
//         }
//         return true;
//     });

//     // --- NAVIGATION HELPERS ---
//     const handleMenuItemClick = (item: MenuItem) => {
//         if (item.subMenu) {
//             setOpenSubMenus((prev) =>
//                 prev.includes(item.label) ? prev.filter((l) => l !== item.label) : [...prev, item.label]
//             );
//         } else if (item.path) {
//             navigate(item.path);
//         }
//     };

//     const isActivePath = (path: string) => {
//         if (!path) return false;

//         // Differentiate Director Dashboard views
//         if (path.startsWith("/director-dashboard")) {
//             const searchParams = new URLSearchParams(location.search);
//             const viewMode = searchParams.get("view") || "Director";
//             return location.pathname === "/director-dashboard" && path === `/director-dashboard?view=${viewMode}`;
//         }

//         // Differentiate Head Overview views (NEW)
//         if (path.startsWith("/head-overview")) {
//             const searchParams = new URLSearchParams(location.search);
//             const viewMode = searchParams.get("view") || "Overview";
//             return location.pathname === "/head-overview" && path === `/head-overview?view=${viewMode}`;
//         }

//         return location.pathname.startsWith(path) && path !== "/";
//     };

//     const handleLogout = async () => {
//         setIsLoggingOut(true);
//         try {
//             await logout();
//             await mutate(() => true, undefined, { revalidate: false });
//             navigate("/login");
//         } catch (error) {
//             setIsLoggingOut(false);
//         }
//     };

//     return (
//         <>
//             <GlobalLoader isLoading={isLoggingOut} />
//             <Sidebar
//                 collapsible="icon"
//                 variant="sidebar"
//                 className="bg-[#F0EDE4] border-r border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 z-40"
//                 style={{ "--sidebar-width": "13rem", "--sidebar-width-icon": "3.5rem" } as React.CSSProperties}
//             >
//                 <SidebarHeader className={cn("h-16 border-b border-zinc-200 bg-[#F0EDE4] dark:bg-zinc-900 flex items-center transition-all", state === "expanded" ? "px-4" : "justify-center px-0")}>
//                     <div className={cn("flex items-center", state === "expanded" ? "gap-2 w-full" : "justify-center")}>
//                         <div className="flex items-center justify-center w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
//                             <img src="/IITG_Large_Logo.gif" alt="IITG Logo" className="w-full h-full object-contain" />
//                         </div>
//                         {state === "expanded" && (
//                             <span className="text-sm font-serif font-bold text-zinc-800 dark:text-zinc-100 tracking-tight whitespace-nowrap">R&D Portal</span>
//                         )}
//                     </div>
//                 </SidebarHeader>

//                 <SidebarContent className="px-2 py-3 bg-[#F0EDE4] dark:bg-zinc-900">
//                     <SidebarGroup>
//                         <SidebarMenu className="space-y-1">
//                             {menuItems.map((item) => {
//                                 // ── RENDER SUB-ITEMS OF OVERVIEW (Departments/PI Projects) ──
//                                 if (item.isSubOf) {
//                                     if (state !== "expanded") return null;
//                                     const isSubActive = item.path ? isActivePath(item.path) : false;
//                                     return (
//                                         <SidebarMenuItem key={item.label}>
//                                             <SidebarMenuSub className="ml-4 pl-3 border-l border-zinc-200 dark:border-zinc-800 space-y-0.5">
//                                                 <SidebarMenuSubItem>
//                                                     <SidebarMenuSubButton
//                                                         onClick={() => item.path && navigate(item.path)}
//                                                         className={cn("w-full px-2.5 py-1.5 text-[11px] rounded-md font-medium transition-all",
//                                                             isSubActive ? "bg-[#E4E4E7] text-zinc-900 dark:bg-zinc-800 font-bold" : "text-zinc-500 hover:text-zinc-900")}
//                                                     >
//                                                         {item.label}
//                                                     </SidebarMenuSubButton>
//                                                 </SidebarMenuSubItem>
//                                             </SidebarMenuSub>
//                                         </SidebarMenuItem>
//                                     );
//                                 }

//                                 const isActive = (item.path && isActivePath(item.path)) || item.subMenu?.some(s => isActivePath(s.path));
//                                 const isSubMenuOpen = openSubMenus.includes(item.label);

//                                 return (
//                                     <SidebarMenuItem key={item.label}>
//                                         <SidebarMenuButton
//                                             onClick={() => handleMenuItemClick(item)}
//                                             className={cn("w-full h-8 rounded-md font-bold text-xs transition-all",
//                                                 state === "expanded" ? "px-2.5" : "px-0 justify-center",
//                                                 isActive ? "bg-[#E4E4E7] text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100" : "text-zinc-600 hover:bg-[#EBEBEA] dark:hover:bg-zinc-800")}
//                                             tooltip={item.label}
//                                         >
//                                             <div className={cn("flex items-center", state === "expanded" ? "gap-3 w-full" : "justify-center")}>
//                                                 <item.icon className={cn(state === "expanded" ? "w-4 h-4" : "w-5 h-5", isActive ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500")} strokeWidth={1.5} />
//                                                 {state === "expanded" && <span>{item.label}</span>}
//                                             </div>

//                                             {item.label === "Pending Task" && pendingTaskCount > 0 && state === "expanded" && (
//                                                 <div className="flex items-center justify-center min-w-[18px] h-4.5 px-1.5 rounded-full text-[10px] font-bold ml-auto bg-[#D97757] text-white">
//                                                     {pendingTaskCount > 99 ? "99+" : pendingTaskCount}
//                                                 </div>
//                                             )}

//                                             {item.subMenu && state === "expanded" && (
//                                                 <ChevronDownIcon className={cn("w-4 h-4 transition-transform ml-auto text-zinc-400", isSubMenuOpen && "rotate-180")} strokeWidth={1.5} />
//                                             )}
//                                         </SidebarMenuButton>

//                                         {item.subMenu && isSubMenuOpen && state === "expanded" && (
//                                             <SidebarMenuSub className="ml-4 mt-1 pl-3 border-l border-zinc-200">
//                                                 {item.subMenu.map((sub) => (
//                                                     <SidebarMenuSubItem key={sub.label}>
//                                                         <SidebarMenuSubButton onClick={() => navigate(sub.path)}
//                                                             className={cn("w-full px-2.5 py-1.5 text-xs rounded-md", isActivePath(sub.path) ? "bg-[#E4E4E7] font-semibold" : "text-zinc-600")}>
//                                                             {sub.label}
//                                                         </SidebarMenuSubButton>
//                                                     </SidebarMenuSubItem>
//                                                 ))}
//                                             </SidebarMenuSub>
//                                         )}
//                                     </SidebarMenuItem>
//                                 );
//                             })}
//                         </SidebarMenu>
//                     </SidebarGroup>
//                 </SidebarContent>

//                 <SidebarFooter className="px-2 py-3 border-t border-zinc-200 bg-[#F0EDE4] dark:bg-zinc-900">
//                     <SidebarMenuButton onClick={handleLogout} className="w-full h-8 text-zinc-600 hover:bg-zinc-200">
//                         <LogOutIcon className="w-4 h-4" strokeWidth={1.5} />
//                         {state === "expanded" && <span className="ml-2">Log out</span>}
//                     </SidebarMenuButton>

//                     <div className="mt-4 pt-4 border-t border-zinc-200">
//                         <div onClick={() => navigate("/profile")} className={cn("flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-zinc-100 cursor-pointer", state === "expanded" ? "justify-start" : "justify-center")}>
//                             <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-full bg-[#E4E4E7] text-zinc-600 font-medium text-xs border border-zinc-300 dark:bg-zinc-800">
//                                 {userDoc?.user_image ? <img src={userDoc.user_image} alt="Profile" className="w-full h-full rounded-full object-cover" /> : userDoc?.full_name?.charAt(0).toUpperCase() || "U"}
//                             </div>
//                             {state === "expanded" && (
//                                 <div className="grid flex-1 text-left text-sm leading-tight">
//                                     <span className="truncate font-bold text-zinc-900 dark:text-zinc-100">{userDoc?.full_name || "User Name"}</span>
//                                     <span className="truncate text-xs font-bold text-zinc-500">{userDoc?.email || ""}</span>
//                                 </div>
//                             )}
//                         </div>
//                     </div>
//                 </SidebarFooter>
//             </Sidebar>
//         </>
//     );
// }