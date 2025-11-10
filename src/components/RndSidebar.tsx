
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
// import { 
//   HomeIcon, 
//   UsersIcon, 
//   SettingsIcon, 
//   LogOutIcon, 
//   FileText, 
//   ChevronDownIcon,
//   Building2Icon,
//   UserPlusIcon,
//   WalletIcon,
//   BarChart3Icon
// } from "lucide-react";
// import type { LucideIcon } from "lucide-react";
// import { useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk";
// import { useNavigate, useLocation } from "react-router-dom";
// import { useState } from "react";
// import { cn } from "@/lib/utils";
// // import { useUserRoles } from "@/components/UserRole"; // Removed as roles are no longer used for designation

// interface SubMenuItem {
//   label: string;
//   path: string;
//   badge?: string;
//   badgeColor?: "default" | "secondary" | "destructive" | "outline";
// }

// interface MenuItem {
//   label: string;
//   icon: LucideIcon;
//   path?: string;
//   subMenu?: SubMenuItem[];
//   roles?: string[];
//   badge?: string;
//   badgeColor?: "default" | "secondary" | "destructive" | "outline";
// }

// export function AppSidebar({ isPermanentEmployee }: { isPermanentEmployee: boolean }) {
//   const { logout, currentUser, isLoading } = useFrappeAuth(); // Add isLoading from useFrappeAuth
//   const { state } = useSidebar();
//   const navigate = useNavigate();
//   const location = useLocation();
//   const [openSubMenus, setOpenSubMenus] = useState<string[]>([]);

//   // Fetch user details from Frappe
//   const { data: userDoc, isLoading: isLoadingUserDoc } = useFrappeGetDoc(
//     'User',
//     currentUser || '',
//     {
//       fields: ["full_name", "email", "user_image", "designation_name"], // Explicitly fetch required fields
//       enabled: !!currentUser
//     }
//   );

//   // Removed useUserRoles hook call as roles are no longer used for designation

//   const menuItems: MenuItem[] = [
//     {
//       label: "Home",
//       icon: HomeIcon,
//       path: "/home", // Default path, will be overridden by logic
//       roles: ["All_ProRnd_User", "All", "Guest", "Desk User", "Permanent Employee"], // All roles can see this single home button
//     },
//     {
//       label: "Projects",
//       icon: FileText,
//       badge: "5",
//       badgeColor: "destructive",
//       subMenu: [
//         {
//           label: "Projects View",
//           path: "/projects-view",
//         },
//         // {
//         //   label: "Endorsement",
//         //   path: "/endorsement",
//         //   // badge: "Updated",
//         //   badgeColor: "secondary",
//         // },
//         {
//           label: "Project Registration",
//           path: "/project-registration",
//         },
//         // {
//         //   label: "Add Fund Sanction",
//         //   path: "/add-fund-sanction",
//         // },
//         // {
//         //   label: "Add Received Funds",
//         //   path: "/add-received-funds",
//         // },
//         // {
//         //   label: "User Creation",
//         //   path: "/user-creation",
//         //   badge: "New",
//         //   badgeColor: "secondary",
//         // },
//       ],
//       roles: ["All_ProRnd_User", "Permanent Employee", "All"],
//     },
//     // {
//     //   label: "Users",
//     //   icon: UsersIcon,
//     //   path: "/users",
//     //   subMenu: [
//     //     {
//     //       label: "User List",
//     //       path: "/user-list",
//     //     },
//     //   ],
//     //   roles: ["All_ProRnd_User", "Permanent Employee", "All"],
//     // },
//     // {
//     //   label: "Analytics",
//     //   icon: BarChart3Icon,
//     //   path: "/analytics",
//     //   roles: ["All_ProRnd_User", "Permanent Employee", "All"],
//     // },
//     // {
//     //   label: "Settings",
//     //   icon: SettingsIcon,
//     //   path: "/settings",
//     //   roles: ["All_ProRnd_User", "Permanent Employee", "All"],
//     // },
//   ];

//   const handleMenuItemClick = (item: MenuItem) => {
//     if (item.subMenu) {
//       setOpenSubMenus((prev) =>
//         prev.includes(item.label)
//           ? prev.filter((label) => label !== item.label)
//           : [...prev, item.label]
//       );
//     } else if (item.label === "Home") {
//       // Custom logic for the single Home button
//       if (isPermanentEmployee) {
//         navigate("/pihomepage");
//       } else {
//         navigate("/home");
//       }
//     } else if (item.path) {
//       navigate(item.path);
//     }
//   };

//   const handleSubMenuItemClick = (subItem: SubMenuItem) => {
//     navigate(subItem.path);
//   };

//   // No longer need to filter Home/PI Home Page as it's handled by a single button's click logic
//   const filteredMenuItems = menuItems;

//   const getBadgeClass = (color: string = "default") => {
//     const baseClasses = "ml-auto px-1.5 py-0.5 text-xs font-medium rounded-full";
    
//     switch (color) {
//       case "secondary":
//         return cn(baseClasses, "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300");
//       case "destructive":
//         return cn(baseClasses, "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300");
//       case "outline":
//         return cn(baseClasses, "border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300");
//       default:
//         return cn(baseClasses, "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300");
//     }
//   };

//   const isActivePath = (path: string) => {
//     if (path === "/home") {
//       return location.pathname === "/home";
//     }
//     return location.pathname.startsWith(path) && path !== "/";
//   };

//   return (
//     <Sidebar collapsible="icon" variant="sidebar" className="border-r-0 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
//       <SidebarHeader className="px-4 py-6 border-b border-gray-100 dark:border-gray-700">
//         <div className="flex items-center gap-3">
//           <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl">
//             <img 
//               src="/rndops_Logo.svg" 
//               alt="R&D Operations Logo" 
//               className="w-6 h-6 filter brightness-0 invert"
//             />
//           </div>
//           {state === 'expanded' && (
//             <div className="flex flex-col">
//               <span className="text-lg font-bold text-gray-900 dark:text-white">R&D Portal</span>
//               <span className="text-xs text-gray-500 dark:text-gray-400">
//                 {isPermanentEmployee ? "Permanent Employee" : "Project Staff"}
//               </span>
//             </div>
//           )}
//         </div>
//       </SidebarHeader>
      
//       <SidebarContent className="px-3 py-4">
//         <SidebarGroup>
//           <SidebarMenu className="space-y-1">
//             {filteredMenuItems.map((item) => {
//               const isActive = item.path ? isActivePath(item.path) : false;
//               const isSubMenuOpen = openSubMenus.includes(item.label);
//               const hasSubMenu = item.subMenu && item.subMenu.length > 0;
              
