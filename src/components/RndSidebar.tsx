
// -=-=-=-=-=-=-=-=-=-=-= new design


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
  UsersIcon,
  ListTodo,
  CreditCard,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useFrappeAuth, useFrappeGetDoc, useFrappeGetCall } from "frappe-react-sdk";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { GlobalLoader } from "@/components/ui/global-loader";
import { useSWRConfig } from "swr";
import { useUserRoles } from "./UserRole";

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

  const { data: userDoc, isLoading: isLoadingUserDoc } = useFrappeGetDoc(
    'User',
    currentUser || '',
    {
      fields: ["full_name", "email", "user_image"],
      enabled: !!currentUser
    }
  );

  const { roles } = useUserRoles(currentUser || null);

  // Fetch pending task count
  const { data: pendingTaskData } = useFrappeGetCall<{ message: { results: Array<{ records: any[] }> } }>(
    "rndopsapp.rndopsapp.doctype.module_registry.module_registry.get_pending_task",
    {
      page_name: "pending-task",
      status_value: "Pending Staff Approval"
    },
    {
      enabled: !!currentUser
    }
  );
  console.log("pendingTaskData :", pendingTaskData)
  // Calculate total pending tasks count
  const pendingTaskCount = pendingTaskData?.message?.results?.reduce((total, group) => {
    return total + (group.records?.length || 0);
  }, 0) || 0;

  // --- LOGIC: Menu Data (Unchanged) ---
  const menuItems: MenuItem[] = [
    {
      label: "Home",
      icon: HomeIcon,
      path: "/home",
    },
    {
      label: "Projects",
      icon: FileText,
      subMenu: [
        { label: "Projects View", path: "/projects-view" },
        { label: "Registration", path: "/project-registration" },
        // { label: "Endorsement", path: "/project-proposal" },
      ],
    },
    {
      label: "HR Portal",
      icon: UsersIcon,
      path: "/hr-portal",
    },
    // {
    //   label: "Reimbursement",
    //   icon: HandCoinsIcon,
    //   path: "/reimbursement",
    // },
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
  ].filter(item => {
    if (item.label === "Pending Task") {
      const allowedRoles = [
        'Director',
        'Dean, RnD',
        'Ado_RnD',
        'head_approver_1',
        'Hos, RnD (Head of Section, RnD)',
        'staff, RnD'
      ];
      return roles && allowedRoles.some(role => roles.includes(role));
    }
    if (item.label === "Task Registry") {
      // Visible to staff, HOS, Dean, DoRnD - NOT permanent employees
      const allowedRoles = [
        'staff, RnD',
        'Hos, RnD (Head of Section, RnD)',
        'Dean, RnD',
        'Director'
      ];
      return roles && allowedRoles.some(role => roles.includes(role));
    }
    if (item.label === "Payments") {
      // Visible only to staff
      const allowedRoles = [
        'staff, RnD',
        'Hos, RnD (Head of Section, RnD)',
      ];
      return roles && allowedRoles.some(role => roles.includes(role));
    }
    if (item.label === "Projects") {
      // Hide Projects tab for "staff, RnD"
      // if (roles && roles.includes("staff, RnD")) {
      //   return false;
      // }
      // if (roles?.some(r =>
      //   r === "staff, RnD" ||
      //   r === "Hos, RnD (Head of Section, RnD)"
      // )) {
      //   return false;
      // }
      // if (roles?.some(r =>
      //   r === "staff, RnD" ||
      //   r === "Hos, RnD (Head of Section, RnD)"
      // )) {
      //   return false;
      // }

      if (
        roles &&
        (roles.includes("staff, RnD") ||
          roles.includes("Hos, RnD (Head of Section, RnD)"))
      ) {
        return false;
      }


    }
    return true;
  });

  // --- LOGIC: Event Handlers (Unchanged) ---
  const handleMenuItemClick = (item: MenuItem) => {
    if (item.subMenu) {
      setOpenSubMenus((prev) =>
        prev.includes(item.label)
          ? prev.filter((label) => label !== item.label)
          : [...prev, item.label]
      );
    } else if (item.label === "Home") {
      navigate("/dashboard");
    } else if (item.path) {
      navigate(item.path);
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
        undefined,  // No data to update
        { revalidate: false } // Do not revalidate
      );
      navigate('/login');
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoggingOut(false);
    }
  };

  // --- LOGIC: Path Checking (Unchanged) ---
  const isActivePath = (path: string) => {
    if (path === "/home") {
      return location.pathname === "/home" || location.pathname === "/pihomepage";
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
        style={{
          "--sidebar-width": "13rem",
          "--sidebar-width-icon": "3.5rem"
        } as React.CSSProperties}
      >

        {/* --- Header with Claude styling --- */}
        <SidebarHeader className={cn(
          "h-16 border-b border-zinc-200 bg-[#F0EDE4] dark:bg-zinc-900 dark:border-zinc-800 flex items-center transition-all duration-200",
          state === 'expanded' ? "px-4" : "justify-center px-0"
        )}>
          <div className={cn("flex items-center", state === 'expanded' ? "gap-2 w-full" : "justify-center")}>
            <div className="flex items-center justify-center w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
              <img src="/IITG_Large_Logo.gif" alt="IITG Logo" className="w-full h-full object-contain" />
            </div>
            {state === 'expanded' && (
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
                const isAnySubMenuActive = item.subMenu?.some(sub => isActivePath(sub.path)) ?? false;
                const isActive = (item.path && isActivePath(item.path)) || isAnySubMenuActive;
                const isSubMenuOpen = openSubMenus.includes(item.label);

                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      onClick={() => handleMenuItemClick(item)}
                      className={cn(
                        "w-full h-8 rounded-md font-bold text-xs transition-all duration-200",
                        state === 'expanded' ? "px-2.5 justify-start" : "px-0 justify-center",
                        isActive
                          ? "bg-[#E4E4E7] text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100" // Active: Subtle gray
                          : "bg-transparent text-zinc-600 hover:bg-[#EBEBEA] hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                      )}
                      tooltip={item.label}
                    >
                      <div className={cn("flex items-center", state === 'expanded' ? "gap-3 w-full" : "justify-center")}>
                        <item.icon className={cn(state === 'expanded' ? "w-4 h-4" : "w-5 h-5", isActive ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500 dark:text-zinc-400")} strokeWidth={1.5} />
                        {state === 'expanded' && <span>{item.label}</span>}
                      </div>

                      {/* Notification badge for Pending Task */}
                      {item.label === "Pending Task" && pendingTaskCount > 0 && state === 'expanded' && (
                        <div className={cn(
                          "flex items-center justify-center min-w-[18px] h-4.5 px-1.5 rounded-full text-[10px] font-bold ml-auto",
                          isActive ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900" : "bg-[#D97757] text-white"
                        )}>
                          {pendingTaskCount > 99 ? '99+' : pendingTaskCount}
                        </div>
                      )}

                      {item.subMenu && state === 'expanded' && (
                        <ChevronDownIcon className={cn("w-4 h-4 transition-transform flex-shrink-0 text-zinc-400 opacity-80 ml-auto", isSubMenuOpen && "rotate-180")} strokeWidth={1.5} />
                      )}
                    </SidebarMenuButton>

                    {item.subMenu && isSubMenuOpen && state === 'expanded' && (
                      <SidebarMenuSub className="ml-4 mt-1 space-y-0.5 pl-3 border-l border-zinc-200 dark:border-zinc-800">
                        {item.subMenu.map((subItem) => {
                          const isSubActive = isActivePath(subItem.path);
                          return (
                            <SidebarMenuSubItem key={subItem.label}>
                              <SidebarMenuSubButton
                                onClick={() => handleSubMenuItemClick(subItem)}
                                className={cn(
                                  "w-full px-2.5 py-1.5 text-xs rounded-md font-bold transition-all duration-200",
                                  isSubActive
                                    ? "bg-[#E4E4E7] text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                                    : "bg-transparent text-zinc-600 hover:bg-[#EBEBEA] hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
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

        {/* --- Footer with Claude styling --- */}
        <SidebarFooter className="px-2 py-3 border-t border-zinc-200 bg-[#F0EDE4] dark:bg-zinc-900 dark:border-zinc-800">
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className={cn(
                "w-full h-8 rounded-md font-medium text-xs transition-all duration-200 bg-transparent text-zinc-600 hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200",
                state === 'expanded' ? "px-2.5 justify-start" : "px-0 justify-center"
              )}
              tooltip="Log out"
            >
              <LogOutIcon className={cn(state === 'expanded' ? "w-4 h-4" : "w-5 h-5", "text-zinc-500 dark:text-zinc-400")} strokeWidth={1.5} />
              {state === 'expanded' && <span className="ml-2">Log out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>

          <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            {(isLoading || isLoadingUserDoc) ? (
              <div className={cn("p-2 text-xs text-zinc-500 font-medium", state !== 'expanded' && "hidden")}>Loading...</div>
            ) : (
              <div className={cn(
                "flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer",
                state === 'expanded' ? "justify-start" : "justify-center"
              )}>
                <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-full bg-[#E4E4E7] text-zinc-600 font-medium text-xs border border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                  {userDoc?.user_image ? (
                    <img src={userDoc.user_image} alt="Profile" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    userDoc?.full_name?.charAt(0).toUpperCase() || 'U'
                  )}
                </div>
                {state === 'expanded' && (
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-bold text-zinc-900 dark:text-zinc-100">{userDoc?.full_name || "User Name"}</span>
                    <span className="truncate text-xs font-bold text-zinc-500 dark:text-zinc-400">{userDoc?.email || ""}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>
    </>
  );
}