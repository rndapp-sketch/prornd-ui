// import { FrappeProvider, useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk";
// import { Outlet, useLocation, useNavigate } from "react-router-dom";
// import { AppSidebar } from "@/components/RndSidebar";
// import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
// import { MenuIcon, UserIcon, SearchIcon, MoonIcon, SunIcon, LogOutIcon, UserCircle } from "lucide-react";
// import { GlobalLoader } from "@/components/ui/global-loader";
// import { SWRConfig, useSWRConfig } from "swr";
// import { useRef, useEffect, useState } from "react";
// import CommandPalette, { useCommandPalette } from "@/components/CommandPalette";
// import { ThemeProvider, useTheme } from "@/components/theme-provider";
// import { Button } from "@/components/ui/button";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";

// function ThemeToggle() {
//   const { theme, setTheme } = useTheme();

//   return (
//     <Button
//       variant="ghost"
//       size="icon"
//       onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
//       className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
//     >
//       <SunIcon className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
//       <MoonIcon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
//       <span className="sr-only">Toggle theme</span>
//     </Button>
//   );
// }

// function AppContent() {
//   const { currentUser, logout } = useFrappeAuth();
//   const location = useLocation();
//   const navigate = useNavigate();
//   const isPublicPage = location.pathname === "/" || location.pathname === "/login";
//   const { isOpen: isCommandPaletteOpen, openPalette, closePalette } = useCommandPalette();
//   const { mutate } = useSWRConfig();

//   // Track route changes to show loader only on navigation
//   const previousPathRef = useRef(location.pathname);
//   const [isNavigating, setIsNavigating] = useState(false);
//   const [isLoggingOut, setIsLoggingOut] = useState(false);

//   const handleLogout = async () => {
//     setIsLoggingOut(true);
//     try {
//       await logout();
//       await mutate(() => true, undefined, { revalidate: false });
//       navigate("/login");
//     } catch (error) {
//       console.error("Logout failed:", error);
//     } finally {
//       setIsLoggingOut(false);
//     }
//   };

//   // Show loader only when route changes (sidebar menu navigation)
//   useEffect(() => {
//     if (previousPathRef.current !== location.pathname) {
//       // Route changed - show loader briefly
//       setIsNavigating(true);
//       previousPathRef.current = location.pathname;

//       // Hide loader after a short delay (page should be loaded by then)
//       const timer = setTimeout(() => {
//         setIsNavigating(false);
//       }, 300);

//       return () => clearTimeout(timer);
//     }
//   }, [location.pathname]);

//   const { data: userData, isLoading: isUserLoading } = useFrappeGetDoc("User", currentUser ?? "", {
//     fields: ["user_image", "full_name", "roles"],
//     enabled: !!currentUser,
//   });

//   // Only show loader when navigating between pages, not on revalidation
//   const showGlobalLoader = (!isPublicPage && isNavigating) || isLoggingOut;

//   // Process user data to get the actual user information
//   let actualUserData = null;

//   if (userData) {
//     if (Array.isArray(userData)) {
//       actualUserData = userData.find((user: any) => user.name === currentUser);
//     } else {
//       actualUserData = userData;
//     }
//   }

//   const userImageUrl = actualUserData?.user_image || null;

//   return (
//     <div className="App bg-[#F9F7F2] dark:bg-zinc-900 min-h-screen">
//       <GlobalLoader isLoading={showGlobalLoader} />

//       <SWRConfig value={{
//         revalidateOnFocus: false,
//         revalidateOnReconnect: false,
//         refreshInterval: 0,
//         shouldRetryOnError: false
//       }}>
//         {isPublicPage ? (
//           <Outlet />
//         ) : (
//           <SidebarProvider className="flex min-h-screen bg-[#F9F7F2] dark:bg-zinc-900">
//             {currentUser && (
//               <AppSidebar />
//             )}
//             <SidebarInset className="bg-[#F9F7F2] dark:bg-zinc-900 flex flex-col min-h-screen">
//               <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 border-b border-zinc-200 bg-[#F9F7F2]/80 backdrop-blur-md dark:bg-zinc-900/80 dark:border-zinc-800">
//                 <div className="flex items-center flex-1 justify-start">
//                   <SidebarTrigger className="size-10 p-2 hover:bg-[#D97757]/10 active:bg-[#D97757]/20 rounded-md text-[#D97757] transition-colors dark:text-[#D97757] dark:hover:bg-[#D97757]/10 dark:active:bg-[#D97757]/20">
//                     <MenuIcon className="size-9" />
//                   </SidebarTrigger>
//                 </div>