//               return (
//                 <SidebarMenuItem key={item.label} className="relative">
//                   <SidebarMenuButton
//                     onClick={() => handleMenuItemClick(item)}
//                     className={cn(
//                       "group relative flex items-center justify-between w-full px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200",
//                       "hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/20 dark:hover:text-blue-300",
//                       isActive && !hasSubMenu
//                         ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 shadow-sm"
//                         : "text-gray-700 dark:text-gray-300",
//                       isSubMenuOpen && "bg-gray-50 dark:bg-gray-800/50"
//                     )}
//                     tooltip={item.label}
//                   >
//                     <div className="flex items-center gap-3 min-w-0 flex-1">
//                       <div className={cn(
//                         "flex items-center justify-center w-8 h-8 rounded-lg transition-colors",
//                         isActive && !hasSubMenu
//                           ? "bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300"
//                           : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-700"
//                       )}>
//                         <item.icon className="size-4" />
//                       </div>
//                       {state === 'expanded' && (
//                         <span className="truncate">{item.label}</span>
//                       )}
//                     </div>
                    
//                     <div className="flex items-center gap-1 ml-2">
//                       {item.badge && state === 'expanded' && (
//                         <span className={getBadgeClass(item.badgeColor)}>
//                           {item.badge}
//                         </span>
//                       )}
//                       {hasSubMenu && (
//                         <ChevronDownIcon
//                           className={cn(
//                             "size-4 transition-transform duration-200 text-gray-400",
//                             isSubMenuOpen ? "rotate-180" : "",
//                             state !== 'expanded' && "hidden"
//                           )}
//                         />
//                       )}
//                     </div>
                    
//                     {isActive && !hasSubMenu && (
//                       <div className="absolute left-0 w-1 h-6 bg-blue-600 rounded-r-full" />
//                     )}
//                   </SidebarMenuButton>
                  
//                   {hasSubMenu && isSubMenuOpen && state === 'expanded' && (
//                     <SidebarMenuSub className="ml-4 mt-1 space-y-1 border-l border-gray-200 dark:border-gray-700 pl-3">
//                       {item.subMenu!.map((subItem) => {
//                         const isSubActive = isActivePath(subItem.path);
//                         return (
//                           <SidebarMenuSubItem key={subItem.label}>
//                             <SidebarMenuSubButton
//                               onClick={() => handleSubMenuItemClick(subItem)}
//                               className={cn(
//                                 "group relative flex items-center justify-between w-full px-3 py-2.5 text-sm rounded-lg transition-all duration-200",
//                                 "hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100",
//                                 isSubActive
//                                   ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 font-medium"
//                                   : "text-gray-600 dark:text-gray-400"
//                               )}
//                             >
//                               <span className="truncate">{subItem.label}</span>
//                               {subItem.badge && (
//                                 <span className={getBadgeClass(subItem.badgeColor)}>
//                                   {subItem.badge}
//                                 </span>
//                               )}
//                               {isSubActive && (
//                                 <div className="absolute left-0 w-1 h-4 bg-blue-600 rounded-r-full" />
//                               )}
//                             </SidebarMenuSubButton>
//                           </SidebarMenuSubItem>
//                         );
//                       })}
//                     </SidebarMenuSub>
//                   )}
//                 </SidebarMenuItem>
//               );
//             })}
//           </SidebarMenu>
//         </SidebarGroup>
//       </SidebarContent>
      
//       <SidebarFooter className="p-4 border-t border-gray-100 dark:border-gray-700">
//         <SidebarMenu>
//           <SidebarMenuItem>
//             <SidebarMenuButton 
//               onClick={async () => { // Make the onClick handler async
//                 await logout(); // Await the logout function
//                 navigate('/login');
//               }}
//               className="group flex items-center gap-3 w-full px-3 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg transition-all duration-200 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20 dark:hover:text-red-300"
//             >
//               <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 group-hover:bg-red-100 group-hover:text-red-700">
//                 <LogOutIcon className="size-4" />
//               </div>
//               {state === 'expanded' && <span>Log out</span>}
//             </SidebarMenuButton>
//           </SidebarMenuItem>
//         </SidebarMenu>
        
//         {state === 'expanded' && (
//           <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
//             {(isLoading || isLoadingUserDoc || !userDoc) ? ( // Added !userDoc check for robustness
//               <div className="flex items-center gap-3 px-3 text-gray-500 dark:text-gray-400">
//                 Loading user info...
//               </div>
//             ) : (
//               <div className="flex items-center gap-3 px-3">
//                 <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full">
//                   <span className="text-xs font-semibold text-white">
//                     {userDoc?.user_image ? (
//                       <img src={userDoc.user_image} alt="Profile" className="w-full h-full rounded-full object-cover" />
//                     ) : (
//                       userDoc?.full_name ? userDoc.full_name.charAt(0).toUpperCase() : (currentUser ? currentUser.charAt(0).toUpperCase() : 'U')
//                     )}
//                   </span>
//                 </div>
//                 <div className="flex-1 min-w-0">
//                   <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
//                     {userDoc?.full_name || currentUser || "User Name"}
//                   </p>
//                   <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
//                     {userDoc?.email || ""}
//                   </p>
//                   <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
//                     {userDoc?.designation_name || (isPermanentEmployee ? "Permanent Employee" : "Project Staff")}
//                   </p>
//                 </div>
//               </div>
//             )}
//           </div>
//         )}
//       </SidebarFooter>
//     </Sidebar>
//   );
// }




// neo


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
// import { 
//   HomeIcon, 
//   FileText, 
//   ChevronDownIcon,
//   LogOutIcon,
//   // Other icons are not used in the final menu but are kept here for potential future use
//   UsersIcon, 
//   SettingsIcon, 
//   Building2Icon,
//   UserPlusIcon,
//   WalletIcon,
//   BarChart3Icon
// } from "lucide-react";
// import type { LucideIcon } from "lucide-react";
// import { useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk";
// import { useNavigate, useLocation } from "react-router-dom";
// import { useState } from "react";
// import { cn } from "@/lib/utils";

// // --- LOGIC: Interfaces (Unchanged) ---
// interface SubMenuItem {
//   label: string;
//   path: string;
//   badge?: string;
//   badgeColor?: "default" | "secondary" | "destructive" | "outline";
// }

// interface MenuItem {
//   label: string;
//   icon: LucideIcon;
//   path?: string;
//   subMenu?: SubMenuItem[];
//   roles?: string[];
//   badge?: string;
//   badgeColor?: "default" | "secondary" | "destructive" | "outline";
// }

// export function AppSidebar({ isPermanentEmployee }: { isPermanentEmployee: boolean }) {
//   // --- LOGIC: Hooks and State (Unchanged) ---
//   const { logout, currentUser, isLoading } = useFrappeAuth();
//   const { state } = useSidebar();
//   const navigate = useNavigate();
//   const location = useLocation();
//   const [openSubMenus, setOpenSubMenus] = useState<string[]>([]);

//   const { data: userDoc, isLoading: isLoadingUserDoc } = useFrappeGetDoc(
//     'User',
//     currentUser || '',
//     {
//       fields: ["full_name", "email", "user_image", "designation_name"],
//       enabled: !!currentUser
//     }
//   );

