
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
      ],
    },
    {
      label: "HR Portal",
      icon: UsersIcon,
      path: "/hr-portal",
    },
    {
      label: "Reimbursement",
      icon: HandCoinsIcon,
      path: "/reimbursement",
    },
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
      <Sidebar collapsible="icon" variant="sidebar" className="bg-stone-50 border-r-2 border-gray-900">

        {/* --- DESIGN: Header with refined typography --- */}
        <SidebarHeader className="px-4 py-5 border-b-2 border-gray-900 bg-white">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg border-2 border-gray-900">
              <img
                src="/file.svg"
                alt="R&D Operations Logo"
                className="w-5 h-5"
              />
            </div>
            {state === 'expanded' && (
              <div>
                <span className="text-base font-semibold text-gray-900">R&D Portal</span>
              </div>
            )}
          </div>
        </SidebarHeader>

        {/* --- DESIGN: Menu with consistent styling rules applied --- */}
        <SidebarContent className="px-3 py-4">
          <SidebarGroup>
            <SidebarMenu className="space-y-2">
              {menuItems.map((item) => {
                const isAnySubMenuActive = item.subMenu?.some(sub => isActivePath(sub.path)) ?? false;
                const isActive = (item.path && isActivePath(item.path)) || isAnySubMenuActive;
                const isSubMenuOpen = openSubMenus.includes(item.label);

                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      onClick={() => handleMenuItemClick(item)}
                      className={cn(
                        "w-full h-10 px-3 rounded-lg font-semibold text-sm transition-all duration-150 border-2",
                        isActive
                          ? "bg-slate-600 text-white border-gray-900 shadow-[2px_2px_0px_rgba(0,0,0,0.1)]"
                          : "bg-white text-gray-900 border-gray-900 hover:bg-stone-50 hover:-translate-y-0.5"
                      )}
                      tooltip={item.label}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <div className={cn(
                          "flex items-center justify-center w-7 h-7 border-2 rounded-lg transition-colors",
                          isActive ? "bg-white text-slate-600 border-gray-900" : "bg-stone-50 text-gray-700 border-gray-900"
                        )}>
                          <item.icon className="w-4 h-4" strokeWidth={2.5} />
                        </div>
                        {state === 'expanded' && <span className="text-sm">{item.label}</span>}
                      </div>

                      {/* Show notification badge for Pending Task */}
                      {item.label === "Pending Task" && pendingTaskCount > 0 && (
                        <div className={cn(
                          "flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full border-2 border-gray-900 text-xs font-bold",
                          isActive ? "bg-orange-400 text-gray-900" : "bg-orange-500 text-white"
                        )}>
                          {pendingTaskCount > 99 ? '99+' : pendingTaskCount}
                        </div>
                      )}

                      {state === 'expanded' && item.subMenu && (
                        <ChevronDownIcon className={cn("w-4 h-4 transition-transform flex-shrink-0", isSubMenuOpen && "rotate-180")} strokeWidth={2.5} />
                      )}
                    </SidebarMenuButton>

                    {item.subMenu && isSubMenuOpen && state === 'expanded' && (
                      <SidebarMenuSub className="ml-2 mt-2 space-y-1 pl-3 border-l-2 border-gray-900">
                        {item.subMenu.map((subItem) => {
                          const isSubActive = isActivePath(subItem.path);
                          return (
                            <SidebarMenuSubItem key={subItem.label}>
                              <SidebarMenuSubButton
                                onClick={() => handleSubMenuItemClick(subItem)}
                                className={cn(
                                  "w-full px-3 py-2 text-xs rounded-lg font-semibold transition-all duration-150",
                                  isSubActive
                                    ? "bg-slate-200 text-gray-900"
                                    : "bg-white text-gray-600 hover:bg-stone-50"
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

        {/* --- DESIGN: Footer with consistent borders and refined user profile --- */}
        <SidebarFooter className="px-3 py-4 border-t-2 border-gray-900 bg-white">
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="w-full h-10 px-3 rounded-lg font-semibold text-sm transition-all duration-150 border-2 border-gray-900 bg-white text-gray-900 hover:bg-red-50 hover:border-red-500 hover:text-red-700 hover:-translate-y-0.5"
              tooltip="Log out"
            >
              <div className="flex items-center justify-center w-7 h-7 bg-stone-50 rounded-lg border-2 border-gray-900">
                <LogOutIcon className="w-4 h-4 text-gray-700" strokeWidth={2.5} />
              </div>
              {state === 'expanded' && <span className="ml-2 text-sm">Log out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>

          {state === 'expanded' && (
            <div className="mt-4 pt-4 border-t-2 border-gray-200">
              {(isLoading || isLoadingUserDoc) ? (
                <div className="p-2 text-xs text-gray-600 font-semibold">Loading user...</div>
              ) : (
                <div className="flex items-center gap-2 p-2 border-2 border-gray-900 bg-stone-50 rounded-lg">
                  <div className="flex items-center justify-center flex-shrink-0 w-9 h-9 rounded-lg bg-slate-600 border-2 border-gray-900 font-semibold text-white text-sm">
                    {userDoc?.user_image ? (
                      <img src={userDoc.user_image} alt="Profile" className="w-full h-full rounded-md object-cover" />
                    ) : (
                      userDoc?.full_name?.charAt(0).toUpperCase() || 'U'
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-gray-900 truncate">
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