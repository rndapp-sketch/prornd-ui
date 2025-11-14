


// -=-=-=-=-=-=-=-=--=-=-=-=-=-=-=-=-=-=-= working


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
//   CurrencyIcon,
//   HandCoinsIcon,
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
//     {
//       label: "Reimbursement",
//       icon: HandCoinsIcon,
//       path: "/reimbursement",
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
//     // --- DESIGN: Main Sidebar Container with Dull Background ---
//     <Sidebar collapsible="icon" variant="sidebar" className="bg-stone-100 border-r-2 border-black">
      
//       {/* --- DESIGN: Header with Improved Padding --- */}
//       <SidebarHeader className="p-4 border-b-2 border-black">
//         <div className="flex items-center gap-4">
//           <div className="flex items-center justify-center size-12  rounded-md">
//             <img 
//               src="/file.svg"
//               alt="R&D Operations Logo" 
             
//             />
//           </div>
//           {state === 'expanded' && (
//             <div>
//               <span className="text-xl font-bold text-black uppercase">R&D Portal</span>
//               {/* <span className="block text-xs text-neutral-600 font-mono mt-0.5">
//                 {isPermanentEmployee ? "Permanent Employee" : "Project Staff"}
//               </span> */}
//             </div>
//           )}
//         </div>
//       </SidebarHeader>
      
//       {/* --- DESIGN: Menu Content with Refined Neo-Brutalism Style --- */}
//       <SidebarContent className="p-4">
//         <SidebarGroup>
//           <SidebarMenu className="space-y-3">
//             {menuItems.map((item) => {
//               const isAnySubMenuActive = item.subMenu?.some(sub => isActivePath(sub.path)) ?? false;
//               const isActive = (item.path && isActivePath(item.path)) || isAnySubMenuActive;
//               const isSubMenuOpen = openSubMenus.includes(item.label);
              
//               return (
//                 <SidebarMenuItem key={item.label}>
//                   <SidebarMenuButton
//                     onClick={() => handleMenuItemClick(item)}
//                     className={cn(
//                       "flex items-center justify-between w-full p-3 font-semibold text-black rounded-lg transition-all border-2",
//                       isActive 
//                         ? "bg-slate-300 border-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)]" 
//                         : "border-transparent hover:border-black hover:shadow-[2px_2px_0px_rgba(0,0,0,0.25)] hover:bg-stone-200"
//                     )}
//                     tooltip={item.label}
//                   >
//                     <div className="flex items-center gap-3">
//                       <div className={cn(
//                         "flex items-center justify-center size-10 rounded-md border-2 border-black transition-colors",
//                         isActive ? "bg-black" : "bg-white"
//                       )}>
//                         <item.icon className={cn("size-5", isActive ? "text-white" : "text-black")} />
//                       </div>
//                       {state === 'expanded' && <span className="text-base">{item.label}</span>}
//                     </div>
                    
//                     {state === 'expanded' && item.subMenu && (
//                       <ChevronDownIcon className={cn("size-5 transition-transform", isSubMenuOpen && "rotate-180")} />
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
//                                 "w-full px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors text-left",
//                                 isSubActive ? "bg-slate-300" : "text-neutral-700 hover:bg-stone-200"
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
//             onClick={() => {
//               logout();
//               navigate('/login');
//             }}
//             className="flex items-center w-full p-3 font-semibold text-black rounded-lg transition-all group border-2 border-transparent hover:border-black hover:bg-red-400 hover:text-white"
//             tooltip="Log out"
//           >
//             <div className="flex items-center justify-center size-10 rounded-md bg-white border-2 border-black transition-colors group-hover:bg-white">
//               <LogOutIcon className="size-5 text-black" />
//             </div>
//             {state === 'expanded' && <span className="ml-3 text-base">Log out</span>}
//           </SidebarMenuButton>
//         </SidebarMenuItem>
        