//   // --- LOGIC: Menu Data (Unchanged) ---
//   const menuItems: MenuItem[] = [
//     {
//       label: "Home",
//       icon: HomeIcon,
//       path: "/home",
//       roles: ["All_ProRnd_User", "All", "Guest", "Desk User", "Permanent Employee"],
//     },
//     {
//       label: "Projects",
//       icon: FileText,
//       badge: "5",
//       badgeColor: "destructive",
//       subMenu: [
//         { label: "Projects View", path: "/projects-view" },
//         { label: "Project Registration", path: "/project-registration" },
//       ],
//       roles: ["All_ProRnd_User", "Permanent Employee", "All"],
//     },
//   ];
  
//   // --- LOGIC: Event Handlers (Unchanged) ---
//   const handleMenuItemClick = (item: MenuItem) => {
//     if (item.subMenu) {
//       setOpenSubMenus((prev) =>
//         prev.includes(item.label)
//           ? prev.filter((label) => label !== item.label)
//           : [...prev, item.label]
//       );
//     } else if (item.label === "Home") {
//       if (isPermanentEmployee) {
//         navigate("/pihomepage");
//       } else {
//         navigate("/home");
//       }
//     } else if (item.path) {
//       navigate(item.path);
//     }
//   };

//   const handleSubMenuItemClick = (subItem: SubMenuItem) => {
//     navigate(subItem.path);
//   };
  
//   // --- LOGIC: Filtering and Path Checking (Unchanged) ---
//   const filteredMenuItems = menuItems;
//   const isActivePath = (path: string) => {
//     if (path === "/home") {
//       return location.pathname === "/home" || location.pathname === "/pihomepage";
//     }
//     return location.pathname.startsWith(path) && path !== "/";
//   };
  
//   // --- DESIGN: Neo-Brutalism Badge Component ---
//   const NeoBadge = ({ children, color }: { children: React.ReactNode, color?: string }) => (
//     <span className={cn(
//         "ml-auto px-2 py-0.5 text-xs font-bold rounded-md border-2 border-black text-black",
//         color === 'destructive' ? 'bg-red-400' : 'bg-cyan-300'
//     )}>
//       {children}
//     </span>
//   );

//   return (
//     // --- DESIGN: Main Sidebar Container ---
//     <Sidebar collapsible="icon" variant="sidebar" className="bg-white border-r-2 border-black">
      
//       {/* --- DESIGN: Header --- */}
//       <SidebarHeader className="p-4 border-b-2 border-black">
//         <div className="flex items-center gap-3">
//           <div className="flex items-center justify-center size-10 bg-black rounded-md border-2 border-black shadow-[2px_2px_0px_#000]">
//             <img 
//               src="/rndops_Logo.svg" 
//               alt="R&D Operations Logo" 
//               className="size-6 filter brightness-0 invert"
//             />
//           </div>
//           {state === 'expanded' && (
//             <div>
//               <span className="text-xl font-extrabold text-black uppercase">R&D Portal</span>
//               <span className="block text-xs text-black font-mono">
//                 {isPermanentEmployee ? "Perm. Employee" : "Project Staff"}
//               </span>
//             </div>
//           )}
//         </div>
//       </SidebarHeader>
      
//       {/* --- DESIGN: Menu Content --- */}
//       <SidebarContent className="p-3">
//         <SidebarGroup>
//           <SidebarMenu className="space-y-2">
//             {filteredMenuItems.map((item) => {
//               // LOGIC: Check active state for main and sub-items
//               const isAnySubMenuActive = item.subMenu?.some(sub => isActivePath(sub.path)) ?? false;
//               const isActive = (item.path && isActivePath(item.path)) || isAnySubMenuActive;
//               const isSubMenuOpen = openSubMenus.includes(item.label);
              
//               return (
//                 <SidebarMenuItem key={item.label}>
//                   <SidebarMenuButton
//                     onClick={() => handleMenuItemClick(item)}
//                     className={cn(
//                       "flex items-center justify-between w-full p-2 font-bold text-black rounded-md transition-all border-2 border-transparent",
//                       "hover:border-black hover:shadow-[2px_2px_0px_#000] hover:bg-cyan-300",
//                       isActive && "bg-black text-white hover:bg-black hover:shadow-none"
//                     )}
//                     tooltip={item.label}
//                   >
//                     <div className="flex items-center gap-3">
//                       <div className={cn(
//                         "flex items-center justify-center size-8 rounded-md border-2 border-black",
//                         isActive ? "bg-cyan-300" : "bg-white"
//                       )}>
//                         <item.icon className="size-5 text-black" />
//                       </div>
//                       {state === 'expanded' && <span>{item.label}</span>}
//                     </div>
                    
//                     {state === 'expanded' && (
//                       <div className="flex items-center gap-2">
//                         {item.badge && <NeoBadge color={item.badgeColor}>{item.badge}</NeoBadge>}
//                         {item.subMenu && <ChevronDownIcon className={cn("size-5 transition-transform", isSubMenuOpen && "rotate-180")} />}
//                       </div>
//                     )}
//                   </SidebarMenuButton>
                  
//                   {item.subMenu && isSubMenuOpen && state === 'expanded' && (
//                     <SidebarMenuSub className="ml-6 mt-2 space-y-1 border-l-2 border-black pl-4">
//                       {item.subMenu.map((subItem) => {
//                         const isSubActive = isActivePath(subItem.path);
//                         return (
//                           <SidebarMenuSubItem key={subItem.label}>
//                             <SidebarMenuSubButton
//                               onClick={() => handleSubMenuItemClick(subItem)}
//                               className={cn(
//                                 "w-full px-3 py-2 text-sm font-bold rounded-md transition-all text-left",
//                                 "hover:bg-cyan-300",
//                                 isSubActive ? "bg-black text-white hover:bg-black" : "text-black"
//                               )}
//                             >
//                               {subItem.label}
//                             </SidebarMenuSubButton>
//                           </SidebarMenuSubItem>
//                         );
//                       })}
//                     </SidebarMenuSub>
//                   )}
//                 </SidebarMenuItem>
//               );
//             })}
//           </SidebarMenu>
//         </SidebarGroup>
//       </SidebarContent>
      
//       {/* --- DESIGN: Footer --- */}
//       <SidebarFooter className="p-3 border-t-2 border-black">
//         <SidebarMenuItem>
//           <SidebarMenuButton 
//             onClick={async () => {
//               await logout();
//               navigate('/login');
//             }}
//             className="flex items-center w-full p-2 font-bold text-black rounded-md transition-all group hover:bg-red-500 hover:text-white"
//             tooltip="Log out"
//           >
//             <div className="flex items-center justify-center size-8 rounded-md bg-white border-2 border-black group-hover:bg-white">
//               <LogOutIcon className="size-5 text-black" />
//             </div>
//             {state === 'expanded' && <span>Log out</span>}
//           </SidebarMenuButton>
//         </SidebarMenuItem>
        