//                 <div className="hidden lg:flex shrink-0 items-center justify-center gap-2 xl:gap-3 py-1 px-4">
//                   <div className="assamese-text font-bold text-[10px] xl:text-xs 2xl:text-sm text-zinc-950 dark:text-white whitespace-nowrap leading-none">ভাৰতীয় প্ৰযুক্তিবিদ্যা প্ৰতিষ্ঠান গুৱাহাটী</div>
//                   <div className="w-px h-3 xl:h-4 bg-zinc-400 dark:bg-zinc-600"></div>
//                   <div className="hindi-text font-bold text-[10px] xl:text-xs 2xl:text-sm text-zinc-950 dark:text-white whitespace-nowrap leading-none pt-0.5">भारतीय प्रौद्योगिकी संस्थान गुवाहाटी</div>
//                   <div className="w-px h-3 xl:h-4 bg-zinc-400 dark:bg-zinc-600"></div>
//                   <div className="english-text font-serif font-bold text-xs xl:text-sm 2xl:text-[15px] text-zinc-950 dark:text-white whitespace-nowrap tracking-tight leading-none pt-1">Indian Institute of Technology Guwahati</div>
//                 </div>

//                 <div className="flex items-center flex-1 justify-end">
//                   {currentUser && (
//                     <div className="flex items-center gap-3">
//                       <ThemeToggle />
//                       {/* Search Button */}
//                       <button
//                         onClick={openPalette}
//                         className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-600 bg-white dark:bg-zinc-900 hover:bg-zinc-50 border border-zinc-200 rounded-md transition-colors shadow-sm dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 dark:hover:bg-zinc-800"
//                       >
//                         <SearchIcon className="h-4 w-4" />
//                         <span className="hidden sm:inline font-medium">Search</span>
//                         <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-mono bg-zinc-100 border border-zinc-200 rounded text-zinc-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400">
//                           ⌘K
//                         </kbd>
//                       </button>
//                       {isUserLoading ? (
//                         <div className="flex items-center gap-2">
//                           <div className="h-8 w-8 rounded-full bg-zinc-200 animate-pulse dark:bg-zinc-800"></div>
//                         </div>
//                       ) : (
//                         <DropdownMenu>
//                           <DropdownMenuTrigger asChild>
//                             <button className="flex items-center gap-3 pl-3 outline-none group cursor-pointer focus:outline-none">
//                               {userImageUrl ? (
//                                 <img
//                                   src={userImageUrl}
//                                   alt="User Profile"
//                                   className="h-8 w-8 rounded-full object-cover border border-zinc-200 shadow-sm transition-opacity group-hover:opacity-80 dark:border-zinc-700"
//                                   onError={(e) => {
//                                     const target = e.target as HTMLImageElement;
//                                     target.onerror = null;
//                                     target.src = 'https://placehold.co/36x36/E4E4E7/3F3F46?text=U';
//                                   }}
//                                 />
//                               ) : (
//                                 <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center border border-zinc-200 text-zinc-600 transition-colors group-hover:bg-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400 dark:group-hover:bg-zinc-700">
//                                   <UserIcon className="h-4 w-4" />
//                                 </div>
//                               )}
//                             </button>
//                           </DropdownMenuTrigger>
//                           <DropdownMenuContent align="end" className="w-56">
//                             <DropdownMenuLabel>
//                               <div className="flex flex-col space-y-1">
//                                 <p className="text-sm font-medium leading-none">{actualUserData?.full_name || "User"}</p>
//                                 <p className="text-xs leading-none text-muted-foreground">{currentUser}</p>
//                               </div>
//                             </DropdownMenuLabel>
//                             <DropdownMenuSeparator />
//                             <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer">
//                               <UserCircle className="mr-2 h-4 w-4" />
//                               <span>Profile</span>
//                             </DropdownMenuItem>
//                             <DropdownMenuSeparator />
//                             <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:text-red-400 dark:focus:text-red-400 dark:focus:bg-red-400/10 cursor-pointer">
//                               <LogOutIcon className="mr-2 h-4 w-4" />
//                               <span>Log out</span>
//                             </DropdownMenuItem>
//                           </DropdownMenuContent>
//                         </DropdownMenu>
//                       )}
//                     </div>
//                   )}
//                 </div>
//               </header>
//               <main className="flex-1 p-4 lg:p-4 bg-[#F9F7F2] dark:bg-zinc-900">
//                 <div className="mx-auto w-full animate-in fade-in duration-500">
//                   <Outlet />
//                 </div>
//               </main>
//               {/* Command Palette */}
//               <CommandPalette isOpen={isCommandPaletteOpen} onClose={closePalette} />
//             </SidebarInset>
//           </SidebarProvider>
//         )}
//       </SWRConfig>
//     </div>
//   );
// }

