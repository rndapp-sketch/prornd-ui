

// // =============================home


// import {
//   Sidebar,
//   SidebarContent,
//   SidebarFooter,
//   SidebarGroup,
//   SidebarHeader,
//   SidebarMenu,
//   SidebarMenuItem,
//   SidebarMenuButton,
//   SidebarMenuSub,
//   SidebarMenuSubButton,
//   SidebarMenuSubItem,
//   useSidebar,
// } from "@/components/ui/sidebar";
// import { HomeIcon, UsersIcon, SettingsIcon, LogOutIcon, FileText, ChevronDownIcon } from "lucide-react";
// import type { LucideIcon } from "lucide-react";
// import { useFrappeAuth } from "frappe-react-sdk";
// import { useNavigate, useLocation } from "react-router-dom"; // Import useNavigate and useLocation
// import { useState } from "react";

// interface SubMenuItem {
//   label: string;
//   path: string; // Use path instead of onClick
// }

// interface MenuItem {
//   label: string;
//   icon: LucideIcon;
//   path?: string; // Use path instead of onClick
//   subMenu?: SubMenuItem[];
//   roles?: string[]; // Optional roles for access control
// }

// export function AppSidebar({ isPermanentEmployee }: { isPermanentEmployee: boolean }) { // Accept isPermanentEmployee prop
//   const { logout } = useFrappeAuth();
//   const { state } = useSidebar();
//   const navigate = useNavigate();
//   const location = useLocation(); // Get current location for active state
//   const [openSubMenus, setOpenSubMenus] = useState<string[]>([]);

//   const menuItems: MenuItem[] = [
//     {
//       label: "Home",
//       icon: HomeIcon,
//       path: "/home",
//       roles: ["All_ProRnd_User", "All", "Guest", "Desk User"], // Roles that can access Home
//     },
//     {
//       label: "PI Home Page",
//       icon: HomeIcon, // Using HomeIcon for now, can be changed
//       path: "/pihomepage",
//       roles: ["Permanent Employee"], // Roles that can access PI Home Page
//     },
//     {
//       label: "Projects",
//       icon: FileText,
//       subMenu: [
//         {
//           label: "Projects View",
//           path: "/projects-view",
//         },
//         {
//           label: "Endorsement",
//           path: "/endorsement",
//         },
//         {
//           label: "Project Registration",
//           path: "/project-registration",
//         },
//         {
//           label: "Add Fund Sanction",
//           path: "/add-fund-sanction",
//         },
//         {
//           label: "Add Received Funds",
//           path: "/add-received-funds",
//         },
//         {
//           label: "User Creation",
//           path: "/user-creation",
//         },
//       ],
//       roles: ["All_ProRnd_User", "Permanent Employee", "All"], // Example roles for Projects
//     },
//     {
//       label: "Users",
//       icon: UsersIcon,
//       path: "/users", // Base path for users
//       subMenu: [
//         {
//           label: "User List",
//           path: "/user-list",
//         },
//       ],
//       roles: ["All_ProRnd_User", "Permanent Employee", "All"], // Example roles for Users
//     },
//     {
//       label: "Settings",
//       icon: SettingsIcon,
//       path: "/settings", // Example path for settings
//       roles: ["All_ProRnd_User", "Permanent Employee", "All"], // Example roles for Settings
//     },
//   ];

//   const handleMenuItemClick = (item: MenuItem) => {
//     if (item.subMenu) {
//       setOpenSubMenus((prev) =>
//         prev.includes(item.label)
//           ? prev.filter((label) => label !== item.label)
//           : [...prev, item.label]
//       );
//     }
//     if (item.path) {
//       navigate(item.path);
//     }
//   };

//   const handleSubMenuItemClick = (subItem: SubMenuItem) => {
//     navigate(subItem.path);
//   };