//         {state === 'expanded' && (
//           <div className="mt-3 pt-3 border-t-2 border-black">
//             {(isLoading || isLoadingUserDoc) ? (
//               <div className="p-2 font-mono text-sm text-black">Loading user...</div>
//             ) : (
//               <div className="flex items-center gap-3 p-1">
//                 <div className="flex items-center justify-center shrink-0 size-10 rounded-md bg-black border-2 border-black font-bold text-white text-xl">
//                   {userDoc?.user_image ? (
//                     <img src={userDoc.user_image} alt="Profile" className="w-full h-full rounded-[4px] object-cover" />
//                   ) : (
//                     userDoc?.full_name?.charAt(0).toUpperCase() || 'U'
//                   )}
//                 </div>
//                 <div className="min-w-0">
//                   <p className="text-sm font-bold text-black truncate">
//                     {userDoc?.full_name || "User Name"}
//                   </p>
//                   <p className="text-xs text-black truncate font-mono">
//                     {userDoc?.email || ""}
//                   </p>
//                 </div>
//               </div>
//             )}
//           </div>
//         )}
//       </SidebarFooter>
//     </Sidebar>
//   );
// }





// -=-=-=-=-=-=-=-=-=-=-=-=-=-= v2


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
// import { 
//   HomeIcon, 
//   FileText, 
//   ChevronDownIcon,
//   LogOutIcon,
// } from "lucide-react";
// import type { LucideIcon } from "lucide-react";
// import { useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk";
// import { useNavigate, useLocation } from "react-router-dom";
// import { useState } from "react";
// import { cn } from "@/lib/utils";

// // --- LOGIC: Interfaces (Unchanged) ---
// interface SubMenuItem {
//   label: string;
//   path: string;
//   badge?: string;
//   badgeColor?: "default" | "secondary" | "destructive" | "outline";
// }

// interface MenuItem {
//   label: string;
//   icon: LucideIcon;
//   path?: string;
//   subMenu?: SubMenuItem[];
//   roles?: string[];
//   badge?: string;
//   badgeColor?: "default" | "secondary" | "destructive" | "outline";
// }

// export function AppSidebar({ isPermanentEmployee }: { isPermanentEmployee: boolean }) {
//   // --- LOGIC: Hooks and State (Unchanged) ---
//   const { logout, currentUser, isLoading } = useFrappeAuth();
//   const { state } = useSidebar();
//   const navigate = useNavigate();
//   const location = useLocation();
//   const [openSubMenus, setOpenSubMenus] = useState<string[]>([]);

//   const { data: userDoc, isLoading: isLoadingUserDoc } = useFrappeGetDoc(
//     'User',
//     currentUser || '',
//     {
//       fields: ["full_name", "email", "user_image", "designation_name"],
//       enabled: !!currentUser
//     }
//   );

//   // --- LOGIC: Menu Data (Unchanged) ---
//   const menuItems: MenuItem[] = [
//     {
//       label: "Home",
//       icon: HomeIcon,
//       path: "/home",
//       roles: ["All_ProRnd_User", "All", "Guest", "Desk User", "Permanent Employee"],
//     },
//     {
//       label: "Projects",
//       icon: FileText,
//       badge: "5",
//       badgeColor: "destructive",
//       subMenu: [
//         { label: "Projects View", path: "/projects-view" },
//         { label: "Project Registration", path: "/project-registration" },
//       ],
//       roles: ["All_ProRnd_User", "Permanent Employee", "All"],
//     },
//   ];
  
//   // --- LOGIC: Event Handlers (Unchanged) ---
//   const handleMenuItemClick = (item: MenuItem) => {
//     if (item.subMenu) {
//       setOpenSubMenus((prev) =>
//         prev.includes(item.label)
//           ? prev.filter((label) => label !== item.label)
//           : [...prev, item.label]
//       );
//     } else if (item.label === "Home") {
//       if (isPermanentEmployee) {
//         navigate("/pihomepage");
//       } else {
//         navigate("/home");
//       }
//     } else if (item.path) {
//       navigate(item.path);
//     }
//   };

//   const handleSubMenuItemClick = (subItem: SubMenuItem) => {
//     navigate(subItem.path);
//   };
  
//   // --- LOGIC: Filtering and Path Checking (Unchanged) ---
//   const filteredMenuItems = menuItems;
//   const isActivePath = (path: string) => {
//     if (path === "/home") {
//       return location.pathname === "/home" || location.pathname === "/pihomepage";
//     }
//     return location.pathname.startsWith(path) && path !== "/";
//   };
  
//   // --- DESIGN: Neo-Brutalism Badge Component ---
//   const NeoBadge = ({ children, color }: { children: React.ReactNode, color?: string }) => (
//     <span className={cn(
//         "ml-auto px-2 py-1 text-xs font-bold rounded-md border-2 border-black text-black",
//         color === 'destructive' ? 'bg-red-400' : 'bg-cyan-300'
//     )}>
//       {children}
//     </span>
//   );

//   return (
//     // --- DESIGN: Main Sidebar Container with Dull Background ---
//     <Sidebar collapsible="icon" variant="sidebar" className="bg-stone-100 border-r-2 border-black">
      
//       {/* --- DESIGN: Header with Improved Padding --- */}
//       <SidebarHeader className="p-4 border-b-2 border-black">
//         <div className="flex items-center gap-4">
//           <div className="flex items-center justify-center size-12 bg-black rounded-md border-2 border-black shadow-[3px_3px_0px_#000]">
//             <img 
//               src="/rndops_Logo.svg" 
//               alt="R&D Operations Logo" 
//               className="size-7 filter brightness-0 invert"
//             />
//           </div>
//           {state === 'expanded' && (
//             <div>
//               <span className="text-xl font-extrabold text-black uppercase">R&D Portal</span>
//               <span className="block text-xs text-black font-mono mt-0.5">
//                 {isPermanentEmployee ? "Permanent Employee" : "Project Staff"}
//               </span>
//             </div>
//           )}
//         </div>
//       </SidebarHeader>
      
//       {/* --- DESIGN: Menu Content with Improved Padding --- */}
//       <SidebarContent className="p-4">
//         <SidebarGroup>
//           <SidebarMenu className="space-y-3">
//             {filteredMenuItems.map((item) => {
//               const isAnySubMenuActive = item.subMenu?.some(sub => isActivePath(sub.path)) ?? false;
//               const isActive = (item.path && isActivePath(item.path)) || isAnySubMenuActive;
//               const isSubMenuOpen = openSubMenus.includes(item.label);
              
//               return (
//                 <SidebarMenuItem key={item.label}>
//                   <SidebarMenuButton
//                     onClick={() => handleMenuItemClick(item)}
//                     className={cn(
//                       "flex items-center justify-between w-full p-3 font-bold text-black rounded-md transition-all border-2 border-transparent",
//                       "hover:border-black hover:shadow-[2px_2px_0px_#000] hover:bg-stone-200",
//                       isActive && "bg-black text-white hover:bg-black hover:shadow-none"
//                     )}
//                     tooltip={item.label}
//                   >
//                     <div className="flex items-center gap-4">
//                       <div className={cn(
//                         "flex items-center justify-center size-10 rounded-md border-2 border-black",
//                         isActive ? "bg-cyan-300" : "bg-white"
//                       )}>
//                         <item.icon className="size-5 text-black" />
//                       </div>
//                       {state === 'expanded' && <span className="text-base">{item.label}</span>}
//                     </div>
                    