//         {state === 'expanded' && (
//           <div className="mt-4 pt-4 border-t-2 border-black">
//             {(isLoading || isLoadingUserDoc) ? (
//               <div className="p-2 font-mono text-sm text-neutral-600">Loading user...</div>
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
//                   <p className="text-base font-semibold text-black truncate">
//                     {userDoc?.full_name || "User Name"}
//                   </p>
//                   <p className="text-sm text-neutral-600 truncate font-mono">
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



// -=-=-=-=-=


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
//   CurrencyIcon,
//   HandCoinsIcon,
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
//     {
//       label: "Reimbursement",
//       icon: HandCoinsIcon,
//       path: "/reimbursement",
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
//     // --- DESIGN: Main Sidebar Container with Clean Design ---
//     <Sidebar collapsible="icon" variant="sidebar" className="bg-white border-r border-gray-200">
      
//       {/* --- DESIGN: Header Section --- */}
//       <SidebarHeader className="px-4 py-6 border-b border-gray-200">
//         <div className="flex items-center gap-3">
//           <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg">
//             <img 
//               src="/file.svg"
//               alt="R&D Operations Logo" 
//               className="w-6 h-6"
//             />
//           </div>
//           {state === 'expanded' && (
//             <div>
//               <span className="text-lg font-bold text-gray-900">R&D Portal</span>
//             </div>
//           )}
//         </div>
//       </SidebarHeader>
      
//       {/* --- DESIGN: Menu Content Section --- */}
//       <SidebarContent className="px-3 py-4">
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
//                       "w-full h-11 px-3 rounded-lg font-semibold transition-all duration-200",
//                       isActive 
//                         ? "bg-blue-50 text-blue-700 border border-blue-200" 
//                         : "text-gray-700 border border-transparent hover:bg-gray-50 hover:border-gray-200"
//                     )}
//                     tooltip={item.label}
//                   >
//                     <div className="flex items-center gap-3 flex-1">
//                       <div className={cn(
//                         "flex items-center justify-center w-8 h-8 rounded-md transition-colors",
//                         isActive ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
//                       )}>
//                         <item.icon className="w-4 h-4" />
//                       </div>
//                       {state === 'expanded' && <span className="text-sm">{item.label}</span>}
//                     </div>
                    
//                     {state === 'expanded' && item.subMenu && (
//                       <ChevronDownIcon className={cn("w-4 h-4 transition-transform flex-shrink-0", isSubMenuOpen && "rotate-180")} />
//                     )}
//                   </SidebarMenuButton>
                  
//                   {item.subMenu && isSubMenuOpen && state === 'expanded' && (
//                     <SidebarMenuSub className="ml-2 mt-2 space-y-1 pl-0 border-l-2 border-gray-200 ml-6 pl-3">
//                       {item.subMenu.map((subItem) => {
//                         const isSubActive = isActivePath(subItem.path);
//                         return (
//                           <SidebarMenuSubItem key={subItem.label}>
//                             <SidebarMenuSubButton
//                               onClick={() => handleSubMenuItemClick(subItem)}
//                               className={cn(
//                                 "w-full px-3 py-2 text-sm rounded-md font-medium transition-colors text-left",
//                                 isSubActive 
//                                   ? "bg-blue-50 text-blue-700" 
//                                   : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
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
      
//       {/* --- DESIGN: Footer Section --- */}
//       <SidebarFooter className="px-3 py-4 border-t border-gray-200">
//         <SidebarMenuItem>
//           <SidebarMenuButton 
//             onClick={() => {
//               logout();
//               navigate('/login');
//             }}
//             className="w-full h-11 px-3 text-gray-700 rounded-lg transition-all duration-200 border border-transparent hover:bg-red-50 hover:text-red-700 hover:border-red-200 font-semibold"
//             tooltip="Log out"
//           >
//             <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-md transition-colors group-hover:bg-red-100">
//               <LogOutIcon className="w-4 h-4 text-gray-600" />
//             </div>
//             {state === 'expanded' && <span className="ml-3 text-sm">Log out</span>}
//           </SidebarMenuButton>
//         </SidebarMenuItem>
        
