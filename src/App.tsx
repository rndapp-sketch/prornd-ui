// ======================================

import {
  FrappeProvider,
  useFrappeAuth,
  useFrappeGetDoc,
} from "frappe-react-sdk";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppSidebar } from "@/components/RndSidebar";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import {
  UserIcon,
  SearchIcon,
  MoonIcon,
  SunIcon,
  LogOutIcon,
  UserCircle,
  Sparkles,
} from "lucide-react";
import { GlobalLoader } from "@/components/ui/global-loader";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { SWRConfig, useSWRConfig } from "swr";
import { useRef, useEffect, useState } from "react";
import CommandPalette, { useCommandPalette } from "@/components/CommandPalette";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  const isPublicPage =
    location.pathname === "/" ||
    location.pathname === "/login" ||
    location.pathname.startsWith("/salary-module/register");
  const {
    isOpen: isCommandPaletteOpen,
    openPalette,
    closePalette,
  } = useCommandPalette();
  const { mutate } = useSWRConfig();

  const previousPathRef = useRef(location.pathname);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const forceServerLogout = async () => {
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
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      await forceServerLogout();
    } finally {
      await mutate(() => true, undefined, { revalidate: false });
      localStorage.removeItem("prornd_last_user");
      navigate("/login", { replace: true });
      // Hard reload for a clean slate (fresh Frappe session/socket state) — must use
      // the configured base path, not a bare "/login": under a non-root base (e.g.
      // /dev/), an unprefixed absolute path is outside the SPA's mount point and the
      // backend/proxy won't resolve it to the login page, so this used to silently
      // strand the user instead of logging them out.
      window.location.href = `${import.meta.env.BASE_URL}login`;
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

  const { data: userData, isLoading: isUserLoading } = useFrappeGetDoc(
    "User",
    currentUser ?? "",
    {
      fields: ["user_image", "full_name", "roles"],
      enabled: !!currentUser,
    },
  );

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
    <div className="App bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen">
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
          <SidebarProvider className="flex min-h-screen bg-[#FAFAF9] dark:bg-[#18181B]">
            {currentUser && <AppSidebar />}

            <SidebarInset className="bg-[#FAFAF9] dark:bg-[#18181B] flex flex-col min-h-screen">
              {/* ── Premium Enterprise Navbar ── */}
              <header className="enterprise-navbar">
                {/* 2px indigo accent line at very top */}
                <div className="h-[2px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-transparent" />

                <div className="flex h-[3.25rem] items-center justify-between px-5">
                  {/* Left: Sidebar toggle + divider */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <SidebarTrigger className="h-8 w-8 flex items-center justify-center text-[#71717A] hover:text-[#D97757] hover:bg-[#D97757]/10 dark:text-[#71717A] dark:hover:text-[#E88B6A] dark:hover:bg-[#D97757]/10 transition-all rounded-lg border border-transparent hover:border-[#D97757]/20" />
                    <div className="hidden md:block h-5 w-px bg-[#E4E4E7] dark:bg-[#3F3F46]" />
                    {/* App name chip on small screens */}
                    <div className="flex md:hidden items-center gap-1.5">
                      <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#D97757]">
                        ProRnD
                      </span>
                      <span className="text-[10px] text-[#A1A1AA] font-medium">
                        · IIT Guwahati
                      </span>
                    </div>
                  </div>

                  {/* Center: Institutional Branding */}
                  <div className="hidden lg:flex flex-col items-center justify-center gap-0.5 px-6 flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <span className="assamese-text navbar-brand-multilang">
                        ভাৰতীয় প্ৰযুক্তিবিদ্যা প্ৰতিষ্ঠান গুৱাহাটী
                      </span>
                      <span className="navbar-brand-divider" />
                      <span className="hindi-text navbar-brand-multilang">
                        भारतीय प्रौद्योगिकी संस्थान गुवाहाटी
                      </span>
                    </div>
                    <span className="english-text navbar-brand-english">
                      Indian Institute of Technology Guwahati
                    </span>
                  </div>

                  {/* Right: Search + Theme + Profile */}
                  <div className="flex items-center justify-end gap-2.5 flex-1">
                    {currentUser && (
                      <>
                        {/* Premium Search trigger */}
                        <button
                          onClick={openPalette}
                          className="hidden items-center gap-2.5 w-44 xl:w-56 px-3 py-1.5 text-[#71717A] hover:text-[#3F3F46] dark:text-[#71717A] dark:hover:text-[#A1A1AA] bg-[#F4F4F5] hover:bg-white dark:bg-[#27272A]/60 dark:hover:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] hover:border-[#D4D4D8] dark:hover:border-[#52525B] rounded-lg transition-all shadow-sm"
                          title="Search (⌘K)"
                        >
                          <SearchIcon className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="flex-1 text-left text-[12px] font-medium">
                            Search...
                          </span>
                          <kbd className="hidden xl:inline-flex items-center h-4 px-1.5 font-mono text-[9px] font-semibold bg-white dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] rounded text-[#A1A1AA]">
                            ⌘K
                          </kbd>
                        </button>

                        {/* What's New */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => navigate("/whats-new")}
                              className="h-8 w-8 flex items-center justify-center text-[#71717A] hover:text-[#D97757] hover:bg-[#D97757]/10 dark:text-[#71717A] dark:hover:text-[#E88B6A] dark:hover:bg-[#D97757]/10 transition-all rounded-lg border border-transparent hover:border-[#D97757]/20"
                            >
                              <Sparkles className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>What's New</TooltipContent>
                        </Tooltip>

                        {/* Theme toggle */}
                        <ThemeToggle />

                        {/* Divider */}
                        <div className="h-5 w-px bg-[#E4E4E7] dark:bg-[#3F3F46]" />

                        {/* Profile avatar + dropdown */}
                        {isUserLoading ? (
                          <div className="h-8 w-8 rounded-full bg-[#E4E4E7] animate-pulse dark:bg-[#3F3F46]" />
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="group flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-lg hover:bg-[#F4F4F5] dark:hover:bg-[#27272A] border border-transparent hover:border-[#E4E4E7] dark:hover:border-[#3F3F46] transition-all focus:outline-none">
                                <div className="relative flex-shrink-0">
                                  {userImageUrl ? (
                                    <img
                                      src={userImageUrl}
                                      alt="User"
                                      className="h-7 w-7 rounded-full object-cover border-2 border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm group-hover:border-[#4A6CF7]/40 transition-colors"
                                      onError={(e) => {
                                        const target =
                                          e.target as HTMLImageElement;
                                        target.onerror = null;
                                        target.src =
                                          "https://placehold.co/36x36/E4E4E7/3F3F46?text=U";
                                      }}
                                    />
                                  ) : (
                                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#4A6CF7] to-[#2563EB] flex items-center justify-center border-2 border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm">
                                      <UserIcon className="h-3.5 w-3.5 text-white" />
                                    </div>
                                  )}
                                  {/* Online dot */}
                                  <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 border-[1.5px] border-[#FAFAF9] dark:border-[#18181B]" />
                                </div>
                                <div className="hidden xl:block text-left">
                                  <p className="text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] leading-none">
                                    {actualUserData?.full_name?.split(" ")[0] ||
                                      "User"}
                                  </p>
                                </div>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-64 mt-2 shadow-xl border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] rounded-xl overflow-hidden p-0"
                            >
                              {/* Header panel */}
                              <div className="bg-gradient-to-br from-[#EEF2FF] to-[#F5F3FF] dark:from-[#27272A] dark:to-[#1F1F24] px-4 py-3.5 border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                                <div className="flex items-center gap-3">
                                  {userImageUrl ? (
                                    <img
                                      src={userImageUrl}
                                      alt=""
                                      className="h-9 w-9 rounded-full object-cover border-2 border-white/80 shadow-sm"
                                    />
                                  ) : (
                                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#4A6CF7] to-[#2563EB] flex items-center justify-center shadow-sm">
                                      <UserIcon className="h-4 w-4 text-white" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-[13px] font-semibold text-[#18181B] dark:text-[#E4E4E7] truncate leading-none mb-0.5">
                                      {actualUserData?.full_name || "User"}
                                    </p>
                                    <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] truncate font-medium">
                                      {currentUser}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              {/* Menu items */}
                              <div className="p-1.5">
                                <DropdownMenuItem
                                  onClick={() => navigate("/profile")}
                                  className="cursor-pointer py-2 px-3 rounded-lg text-[13px] font-medium text-[#3F3F46] dark:text-[#D4D4D8] hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] focus:bg-[#F4F4F5] dark:focus:bg-[#3F3F46] gap-2.5"
                                >
                                  <UserCircle className="h-4 w-4 text-[#71717A] dark:text-[#A1A1AA]" />
                                  <span>My Profile</span>
                                </DropdownMenuItem>
                              </div>
                              <div className="border-t border-[#F4F4F5] dark:border-[#3F3F46] p-1.5">
                                <DropdownMenuItem
                                  onClick={handleLogout}
                                  className="cursor-pointer py-2 px-3 rounded-lg text-[13px] font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 focus:bg-red-50 dark:focus:bg-red-950/30 gap-2.5"
                                >
                                  <LogOutIcon className="h-4 w-4" />
                                  <span>Sign out</span>
                                </DropdownMenuItem>
                              </div>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </header>

              {/* Main Content Area */}
              <main className="flex-1 px-5 py-3 lg:px-7 lg:py-4">
                <div className="mx-auto w-full max-w-[1600px] animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <Outlet />
                </div>
              </main>

              {/* Command Palette Component */}
              <CommandPalette
                isOpen={isCommandPaletteOpen}
                onClose={closePalette}
              />
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
      <FrappeProvider siteName="prornd.local" enableSocket={false}>
        <AppContent />
      </FrappeProvider>
    </ThemeProvider>
  );
}

export default App;