//                     {state === 'expanded' && (
//                       <div className="flex items-center gap-2">
//                         {item.badge && <NeoBadge color={item.badgeColor}>{item.badge}</NeoBadge>}
//                         {item.subMenu && <ChevronDownIcon className={cn("size-5 transition-transform", isSubMenuOpen && "rotate-180")} />}
//                       </div>
//                     )}
//                   </SidebarMenuButton>
                  
//                   {item.subMenu && isSubMenuOpen && state === 'expanded' && (
//                     <SidebarMenuSub className="ml-8 mt-2 space-y-1.5 border-l-2 border-black pl-5">
//                       {item.subMenu.map((subItem) => {
//                         const isSubActive = isActivePath(subItem.path);
//                         return (
//                           <SidebarMenuSubItem key={subItem.label}>
//                             <SidebarMenuSubButton
//                               onClick={() => handleSubMenuItemClick(subItem)}
//                               className={cn(
//                                 "w-full px-4 py-2.5 text-sm font-bold rounded-md transition-all text-left",
//                                 "hover:bg-stone-200",
//                                 isSubActive ? "bg-black text-white hover:bg-black" : "text-black"
//                               )}
//                             >
//                               {subItem.label}
//                             </SidebarMenuSubButton>
//                           </SidebarMenuSubItem>
//                         );
//                       })}
//                     </SidebarMenuSub>
//                   )}
//                 </SidebarMenuItem>
//               );
//             })}
//           </SidebarMenu>
//         </SidebarGroup>
//       </SidebarContent>
      
//       {/* --- DESIGN: Footer with Improved Padding --- */}
//       <SidebarFooter className="p-4 border-t-2 border-black">
//         <SidebarMenuItem>
//           <SidebarMenuButton 
//             onClick={async () => {
//               await logout();
//               navigate('/login');
//             }}
//             className="flex items-center w-full p-3 font-bold text-black rounded-md transition-all group hover:bg-red-500 hover:text-white"
//             tooltip="Log out"
//           >
//             <div className="flex items-center justify-center size-10 rounded-md bg-white border-2 border-black group-hover:bg-white">
//               <LogOutIcon className="size-5 text-black" />
//             </div>
//             {state === 'expanded' && <span className="text-base">Log out</span>}
//           </SidebarMenuButton>
//         </SidebarMenuItem>
        
//         {state === 'expanded' && (
//           <div className="mt-4 pt-4 border-t-2 border-black">
//             {(isLoading || isLoadingUserDoc) ? (
//               <div className="p-2 font-mono text-sm text-black">Loading user...</div>
//             ) : (
//               <div className="flex items-center gap-4 p-1">
//                 <div className="flex items-center justify-center shrink-0 size-12 rounded-md bg-black border-2 border-black font-bold text-white text-2xl">
//                   {userDoc?.user_image ? (
//                     <img src={userDoc.user_image} alt="Profile" className="w-full h-full rounded-[4px] object-cover" />
//                   ) : (
//                     userDoc?.full_name?.charAt(0).toUpperCase() || 'U'
//                   )}
//                 </div>
//                 <div className="min-w-0">
//                   <p className="text-base font-bold text-black truncate">
//                     {userDoc?.full_name || "User Name"}
//                   </p>
//                   <p className="text-sm text-black truncate font-mono">
//                     {userDoc?.email || ""}
//                   </p>
//                 </div>
//               </div>
//             )}
//           </div>
//         )}
//       </SidebarFooter>
//     </Sidebar>
//   );
// }



// -==-==-=-=


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
// import { 
//   HomeIcon, 
//   FileText, 
//   ChevronDownIcon,
//   LogOutIcon,
// } from "lucide-react";
// import type { LucideIcon } from "lucide-react";
// import { useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk";
// import { useNavigate, useLocation } from "react-router-dom";
// import { useState } from "react";
// import { cn } from "@/lib/utils";

// // --- LOGIC: Interfaces (Unchanged) ---
// interface SubMenuItem {
//   label: string;
//   path: string;
//   badge?: string;
//   badgeColor?: "default" | "secondary" | "destructive" | "outline";
// }

// interface MenuItem {
//   label: string;
//   icon: LucideIcon;
//   path?: string;
//   subMenu?: SubMenuItem[];
//   roles?: string[];
//   badge?: string;
//   badgeColor?: "default" | "secondary" | "destructive" | "outline";
// }

// export function AppSidebar({ isPermanentEmployee }: { isPermanentEmployee: boolean }) {
//   // --- LOGIC: Hooks and State (Unchanged) ---
//   const { logout, currentUser, isLoading } = useFrappeAuth();
//   const { state } = useSidebar();
//   const navigate = useNavigate();
//   const location = useLocation();
//   const [openSubMenus, setOpenSubMenus] = useState<string[]>([]);

//   const { data: userDoc, isLoading: isLoadingUserDoc } = useFrappeGetDoc(
//     'User',
//     currentUser || '',
//     {
//       fields: ["full_name", "email", "user_image", "designation_name"],
//       enabled: !!currentUser
//     }
//   );

//   // --- LOGIC: Menu Data (Unchanged) ---
//   const menuItems: MenuItem[] = [
//     {
//       label: "Home",
//       icon: HomeIcon,
//       path: "/home",
//       roles: ["All_ProRnd_User", "All", "Guest", "Desk User", "Permanent Employee"],
//     },
//     {
//       label: "Projects",
//       icon: FileText,
//       badge: "5",
//       badgeColor: "destructive",
//       subMenu: [
//         { label: "Projects View", path: "/projects-view" },
//         { label: "Registration", path: "/project-registration" },
//       ],
//       roles: ["All_ProRnd_User", "Permanent Employee", "All"],
//     },
//   ];
  
//   // --- LOGIC: Event Handlers (Unchanged) ---
//   const handleMenuItemClick = (item: MenuItem) => {
//     if (item.subMenu) {
//       setOpenSubMenus((prev) =>
//         prev.includes(item.label)
//           ? prev.filter((label) => label !== item.label)
//           : [...prev, item.label]
//       );
//     } else if (item.label === "Home") {
//       if (isPermanentEmployee) {
//         navigate("/pihomepage");
//       } else {
//         navigate("/home");
//       }
//     } else if (item.path) {
//       navigate(item.path);
//     }
//   };

//   const handleSubMenuItemClick = (subItem: SubMenuItem) => {
//     navigate(subItem.path);
//   };
  
//   // --- LOGIC: Filtering and Path Checking (Unchanged) ---
//   const filteredMenuItems = menuItems;
//   const isActivePath = (path: string) => {
//     if (path === "/home") {
//       return location.pathname === "/home" || location.pathname === "/pihomepage";
//     }
//     return location.pathname.startsWith(path) && path !== "/";
//   };
  