//         {state === 'expanded' && (
//           <div className="mt-4 pt-4 border-t border-gray-200">
//             {(isLoading || isLoadingUserDoc) ? (
//               <div className="p-2 text-sm text-gray-500">Loading user...</div>
//             ) : (
//               <div className="flex items-center gap-3 p-2">
//                 <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 font-bold text-white text-lg">
//                   {userDoc?.user_image ? (
//                     <img src={userDoc.user_image} alt="Profile" className="w-full h-full rounded-[6px] object-cover" />
//                   ) : (
//                     userDoc?.full_name?.charAt(0).toUpperCase() || 'U'
//                   )}
//                 </div>
//                 <div className="min-w-0 flex-1">
//                   <p className="text-sm font-semibold text-gray-900 truncate">
//                     {userDoc?.full_name || "User Name"}
//                   </p>
//                   <p className="text-xs text-gray-500 truncate">
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



// -=-=-=-= v2


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
//   CurrencyIcon,
//   HandCoinsIcon,
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
//     {
//       label: "Reimbursement",
//       icon: HandCoinsIcon,
//       path: "/reimbursement",
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
//     // --- DESIGN: Main Sidebar Container with Neo-Brutalism ---
//     <Sidebar collapsible="icon" variant="sidebar" className="bg-stone-100 border-r-4 border-black">
      
//       {/* --- DESIGN: Header Section --- */}
//       <SidebarHeader className="px-4 py-6 border-b-4 border-black bg-white">
//         <div className="flex items-center gap-3">
//           <div className="flex items-center justify-center w-12 h-12 bg-black rounded-none border-3 border-black">
//             <img 
//               src="/file.svg"
//               alt="R&D Operations Logo" 
//               className="w-6 h-6 invert"
//             />
//           </div>
//           {state === 'expanded' && (
//             <div>
//               <span className="text-lg font-black text-black uppercase tracking-tight">R&D Portal</span>
//             </div>
//           )}
//         </div>
//       </SidebarHeader>
      
//       {/* --- DESIGN: Menu Content Section --- */}
//       <SidebarContent className="px-3 py-4 space-y-3">
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
//                       "w-full h-12 px-3 rounded-none font-black text-sm uppercase tracking-wide transition-all duration-100 border-3",
//                       isActive 
//                         ? "bg-black text-white border-black shadow-[3px_3px_0px_rgba(0,0,0,0.4)]" 
//                         : "bg-white text-black border-black hover:shadow-[3px_3px_0px_rgba(0,0,0,0.2)]"
//                     )}
//                     tooltip={item.label}
//                   >
//                     <div className="flex items-center gap-3 flex-1">
//                       <div className={cn(
//                         "flex items-center justify-center w-8 h-8 border-2 rounded-none transition-colors",
//                         isActive ? "bg-white border-white text-black" : "bg-stone-200 border-black text-black"
//                       )}>
//                         <item.icon className="w-5 h-5 font-black" strokeWidth={2.5} />
//                       </div>
//                       {state === 'expanded' && <span>{item.label}</span>}
//                     </div>
                    
//                     {state === 'expanded' && item.subMenu && (
//                       <ChevronDownIcon className={cn("w-5 h-5 transition-transform flex-shrink-0 font-black", isSubMenuOpen && "rotate-180")} strokeWidth={2.5} />
//                     )}
//                   </SidebarMenuButton>
                  
//                   {item.subMenu && isSubMenuOpen && state === 'expanded' && (
//                     <SidebarMenuSub className="ml-2 mt-2 space-y-1.5 pl-3 border-l-4 border-black">
//                       {item.subMenu.map((subItem) => {
//                         const isSubActive = isActivePath(subItem.path);
//                         return (
//                           <SidebarMenuSubItem key={subItem.label}>
//                             <SidebarMenuSubButton
//                               onClick={() => handleSubMenuItemClick(subItem)}
//                               className={cn(
//                                 "w-full px-3 py-2.5 text-xs rounded-none font-bold uppercase tracking-wide transition-all duration-100 border-2",
//                                 isSubActive 
//                                   ? "bg-black text-white border-black" 
//                                   : "bg-white text-black border-black hover:shadow-[2px_2px_0px_rgba(0,0,0,0.15)]"
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
      
