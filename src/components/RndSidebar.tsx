
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
  HandCoinsIcon,
  ListTodo,
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
  ].filter(item => {
    if (item.label === "Pending Task") {
      const allowedRoles = [
        'Director',
        'Dean, RnD',
        'head_approver_1',
        'Hos, RnD (Head of Section, RnD)',
        'staff, RnD'
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
      <Sidebar collapsible="icon" variant="sidebar" className="bg-[#F0F4F8] border-r-2 border-gray-300">

        {/* --- Header with Frappe styling --- */}
        <SidebarHeader className="px-4 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#E0F7F6]">
              <img
                src="/file.svg"
                alt="R&D Operations Logo"
                className="w-6 h-6"
              />
            </div>
            {state === 'expanded' && (
              <div>
                <span className="text-base font-semibold text-gray-900">R&D Portal</span>
              </div>
            )}
          </div>
        </SidebarHeader>

        {/* --- Menu with Frappe styling --- */}
        <SidebarContent className="px-3 py-4">
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
                        "w-full h-11 px-3 rounded-xl font-medium text-base transition-all duration-150",
                        isActive
                          ? "bg-[#0EA5A4] text-white shadow-sm"
                          : "bg-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                      tooltip={item.label}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
                          isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                        )}>
                          <item.icon className="w-5 h-5" strokeWidth={2} />
                        </div>
                        {state === 'expanded' && <span>{item.label}</span>}
                      </div>

                      {/* Notification badge for Pending Task */}
                      {item.label === "Pending Task" && pendingTaskCount > 0 && (
                        <div className={cn(
                          "flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-medium",
                          isActive ? "bg-white/20 text-white" : "bg-[#0EA5A4] text-white"
                        )}>
                          {pendingTaskCount > 99 ? '99+' : pendingTaskCount}
                        </div>
                      )}

                      {state === 'expanded' && item.subMenu && (
                        <ChevronDownIcon className={cn("w-4 h-4 transition-transform flex-shrink-0 text-current opacity-60", isSubMenuOpen && "rotate-180")} strokeWidth={2} />
                      )}
                    </SidebarMenuButton>

                    {item.subMenu && isSubMenuOpen && state === 'expanded' && (
                      <SidebarMenuSub className="ml-4 mt-1 space-y-0.5 pl-3 border-l border-gray-200">
                        {item.subMenu.map((subItem) => {
                          const isSubActive = isActivePath(subItem.path);
                          return (
                            <SidebarMenuSubItem key={subItem.label}>
                              <SidebarMenuSubButton
                                onClick={() => handleSubMenuItemClick(subItem)}
                                className={cn(
                                  "w-full px-3 py-2.5 text-sm rounded-lg font-medium transition-all duration-150",
                                  isSubActive
                                    ? "bg-[#E0F7F6] text-[#0EA5A4]"
                                    : "bg-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700"
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

        {/* --- Footer with Frappe styling --- */}
        <SidebarFooter className="px-3 py-4 border-t border-gray-200 bg-white">
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="w-full h-10 px-3 rounded-xl font-medium text-sm transition-all duration-150 bg-transparent text-gray-600 hover:bg-red-50 hover:text-red-600"
              tooltip="Log out"
            >
              <div className="flex items-center justify-center w-7 h-7 bg-gray-100 rounded-lg">
                <LogOutIcon className="w-4 h-4 text-gray-500" strokeWidth={2} />
              </div>
              {state === 'expanded' && <span className="ml-2 text-sm">Log out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>

          {state === 'expanded' && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              {(isLoading || isLoadingUserDoc) ? (
                <div className="p-2 text-xs text-[#6B7280]">Loading user...</div>
              ) : (
                <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-center flex-shrink-0 w-9 h-9 rounded-lg bg-[#0EA5A4] font-medium text-white text-sm">
                    {userDoc?.user_image ? (
                      <img src={userDoc.user_image} alt="Profile" className="w-full h-full rounded-lg object-cover" />
                    ) : (
                      userDoc?.full_name?.charAt(0).toUpperCase() || 'U'
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {userDoc?.full_name || "User Name"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {userDoc?.email || ""}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </SidebarFooter>
      </Sidebar>
    </>
  );
}