//   // --- DESIGN: Neo-Brutalism Badge Component ---
//   const NeoBadge = ({ children, color }: { children: React.ReactNode, color?: string }) => (
//     <span className={cn(
//         "ml-auto px-2 py-1 text-xs font-bold rounded-md border-2 border-black text-black",
//         color === 'destructive' ? 'bg-red-400' : 'bg-cyan-300'
//     )}>
//       {children}
//     </span>
//   );

//   return (
//     // --- DESIGN: Main Sidebar Container with Dull Background ---
//     <Sidebar collapsible="icon" variant="sidebar" className="bg-stone-100 border-r-2 border-black">
      
//       {/* --- DESIGN: Header with Improved Padding --- */}
//       <SidebarHeader className="p-4 border-b-2 border-black">
//         <div className="flex items-center gap-4">
//           <div className="flex items-center justify-center size-12 bg-black rounded-md border-2 border-black shadow-[3px_3px_0px_#000]">
//             <img 
//               src="/rndops_Logo.svg" 
//               alt="R&D Operations Logo" 
//               className="size-7 filter brightness-0 invert"
//             />
//           </div>
//           {state === 'expanded' && (
//             <div>
//               <span className="text-xl font-extrabold text-black uppercase">R&D Portal</span>
//               <span className="block text-xs text-black font-mono mt-0.5">
//                 {isPermanentEmployee ? "Permanent Employee" : "Project Staff"}
//               </span>
//             </div>
//           )}
//         </div>
//       </SidebarHeader>
      
//       {/* --- DESIGN: Menu Content with Improved Padding and Colors --- */}
//       <SidebarContent className="p-4">
//         <SidebarGroup>
//           <SidebarMenu className="space-y-3">
//             {filteredMenuItems.map((item) => {
//               const isAnySubMenuActive = item.subMenu?.some(sub => isActivePath(sub.path)) ?? false;
//               const isActive = (item.path && isActivePath(item.path)) || isAnySubMenuActive;
//               const isSubMenuOpen = openSubMenus.includes(item.label);
              
//               return (
//                 <SidebarMenuItem key={item.label}>
//                   <SidebarMenuButton
//                     onClick={() => handleMenuItemClick(item)}
//                     className={cn(
//                       "flex items-center justify-between w-full p-3 font-bold text-black rounded-md transition-all border-2",
//                       isActive 
//                         ? "bg-cyan-300 border-black shadow-[2px_2px_0px_#000]" 
//                         : "border-transparent hover:border-black hover:shadow-[2px_2px_0px_#000] hover:bg-stone-200"
//                     )}
//                     tooltip={item.label}
//                   >
//                     <div className="flex items-center gap-4">
//                       <div className={cn(
//                         "flex items-center justify-center size-10 rounded-md border-2 border-black transition-colors",
//                         isActive ? "bg-black" : "bg-white"
//                       )}>
//                         <item.icon className={cn("size-5", isActive ? "text-white" : "text-black")} />
//                       </div>
//                       {state === 'expanded' && <span className="text-base">{item.label}</span>}
//                     </div>
                    
//                     {state === 'expanded' && (
//                       <div className="flex items-center gap-2">
//                         {item.badge && <NeoBadge color={item.badgeColor}>{item.badge}</NeoBadge>}
//                         {item.subMenu && <ChevronDownIcon className={cn("size-5 transition-transform", isSubMenuOpen && "rotate-180")} />}
//                       </div>
//                     )}
//                   </SidebarMenuButton>
                  
//                   {item.subMenu && isSubMenuOpen && state === 'expanded' && (
//                     <SidebarMenuSub className="ml-8 mt-2 space-y-1.5 border-l-2 border-black pl-5">
//                       {item.subMenu.map((subItem) => {
//                         const isSubActive = isActivePath(subItem.path);
//                         return (
//                           <SidebarMenuSubItem key={subItem.label}>
//                             <SidebarMenuSubButton
//                               onClick={() => handleSubMenuItemClick(subItem)}
//                               className={cn(
//                                 "w-full px-4 py-2.5 text-sm font-bold rounded-md transition-all text-left",
//                                 isSubActive ? "bg-cyan-300" : "text-black hover:bg-stone-200"
//                               )}
//                             >
//                               {subItem.label}
//                             </SidebarMenuSubButton>
//                           </SidebarMenuSubItem>
//                         );
//                       })}
//                     </SidebarMenuSub>
//                   )}
//                 </SidebarMenuItem>
//               );
//             })}
//           </SidebarMenu>
//         </SidebarGroup>
//       </SidebarContent>
      
//       {/* --- DESIGN: Footer with Improved Padding --- */}
//       <SidebarFooter className="p-4 border-t-2 border-black">
//         <SidebarMenuItem>
//           <SidebarMenuButton 
//             onClick={async () => {
//               await logout();
//               navigate('/login');
//             }}
//             className="flex items-center w-full p-3 font-bold text-black rounded-md transition-all group border-2 border-transparent hover:border-black hover:bg-red-400 hover:text-white"
//             tooltip="Log out"
//           >
//             <div className="flex items-center justify-center size-10 rounded-md bg-white border-2 border-black transition-colors group-hover:bg-white">
//               <LogOutIcon className="size-5 text-black" />
//             </div>
//             {state === 'expanded' && <span className="text-base">Log out</span>}
//           </SidebarMenuButton>
//         </SidebarMenuItem>
        
//         {state === 'expanded' && (
//           <div className="mt-4 pt-4 border-t-2 border-black">
//             {(isLoading || isLoadingUserDoc) ? (
//               <div className="p-2 font-mono text-sm text-black">Loading user...</div>
//             ) : (
//               <div className="flex items-center gap-4 p-1">
//                 <div className="flex items-center justify-center shrink-0 size-12 rounded-md bg-black border-2 border-black font-bold text-white text-2xl">
//                   {userDoc?.user_image ? (
//                     <img src={userDoc.user_image} alt="Profile" className="w-full h-full rounded-[4px] object-cover" />
//                   ) : (
//                     userDoc?.full_name?.charAt(0).toUpperCase() || 'U'
//                   )}
//                 </div>
//                 <div className="min-w-0">
//                   <p className="text-base font-bold text-black truncate">
//                     {userDoc?.full_name || "User Name"}
//                   </p>
//                   <p className="text-sm text-black truncate font-mono">
//                     {userDoc?.email || ""}
//                   </p>
//                 </div>
//               </div>
//             )}
//           </div>
//         )}
//       </SidebarFooter>
//     </Sidebar>
//   );
// }




// -=-=-=-==-=-=-=-=-=-=-=-=


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
// import { 
//   HomeIcon, 
//   FileText, 
//   ChevronDownIcon,
//   LogOutIcon,
//   UsersIcon,
// } from "lucide-react";
// import type { LucideIcon } from "lucide-react";
// import { useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk";
// import { useNavigate, useLocation } from "react-router-dom";
// import { useState } from "react";
// import { cn } from "@/lib/utils";