//   // Filter menu items based on user's permanent employee status
//   const filteredMenuItems = menuItems.filter(item => {
//     if (item.label === "Home" && isPermanentEmployee) {
//       return false; // Permanent employees should not see "Home"
//     }
//     if (item.label === "PI Home Page" && !isPermanentEmployee) {
//       return false; // Non-permanent employees should not see "PI Home Page"
//     }
//     return true; // Show other items for now, more granular role checks can be added
//   });


//   return (
//     <Sidebar collapsible="icon" variant="sidebar"> {/* Explicitly set variant to sidebar */}
//       <SidebarHeader>
//         <div className="flex items-center gap-2">
//           <img src="/rndops_Logo.svg" alt="R&D Operations Logo" className="w-10 h-10" />
//           {state === 'expanded' && <span className="text-lg font-semibold">R&D Portal</span>}
//         </div>
//       </SidebarHeader>
//       <SidebarContent>
//         <SidebarMenu>
//           {filteredMenuItems.map((item) => (
//             <SidebarMenuItem key={item.label}>
//               <SidebarMenuButton
//                 onClick={() => handleMenuItemClick(item)}
//                 className={`justify-between ${location.pathname === item.path ? "bg-gray-200" : ""}`} // Highlight active item
//               >
//                 <div className="flex items-center gap-2">
//                   <item.icon className="size-4" />
//                   {item.label}
//                 </div>
//                 {item.subMenu && (
//                   <ChevronDownIcon
//                     className={`size-4 transition-transform ${
//                       openSubMenus.includes(item.label) ? "rotate-180" : ""
//                     }`}
//                   />
//                 )}
//               </SidebarMenuButton>
//               {item.subMenu && openSubMenus.includes(item.label) && (
//                 <SidebarMenuSub>
//                   {item.subMenu.map((subItem) => (
//                     <SidebarMenuSubItem key={subItem.label}>
//                       <SidebarMenuSubButton
//                         onClick={() => handleSubMenuItemClick(subItem)}
//                         className={`${location.pathname === subItem.path ? "bg-gray-200" : ""}`} // Highlight active sub-item
//                       >
//                         {subItem.label}
//                       </SidebarMenuSubButton>
//                     </SidebarMenuSubItem>
//                   ))}
//                 </SidebarMenuSub>
//               )}
//             </SidebarMenuItem>
//           ))}
//         </SidebarMenu>
//       </SidebarContent>
//       <SidebarFooter>
//         <SidebarMenu>
//           <SidebarMenuItem>
//             <SidebarMenuButton onClick={() => {
//               logout();
//               navigate('/login');
//             }}>
//               <LogOutIcon className="size-4" />
//               Log out
//             </SidebarMenuButton>
//           </SidebarMenuItem>
//         </SidebarMenu>
//       </SidebarFooter>
//     </Sidebar>
//   )
// }






// ==-=-=-=-=-


// =============================home
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
  UsersIcon, 
  SettingsIcon, 
  LogOutIcon, 
  FileText, 
  ChevronDownIcon,
  Building2Icon,
  UserPlusIcon,
  WalletIcon,
  BarChart3Icon
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";
// import { useUserRoles } from "@/components/UserRole"; // Removed as roles are no longer used for designation

interface SubMenuItem {
  label: string;
  path: string;
  badge?: string;
  badgeColor?: "default" | "secondary" | "destructive" | "outline";
}

interface MenuItem {
  label: string;
  icon: LucideIcon;
  path?: string;
  subMenu?: SubMenuItem[];
  roles?: string[];
  badge?: string;
  badgeColor?: "default" | "secondary" | "destructive" | "outline";
}