//       {/* --- DESIGN: Footer Section --- */}
//       <SidebarFooter className="px-3 py-4 border-t-4 border-black bg-white">
//         <SidebarMenuItem>
//           <SidebarMenuButton 
//             onClick={() => {
//               logout();
//               navigate('/login');
//             }}
//             className="w-full h-12 px-3 rounded-none font-black text-sm uppercase tracking-wide transition-all duration-100 border-3 border-black bg-white text-black hover:bg-red-600 hover:text-white hover:shadow-[3px_3px_0px_rgba(220,38,38,0.4)]"
//             tooltip="Log out"
//           >
//             <div className="flex items-center justify-center w-8 h-8 bg-white border-2 border-black rounded-none">
//               <LogOutIcon className="w-5 h-5 text-black font-black" strokeWidth={2.5} />
//             </div>
//             {state === 'expanded' && <span className="ml-3">Log out</span>}
//           </SidebarMenuButton>
//         </SidebarMenuItem>
        
//         {state === 'expanded' && (
//           <div className="mt-4 pt-4 border-t-3 border-black">
//             {(isLoading || isLoadingUserDoc) ? (
//               <div className="p-3 text-xs font-bold text-black uppercase">Loading...</div>
//             ) : (
//               <div className="flex items-center gap-3 p-2 border-2 border-black bg-stone-100">
//                 <div className="flex items-center justify-center flex-shrink-0 w-10 h-10 rounded-none bg-black border-2 border-black font-black text-white text-lg">
//                   {userDoc?.user_image ? (
//                     <img src={userDoc.user_image} alt="Profile" className="w-full h-full object-cover" />
//                   ) : (
//                     userDoc?.full_name?.charAt(0).toUpperCase() || 'U'
//                   )}
//                 </div>
//                 <div className="min-w-0 flex-1">
//                   <p className="text-xs font-black text-black uppercase truncate">
//                     {userDoc?.full_name || "User Name"}
//                   </p>
//                   <p className="text-xs text-gray-700 truncate font-mono">
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




// -=-=-=-=-=-=-=-=-=-= v3

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
//   CurrencyIcon,
//   HandCoinsIcon,
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
//     {
//       label: "Reimbursement",
//       icon: HandCoinsIcon,
//       path: "/reimbursement",
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
//     // --- DESIGN: Main Sidebar Container with Balanced Neo-Brutalism ---
//     <Sidebar collapsible="icon" variant="sidebar" className="bg-stone-50 border-r-2 border-gray-900">
      
//       {/* --- DESIGN: Header Section --- */}
//       <SidebarHeader className="px-4 py-5 border-b-2 border-gray-900 bg-white">
//         <div className="flex items-center gap-3">
//           <div className="flex items-center justify-center w-10 h-10  rounded-lg border border-gray-300">
//             <img 
//               src="/file.svg"
//               alt="R&D Operations Logo" 
//               className="w-5 h-5"
//             />
//           </div>
//           {state === 'expanded' && (
//             <div>
//               <span className="text-base font-bold text-gray-900 uppercase tracking-tight">R&D Portal</span>
//             </div>
//           )}
//         </div>
//       </SidebarHeader>
      
//       {/* --- DESIGN: Menu Content Section --- */}
//       <SidebarContent className="px-3 py-4">
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
//                       "w-full h-10 px-3 rounded-lg font-semibold text-sm transition-all duration-150 border-2",
//                       isActive 
//                         ? "bg-slate-900 text-white border-slate-900 shadow-[2px_2px_0px_rgba(0,0,0,0.2)]" 
//                         : "bg-white text-gray-900 border-gray-300 hover:border-gray-500 hover:shadow-[1px_1px_0px_rgba(0,0,0,0.1)]"
//                     )}
//                     tooltip={item.label}
//                   >
//                     <div className="flex items-center gap-2 flex-1">
//                       <div className={cn(
//                         "flex items-center justify-center w-7 h-7 border-1.5 rounded-md transition-colors",
//                         isActive ? "bg-white text-slate-900 border-white" : "bg-stone-100 text-gray-700 border-gray-400"
//                       )}>
//                         <item.icon className="w-4 h-4" strokeWidth={2} />
//                       </div>
//                       {state === 'expanded' && <span className="text-sm">{item.label}</span>}
//                     </div>
                    