// // --- LOGIC: Interfaces (Unchanged) ---
// interface SubMenuItem {
//   label: string;
//   path: string;
// }

// interface MenuItem {
//   label: string;
//   icon: LucideIcon;
//   path?: string;
//   subMenu?: SubMenuItem[];
// }

// export function AppSidebar({ isPermanentEmployee }: { isPermanentEmployee: boolean }) {
//   // --- LOGIC: Hooks and State (Unchanged) ---
//   const { logout, currentUser, isLoading } = useFrappeAuth();
//   const { state } = useSidebar();
//   const navigate = useNavigate();
//   const location = useLocation();
//   const [openSubMenus, setOpenSubMenus] = useState<string[]>([]);

//   const { data: userDoc, isLoading: isLoadingUserDoc } = useFrappeGetDoc(
//     'User',
//     currentUser || '',
//     {
//       fields: ["full_name", "email", "user_image", "designation_name"],
//       enabled: !!currentUser
//     }
//   );

//   // --- LOGIC: Menu Data (Unchanged) ---
//   const menuItems: MenuItem[] = [
//     {
//       label: "Home",
//       icon: HomeIcon,
//       path: "/home",
//     },
//     {
//       label: "Projects",
//       icon: FileText,
//       subMenu: [
//         { label: "Projects View", path: "/projects-view" },
//         { label: "Registration", path: "/project-registration" },
//       ],
//     },
//     {
//       label: "HR Portal",
//       icon: UsersIcon,
//       path: "/hr-portal",
//     },
//   ];
  
//   // --- LOGIC: Event Handlers (Unchanged) ---
//   const handleMenuItemClick = (item: MenuItem) => {
//     if (item.subMenu) {
//       setOpenSubMenus((prev) =>
//         prev.includes(item.label)
//           ? prev.filter((label) => label !== item.label)
//           : [...prev, item.label]
//       );
//     } else if (item.label === "Home") {
//       navigate(isPermanentEmployee ? "/pihomepage" : "/home");
//     } else if (item.path) {
//       navigate(item.path);
//     }
//   };

//   const handleSubMenuItemClick = (subItem: SubMenuItem) => {
//     navigate(subItem.path);
//   };
  
//   // --- LOGIC: Path Checking (Unchanged) ---
//   const isActivePath = (path: string) => {
//     if (path === "/home") {
//       return location.pathname === "/home" || location.pathname === "/pihomepage";
//     }
//     return location.pathname.startsWith(path) && path !== "/";
//   };
  
//   return (
//     // --- DESIGN: Main Sidebar Container with a Clean, Light Background ---
//     <Sidebar collapsible="icon" variant="sidebar" className="bg-white border-r border-neutral-200">
      
//       {/* --- DESIGN: Header with Minimalist Styling --- */}
//       <SidebarHeader className="p-4 border-b border-neutral-200">
//         <div className="flex items-center gap-3">
//           <div className="flex items-center justify-center size-10 bg-black rounded-lg">
//             <img 
//               src="/rndops_Logo.svg" 
//               alt="R&D Operations Logo" 
//               className="size-6 filter brightness-0 invert"
//             />
//           </div>
//           {state === 'expanded' && (
//             <div>
//               <span className="text-lg font-bold text-black">R&D Portal</span>
//               <span className="block text-xs text-neutral-500">
//                 {isPermanentEmployee ? "Permanent Employee" : "Project Staff"}
//               </span>
//             </div>
//           )}
//         </div>
//       </SidebarHeader>
      
//       {/* --- DESIGN: Menu Content with a Simple, Eye-Catching Style --- */}
//       <SidebarContent className="p-4">
//         <SidebarGroup>
//           <SidebarMenu className="space-y-2">
//             {menuItems.map((item) => {
//               const isAnySubMenuActive = item.subMenu?.some(sub => isActivePath(sub.path)) ?? false;
//               const isActive = (item.path && isActivePath(item.path)) || isAnySubMenuActive;
//               const isSubMenuOpen = openSubMenus.includes(item.label);
              
//               return (
//                 <SidebarMenuItem key={item.label}>
//                   <SidebarMenuButton
//                     onClick={() => handleMenuItemClick(item)}
//                     className={cn(
//                       "flex items-center justify-between w-full p-3 font-semibold rounded-lg transition-colors",
//                       isActive 
//                         ? "bg-blue-500 text-white" 
//                         : "text-neutral-600 hover:bg-neutral-100"
//                     )}
//                     tooltip={item.label}
//                   >
//                     <div className="flex items-center gap-3">
//                       <item.icon className="size-5" />
//                       {state === 'expanded' && <span className="text-sm">{item.label}</span>}
//                     </div>
                    
//                     {state === 'expanded' && item.subMenu && (
//                       <ChevronDownIcon className={cn("size-4 transition-transform", isSubMenuOpen && "rotate-180")} />
//                     )}
//                   </SidebarMenuButton>
                  
//                   {item.subMenu && isSubMenuOpen && state === 'expanded' && (
//                     <SidebarMenuSub className="ml-4 mt-2 space-y-1 border-l border-neutral-200 pl-4">
//                       {item.subMenu.map((subItem) => {
//                         const isSubActive = isActivePath(subItem.path);
//                         return (
//                           <SidebarMenuSubItem key={subItem.label}>
//                             <SidebarMenuSubButton
//                               onClick={() => handleSubMenuItemClick(subItem)}
//                               className={cn(
//                                 "w-full p-2.5 text-xs font-medium rounded-md transition-colors text-left",
//                                 isSubActive ? "bg-blue-100 text-blue-700" : "text-neutral-500 hover:bg-neutral-100"
//                               )}
//                             >
//                               {subItem.label}
//                             </SidebarMenuSubButton>
//                           </SidebarMenuSubItem>
//                         );
//                       })}
//                     </SidebarMenuSub>
//                   )}
//                 </SidebarMenuItem>
//               );
//             })}
//           </SidebarMenu>
//         </SidebarGroup>
//       </SidebarContent>
      
//       {/* --- DESIGN: Footer with Minimalist Styling --- */}
//       <SidebarFooter className="p-4 border-t border-neutral-200">
//         <SidebarMenuItem>
//           <SidebarMenuButton 
//             onClick={() => {
//               logout();
//               navigate('/login');
//             }}
//             className="flex items-center w-full p-3 font-semibold text-neutral-600 rounded-lg transition-colors hover:bg-red-100 hover:text-red-600"
//             tooltip="Log out"
//           >
//             <LogOutIcon className="size-5" />
//             {state === 'expanded' && <span className="ml-3 text-sm">Log out</span>}
//           </SidebarMenuButton>
//         </SidebarMenuItem>
        