// function App() {
//   return (
//     <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
//       <FrappeProvider
//         socketPort="9001"
//         siteName="prornd.local"
//       >
//         <AppContent />
//       </FrappeProvider>
//     </ThemeProvider>
//   );
// }

// export default App;




// ======================================


import { FrappeProvider, useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppSidebar } from "@/components/RndSidebar";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { MenuIcon, UserIcon, SearchIcon, MoonIcon, SunIcon, LogOutIcon, UserCircle } from "lucide-react";
import { GlobalLoader } from "@/components/ui/global-loader";
import { SWRConfig, useSWRConfig } from "swr";
import { useRef, useEffect, useState } from "react";
import CommandPalette, { useCommandPalette } from "@/components/CommandPalette";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * ThemeToggle Component
 * Consistent with the redesigned ghost-button style
 */
function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
    >
      <SunIcon className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <MoonIcon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

function AppContent() {
  // --- LOGIC PRESERVED EXACTLY AS PROVIDED ---
  const { currentUser, logout } = useFrappeAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isPublicPage = location.pathname === "/" || location.pathname === "/login";
  const { isOpen: isCommandPaletteOpen, openPalette, closePalette } = useCommandPalette();
  const { mutate } = useSWRConfig();

  const previousPathRef = useRef(location.pathname);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      await mutate(() => true, undefined, { revalidate: false });
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    if (previousPathRef.current !== location.pathname) {
      setIsNavigating(true);
      previousPathRef.current = location.pathname;
      const timer = setTimeout(() => {
        setIsNavigating(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  const { data: userData, isLoading: isUserLoading } = useFrappeGetDoc("User", currentUser ?? "", {
    fields: ["user_image", "full_name", "roles"],
    enabled: !!currentUser,
  });

  const showGlobalLoader = (!isPublicPage && isNavigating) || isLoggingOut;

  let actualUserData = null;
  if (userData) {
    if (Array.isArray(userData)) {
      actualUserData = userData.find((user: any) => user.name === currentUser);
    } else {
      actualUserData = userData;
    }
  }

  const userImageUrl = actualUserData?.user_image || null;

  return (
    <div className="App bg-[#FDFCF9] dark:bg-zinc-950 min-h-screen">
      <GlobalLoader isLoading={showGlobalLoader} />

      <SWRConfig
        value={{
          revalidateOnFocus: false,
          revalidateOnReconnect: false,
          refreshInterval: 0,
          shouldRetryOnError: false,
        }}
      >
        {isPublicPage ? (
          <Outlet />
        ) : (
          <SidebarProvider className="flex min-h-screen bg-[#FDFCF9] dark:bg-zinc-950">
            {currentUser && <AppSidebar />}

            <SidebarInset className="bg-[#FDFCF9] dark:bg-zinc-950 flex flex-col min-h-screen">

              {/* --- REDESIGNED NAVBAR --- */}
              <header className="sticky top-0 z-40 w-full border-b border-zinc-200/60 bg-[#FDFCF9]/70 backdrop-blur-lg dark:bg-zinc-950/70 dark:border-zinc-800/60">
                <div className="flex h-16 items-center justify-between px-6">

                  {/* Left Section: Navigation Toggle */}
                  <div className="flex items-center gap-4 flex-1">
                    <SidebarTrigger className="h-9 w-9 text-zinc-500 hover:text-[#D97757] hover:bg-[#D97757]/10 transition-all rounded-lg" />
                    <div className="hidden md:block h-6 w-px bg-zinc-200 dark:bg-zinc-800" />
                  </div>

                  {/* Center Section: Institutional Branding (Cleaned Hierarchy) */}
                  <div className="hidden lg:flex flex-col items-center justify-center gap-0.5 px-4">
                    <div className="flex items-center gap-4">
                      <span className="assamese-text font-bold text-[11px] text-zinc-800 dark:text-zinc-200 uppercase tracking-tight">
                        ভাৰতীয় প্ৰযুক্তিবিদ্যা প্ৰতিষ্ঠান গুৱাহাটী
                      </span>
                      <div className="w-1 h-1 rounded-full bg-[#D97757]/40" />
                      <span className="hindi-text font-bold text-[11px] text-zinc-800 dark:text-zinc-200 uppercase tracking-tight">
                        भारतीय प्रौद्योगिकी संस्थान गुवाहाटी
                      </span>
                    </div>
                    <span className="english-text font-serif text-sm font-bold text-[#D97757] dark:text-[#E88B6A] tracking-tight">
                      Indian Institute of Technology Guwahati
                    </span>
                  </div>

                  {/* Right Section: Actions & Profile */}
                  <div className="flex items-center justify-end gap-3 flex-1">
                    {currentUser && (
                      <div className="flex items-center gap-2">

                        {/* Redesigned Command Trigger */}
                        <button
                          onClick={openPalette}
                          className="hidden md:flex items-center gap-3 w-48 xl:w-64 px-3 py-1.5 text-sm text-zinc-500 bg-zinc-100/50 hover:bg-zinc-100 dark:bg-zinc-900/50 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg transition-all"
                        >
                          <SearchIcon className="h-4 w-4 shrink-0" />
                          <span className="flex-1 text-left font-medium">Quick search...</span>
                          <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-white px-1.5 font-mono text-[10px] font-medium text-zinc-400 dark:bg-zinc-800 dark:border-zinc-700">
                            ⌘K
                          </kbd>
                        </button>

                        <ThemeToggle />

                        {isUserLoading ? (
                          <div className="h-8 w-8 rounded-full bg-zinc-200 animate-pulse dark:bg-zinc-800 ml-2" />
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="relative flex items-center justify-center rounded-full ml-1 focus:outline-none group">
                                {/* Visual Ring on Hover */}
                                <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-[#D97757] to-orange-300 opacity-0 group-hover:opacity-100 transition-opacity blur-[2px]" />
                                {userImageUrl ? (
                                  <img
                                    src={userImageUrl}
                                    alt="User"
                                    className="relative h-8 w-8 rounded-full object-cover border-2 border-[#FDFCF9] dark:border-zinc-950 shadow-sm"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.onerror = null;
                                      target.src = 'https://placehold.co/36x36/E4E4E7/3F3F46?text=U';
                                    }}
                                  />
                                ) : (
                                  <div className="relative h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border-2 border-[#FDFCF9] dark:border-zinc-950 text-zinc-600 transition-colors group-hover:bg-zinc-200 dark:text-zinc-400">
                                    <UserIcon className="h-4 w-4" />
                                  </div>
                                )}
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-60 mt-2 shadow-xl border-zinc-200 dark:border-zinc-800">
                              <DropdownMenuLabel className="font-normal py-3">
                                <div className="flex flex-col space-y-1">
                                  <p className="text-sm font-semibold leading-none text-zinc-900 dark:text-zinc-100">
                                    {actualUserData?.full_name || "User"}
                                  </p>
                                  <p className="text-xs leading-none text-zinc-500 dark:text-zinc-400 truncate">
                                    {currentUser}
                                  </p>
                                </div>
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer py-2">
                                <UserCircle className="mr-2 h-4 w-4 text-zinc-500" />
                                <span>Profile</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={handleLogout}
                                className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:text-red-400 dark:focus:bg-red-950/30 cursor-pointer py-2"
                              >
                                <LogOutIcon className="mr-2 h-4 w-4" />
                                <span>Log out</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </header>

              {/* Main Content Area */}
              <main className="flex-1 p-6 lg:p-8">
                <div className="mx-auto w-full max-w-7xl animate-in fade-in slide-in-from-bottom-3 duration-700">
                  <Outlet />
                </div>
              </main>

              {/* Command Palette Component */}
              <CommandPalette isOpen={isCommandPaletteOpen} onClose={closePalette} />
            </SidebarInset>
          </SidebarProvider>
        )}
      </SWRConfig>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <FrappeProvider socketPort="9001" siteName="prornd.local">
        <AppContent />
      </FrappeProvider>
    </ThemeProvider>
  );
}

export default App;