export function AppSidebar({ isPermanentEmployee }: { isPermanentEmployee: boolean }) {
  const { logout, currentUser, isLoading } = useFrappeAuth(); // Add isLoading from useFrappeAuth
  const { state } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const [openSubMenus, setOpenSubMenus] = useState<string[]>([]);

  // Fetch user details from Frappe
  const { data: userDoc, isLoading: isLoadingUserDoc } = useFrappeGetDoc(
    'User',
    currentUser || '',
    {
      fields: ["full_name", "email", "user_image", "designation_name"], // Explicitly fetch required fields
      enabled: !!currentUser
    }
  );

  // Removed useUserRoles hook call as roles are no longer used for designation

  const menuItems: MenuItem[] = [
    {
      label: "Home",
      icon: HomeIcon,
      path: "/home", // Default path, will be overridden by logic
      roles: ["All_ProRnd_User", "All", "Guest", "Desk User", "Permanent Employee"], // All roles can see this single home button
    },
    {
      label: "Projects",
      icon: FileText,
      badge: "5",
      badgeColor: "destructive",
      subMenu: [
        {
          label: "Projects View",
          path: "/projects-view",
        },
        // {
        //   label: "Endorsement",
        //   path: "/endorsement",
        //   // badge: "Updated",
        //   badgeColor: "secondary",
        // },
        {
          label: "Project Registration",
          path: "/project-registration",
        },
        // {
        //   label: "Add Fund Sanction",
        //   path: "/add-fund-sanction",
        // },
        // {
        //   label: "Add Received Funds",
        //   path: "/add-received-funds",
        // },
        // {
        //   label: "User Creation",
        //   path: "/user-creation",
        //   badge: "New",
        //   badgeColor: "secondary",
        // },
      ],
      roles: ["All_ProRnd_User", "Permanent Employee", "All"],
    },
    // {
    //   label: "Users",
    //   icon: UsersIcon,
    //   path: "/users",
    //   subMenu: [
    //     {
    //       label: "User List",
    //       path: "/user-list",
    //     },
    //   ],
    //   roles: ["All_ProRnd_User", "Permanent Employee", "All"],
    // },
    // {
    //   label: "Analytics",
    //   icon: BarChart3Icon,
    //   path: "/analytics",
    //   roles: ["All_ProRnd_User", "Permanent Employee", "All"],
    // },
    // {
    //   label: "Settings",
    //   icon: SettingsIcon,
    //   path: "/settings",
    //   roles: ["All_ProRnd_User", "Permanent Employee", "All"],
    // },
  ];

  const handleMenuItemClick = (item: MenuItem) => {
    if (item.subMenu) {
      setOpenSubMenus((prev) =>
        prev.includes(item.label)
          ? prev.filter((label) => label !== item.label)
          : [...prev, item.label]
      );
    } else if (item.label === "Home") {
      // Custom logic for the single Home button
      if (isPermanentEmployee) {
        navigate("/pihomepage");
      } else {
        navigate("/home");
      }
    } else if (item.path) {
      navigate(item.path);
    }
  };

  const handleSubMenuItemClick = (subItem: SubMenuItem) => {
    navigate(subItem.path);
  };

  // No longer need to filter Home/PI Home Page as it's handled by a single button's click logic
  const filteredMenuItems = menuItems;

  const getBadgeClass = (color: string = "default") => {
    const baseClasses = "ml-auto px-1.5 py-0.5 text-xs font-medium rounded-full";
    
    switch (color) {
      case "secondary":
        return cn(baseClasses, "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300");
      case "destructive":
        return cn(baseClasses, "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300");
      case "outline":
        return cn(baseClasses, "border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300");
      default:
        return cn(baseClasses, "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300");
    }
  };

  const isActivePath = (path: string) => {
    if (path === "/home") {
      return location.pathname === "/home";
    }
    return location.pathname.startsWith(path) && path !== "/";
  };

  return (
    <Sidebar collapsible="icon" variant="sidebar" className="border-r-0 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <SidebarHeader className="px-4 py-6 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl">
            <img 
              src="/rndops_Logo.svg" 
              alt="R&D Operations Logo" 
              className="w-6 h-6 filter brightness-0 invert"
            />
          </div>
          {state === 'expanded' && (
            <div className="flex flex-col">
              <span className="text-lg font-bold text-gray-900 dark:text-white">R&D Portal</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {isPermanentEmployee ? "Permanent Employee" : "Project Staff"}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>
      
      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarMenu className="space-y-1">
            {filteredMenuItems.map((item) => {
              const isActive = item.path ? isActivePath(item.path) : false;
              const isSubMenuOpen = openSubMenus.includes(item.label);
              const hasSubMenu = item.subMenu && item.subMenu.length > 0;
              
              return (
                <SidebarMenuItem key={item.label} className="relative">
                  <SidebarMenuButton
                    onClick={() => handleMenuItemClick(item)}
                    className={cn(
                      "group relative flex items-center justify-between w-full px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200",
                      "hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300",
                      isActive && !hasSubMenu
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 shadow-sm"
                        : "text-gray-700 dark:text-gray-300",
                      isSubMenuOpen && "bg-gray-50 dark:bg-gray-800/50"
                    )}
                    tooltip={item.label}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
                        isActive && !hasSubMenu
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-700"
                      )}>
                        <item.icon className="size-4" />
                      </div>
                      {state === 'expanded' && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 ml-2">
                      {item.badge && state === 'expanded' && (
                        <span className={getBadgeClass(item.badgeColor)}>
                          {item.badge}
                        </span>
                      )}
                      {hasSubMenu && (
                        <ChevronDownIcon
                          className={cn(
                            "size-4 transition-transform duration-200 text-gray-400",
                            isSubMenuOpen ? "rotate-180" : "",
                            state !== 'expanded' && "hidden"
                          )}
                        />
                      )}
                    </div>
                    
                    {isActive && !hasSubMenu && (
                      <div className="absolute left-0 w-1 h-6 bg-blue-600 rounded-r-full" />
                    )}
                  </SidebarMenuButton>
                  
                  {hasSubMenu && isSubMenuOpen && state === 'expanded' && (
                    <SidebarMenuSub className="ml-4 mt-1 space-y-1 border-l border-gray-200 dark:border-gray-700 pl-3">
                      {item.subMenu!.map((subItem) => {
                        const isSubActive = isActivePath(subItem.path);
                        return (
                          <SidebarMenuSubItem key={subItem.label}>
                            <SidebarMenuSubButton
                              onClick={() => handleSubMenuItemClick(subItem)}
                              className={cn(
                                "group relative flex items-center justify-between w-full px-3 py-2.5 text-sm rounded-lg transition-all duration-200",
                                "hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100",
                                isSubActive
                                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 font-medium"
                                  : "text-gray-600 dark:text-gray-400"
                              )}
                            >
                              <span className="truncate">{subItem.label}</span>
                              {subItem.badge && (
                                <span className={getBadgeClass(subItem.badgeColor)}>
                                  {subItem.badge}
                                </span>
                              )}
                              {isSubActive && (
                                <div className="absolute left-0 w-1 h-4 bg-blue-600 rounded-r-full" />
                              )}
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
      
      <SidebarFooter className="p-4 border-t border-gray-100 dark:border-gray-700">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={async () => { // Make the onClick handler async
                await logout(); // Await the logout function
                navigate('/login');
              }}
              className="group flex items-center gap-3 w-full px-3 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg transition-all duration-200 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20 dark:hover:text-red-300"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 group-hover:bg-red-100 group-hover:text-red-700">
                <LogOutIcon className="size-4" />
              </div>
              {state === 'expanded' && <span>Log out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        
        {state === 'expanded' && (
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            {(isLoading || isLoadingUserDoc || !userDoc) ? ( // Added !userDoc check for robustness
              <div className="flex items-center gap-3 px-3 text-gray-500 dark:text-gray-400">
                Loading user info...
              </div>
            ) : (
              <div className="flex items-center gap-3 px-3">
                <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full">
                  <span className="text-xs font-semibold text-white">
                    {userDoc?.user_image ? (
                      <img src={userDoc.user_image} alt="Profile" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      userDoc?.full_name ? userDoc.full_name.charAt(0).toUpperCase() : (currentUser ? currentUser.charAt(0).toUpperCase() : 'U')
                    )}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {userDoc?.full_name || currentUser || "User Name"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {userDoc?.email || ""}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {userDoc?.designation_name || (isPermanentEmployee ? "Permanent Employee" : "Project Staff")}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