//         {state === 'expanded' && (
//           <div className="mt-4 pt-4 border-t border-neutral-200">
//             {(isLoading || isLoadingUserDoc) ? (
//               <div className="text-xs text-neutral-500">Loading user...</div>
//             ) : (
//               <div className="flex items-center gap-3">
//                 <div className="flex items-center justify-center shrink-0 size-10 rounded-full bg-black font-bold text-white text-lg">
//                   {userDoc?.user_image ? (
//                     <img src={userDoc.user_image} alt="Profile" className="w-full h-full rounded-full object-cover" />
//                   ) : (
//                     userDoc?.full_name?.charAt(0).toUpperCase() || 'U'
//                   )}
//                 </div>
//                 <div className="min-w-0">
//                   <p className="text-sm font-semibold text-black truncate">
//                     {userDoc?.full_name || "User Name"}
//                   </p>
//                   <p className="text-xs text-neutral-500 truncate">
//                     {userDoc?.email || ""}
//                   </p>
//                 </div>
//               </div>
//             )}
//           </div>
//         )}
//       </SidebarFooter>
//     </Sidebar>
//   );
// }





// -=-=-=-=-=-=-=-=--=-=-=-=-=-=-=-=-=-=-= working


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
  CurrencyIcon,
  HandCoinsIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk";
import { useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";

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

export function AppSidebar({ isPermanentEmployee }: { isPermanentEmployee: boolean }) {
  // --- LOGIC: Hooks and State (Unchanged) ---
  const { logout, currentUser, isLoading } = useFrappeAuth();
  const { state } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const [openSubMenus, setOpenSubMenus] = useState<string[]>([]);

  const { data: userDoc, isLoading: isLoadingUserDoc } = useFrappeGetDoc(
    'User',
    currentUser || '',
    {
      fields: ["full_name", "email", "user_image", "designation_name"],
      enabled: !!currentUser
    }
  );

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
  ];
  
  // --- LOGIC: Event Handlers (Unchanged) ---
  const handleMenuItemClick = (item: MenuItem) => {
    if (item.subMenu) {
      setOpenSubMenus((prev) =>
        prev.includes(item.label)
          ? prev.filter((label) => label !== item.label)
          : [...prev, item.label]
      );
    } else if (item.label === "Home") {
      navigate(isPermanentEmployee ? "/pihomepage" : "/home");
    } else if (item.path) {
      navigate(item.path);
    }
  };

  const handleSubMenuItemClick = (subItem: SubMenuItem) => {
    navigate(subItem.path);
  };
  
  // --- LOGIC: Path Checking (Unchanged) ---
  const isActivePath = (path: string) => {
    if (path === "/home") {
      return location.pathname === "/home" || location.pathname === "/pihomepage";
    }
    return location.pathname.startsWith(path) && path !== "/";
  };
  
  return (
    // --- DESIGN: Main Sidebar Container with Dull Background ---
    <Sidebar collapsible="icon" variant="sidebar" className="bg-stone-100 border-r-2 border-black">
      
      {/* --- DESIGN: Header with Improved Padding --- */}
      <SidebarHeader className="p-4 border-b-2 border-black">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center size-12  rounded-md">
            <img 
              src="/file.svg"
              alt="R&D Operations Logo" 
             
            />
          </div>
          {state === 'expanded' && (
            <div>
              <span className="text-xl font-bold text-black uppercase">R&D Portal</span>
              {/* <span className="block text-xs text-neutral-600 font-mono mt-0.5">
                {isPermanentEmployee ? "Permanent Employee" : "Project Staff"}
              </span> */}
            </div>
          )}
        </div>
      </SidebarHeader>
      
      {/* --- DESIGN: Menu Content with Refined Neo-Brutalism Style --- */}
      <SidebarContent className="p-4">
        <SidebarGroup>
          <SidebarMenu className="space-y-3">
            {menuItems.map((item) => {
              const isAnySubMenuActive = item.subMenu?.some(sub => isActivePath(sub.path)) ?? false;
              const isActive = (item.path && isActivePath(item.path)) || isAnySubMenuActive;
              const isSubMenuOpen = openSubMenus.includes(item.label);
              
              return (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    onClick={() => handleMenuItemClick(item)}
                    className={cn(
                      "flex items-center justify-between w-full p-3 font-semibold text-black rounded-lg transition-all border-2",
                      isActive 
                        ? "bg-slate-300 border-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)]" 
                        : "border-transparent hover:border-black hover:shadow-[2px_2px_0px_rgba(0,0,0,0.25)] hover:bg-stone-200"
                    )}
                    tooltip={item.label}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex items-center justify-center size-10 rounded-md border-2 border-black transition-colors",
                        isActive ? "bg-black" : "bg-white"
                      )}>
                        <item.icon className={cn("size-5", isActive ? "text-white" : "text-black")} />
                      </div>
                      {state === 'expanded' && <span className="text-base">{item.label}</span>}
                    </div>
                    
                    {state === 'expanded' && item.subMenu && (
                      <ChevronDownIcon className={cn("size-5 transition-transform", isSubMenuOpen && "rotate-180")} />
                    )}
                  </SidebarMenuButton>
                  
                  {item.subMenu && isSubMenuOpen && state === 'expanded' && (
                    <SidebarMenuSub className="ml-8 mt-2 space-y-1.5 border-l-2 border-black pl-5">
                      {item.subMenu.map((subItem) => {
                        const isSubActive = isActivePath(subItem.path);
                        return (
                          <SidebarMenuSubItem key={subItem.label}>
                            <SidebarMenuSubButton
                              onClick={() => handleSubMenuItemClick(subItem)}
                              className={cn(
                                "w-full px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors text-left",
                                isSubActive ? "bg-slate-300" : "text-neutral-700 hover:bg-stone-200"
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
      
      {/* --- DESIGN: Footer with Improved Padding --- */}
      <SidebarFooter className="p-4 border-t-2 border-black">
        <SidebarMenuItem>
          <SidebarMenuButton 
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="flex items-center w-full p-3 font-semibold text-black rounded-lg transition-all group border-2 border-transparent hover:border-black hover:bg-red-400 hover:text-white"
            tooltip="Log out"
          >
            <div className="flex items-center justify-center size-10 rounded-md bg-white border-2 border-black transition-colors group-hover:bg-white">
              <LogOutIcon className="size-5 text-black" />
            </div>
            {state === 'expanded' && <span className="ml-3 text-base">Log out</span>}
          </SidebarMenuButton>
        </SidebarMenuItem>
        
        {state === 'expanded' && (
          <div className="mt-4 pt-4 border-t-2 border-black">
            {(isLoading || isLoadingUserDoc) ? (
              <div className="p-2 font-mono text-sm text-neutral-600">Loading user...</div>
            ) : (
              <div className="flex items-center gap-4 p-1">
                <div className="flex items-center justify-center shrink-0 size-12 rounded-md bg-black border-2 border-black font-bold text-white text-2xl">
                  {userDoc?.user_image ? (
                    <img src={userDoc.user_image} alt="Profile" className="w-full h-full rounded-[4px] object-cover" />
                  ) : (
                    userDoc?.full_name?.charAt(0).toUpperCase() || 'U'
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-base font-semibold text-black truncate">
                    {userDoc?.full_name || "User Name"}
                  </p>
                  <p className="text-sm text-neutral-600 truncate font-mono">
                    {userDoc?.email || ""}
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