//                     {state === 'expanded' && item.subMenu && (
//                       <ChevronDownIcon className={cn("w-4 h-4 transition-transform flex-shrink-0", isSubMenuOpen && "rotate-180")} strokeWidth={2} />
//                     )}
//                   </SidebarMenuButton>
                  
//                   {item.subMenu && isSubMenuOpen && state === 'expanded' && (
//                     <SidebarMenuSub className="ml-2 mt-2 space-y-1 pl-3 border-l-2 border-gray-400">
//                       {item.subMenu.map((subItem) => {
//                         const isSubActive = isActivePath(subItem.path);
//                         return (
//                           <SidebarMenuSubItem key={subItem.label}>
//                             <SidebarMenuSubButton
//                               onClick={() => handleSubMenuItemClick(subItem)}
//                               className={cn(
//                                 "w-full px-3 py-2 text-xs rounded-md font-medium transition-all duration-150 border-1.5",
//                                 isSubActive 
//                                   ? "bg-slate-100 text-slate-900 border-slate-300" 
//                                   : "bg-white text-gray-600 border-gray-200 hover:bg-stone-50 hover:border-gray-300"
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
      
//       {/* --- DESIGN: Footer Section --- */}
//       <SidebarFooter className="px-3 py-4 border-t-2 border-gray-900 bg-white">
//         <SidebarMenuItem>
//           <SidebarMenuButton 
//             onClick={() => {
//               logout();
//               navigate('/login');
//             }}
//             className="w-full h-10 px-3 rounded-lg font-semibold text-sm transition-all duration-150 border-2 border-gray-300 bg-white text-gray-900 hover:bg-red-50 hover:border-red-400 hover:text-red-700"
//             tooltip="Log out"
//           >
//             <div className="flex items-center justify-center w-7 h-7 bg-stone-100 rounded-md border-1.5 border-gray-400">
//               <LogOutIcon className="w-4 h-4 text-gray-700" strokeWidth={2} />
//             </div>
//             {state === 'expanded' && <span className="ml-2 text-sm">Log out</span>}
//           </SidebarMenuButton>
//         </SidebarMenuItem>
        
//         {state === 'expanded' && (
//           <div className="mt-4 pt-4 border-t-2 border-gray-300">
//             {(isLoading || isLoadingUserDoc) ? (
//               <div className="p-2 text-xs text-gray-600 font-medium">Loading user...</div>
//             ) : (
//               <div className="flex items-center gap-2 p-2 border-1.5 border-gray-300 bg-stone-50 rounded-lg">
//                 <div className="flex items-center justify-center flex-shrink-0 w-9 h-9 rounded-md bg-slate-900 border-1.5 border-gray-400 font-semibold text-white text-sm">
//                   {userDoc?.user_image ? (
//                     <img src={userDoc.user_image} alt="Profile" className="w-full h-full rounded-[4px] object-cover" />
//                   ) : (
//                     userDoc?.full_name?.charAt(0).toUpperCase() || 'U'
//                   )}
//                 </div>
//                 <div className="min-w-0 flex-1">
//                   <p className="text-xs font-semibold text-gray-900 truncate">
//                     {userDoc?.full_name || "User Name"}
//                   </p>
//                   <p className="text-xs text-gray-500 truncate">
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
      fields: ["full_name", "email", "user_image"],
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
    // --- DESIGN: Main container with softer background and refined borders ---
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
            onClick={() => {
              logout();
              navigate('/login');
            }}
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
  );
}