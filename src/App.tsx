import { FrappeProvider, useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk";
import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "@/components/RndSidebar";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { MenuIcon, UserIcon, SearchIcon, MoonIcon, SunIcon } from "lucide-react";
import { GlobalLoader } from "@/components/ui/global-loader";
import { SWRConfig } from "swr";
import { useRef, useEffect, useState } from "react";
import CommandPalette, { useCommandPalette } from "@/components/CommandPalette";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
    >
      <SunIcon className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <MoonIcon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

function AppContent() {
  const { currentUser } = useFrappeAuth();
  const location = useLocation();
  const isPublicPage = location.pathname === "/" || location.pathname === "/login";
  const { isOpen: isCommandPaletteOpen, openPalette, closePalette } = useCommandPalette();

  // Track route changes to show loader only on navigation
  const previousPathRef = useRef(location.pathname);
  const [isNavigating, setIsNavigating] = useState(false);

  // Show loader only when route changes (sidebar menu navigation)
  useEffect(() => {
    if (previousPathRef.current !== location.pathname) {
      // Route changed - show loader briefly
      setIsNavigating(true);
      previousPathRef.current = location.pathname;

      // Hide loader after a short delay (page should be loaded by then)
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

  // Only show loader when navigating between pages, not on revalidation
  const showGlobalLoader = !isPublicPage && isNavigating;

  // Process user data to get the actual user information
  let actualUserData = null;

  if (userData) {
    if (Array.isArray(userData)) {
      actualUserData = userData.find((user: any) => user.name === currentUser);
    } else {
      actualUserData = userData;
    }
  }

  // Get user image URL with fallback
  const getUserImageUrl = () => {
    if (!actualUserData?.user_image) {
      return null;
    }
    if (actualUserData.user_image.startsWith('http')) {
      return actualUserData.user_image;
    }
    return `https://prornd.local${actualUserData.user_image}`;
  };

  const userImageUrl = getUserImageUrl();

  return (
    <div className="App bg-[#F9F7F2] dark:bg-zinc-900 min-h-screen">
      <GlobalLoader isLoading={showGlobalLoader} />

      <SWRConfig value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        refreshInterval: 0,
        shouldRetryOnError: false
      }}>
        {isPublicPage ? (
          <Outlet />
        ) : (
          <SidebarProvider className="flex min-h-screen bg-[#F9F7F2] dark:bg-zinc-900">
            {currentUser && (
              <AppSidebar />
            )}
            <SidebarInset className="bg-[#F9F7F2] dark:bg-zinc-900 flex flex-col min-h-screen">
              <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 border-b border-zinc-200 bg-[#F9F7F2]/80 backdrop-blur-md dark:bg-zinc-900/80 dark:border-zinc-800">
                <div className="flex items-center flex-1 justify-start">
                  <SidebarTrigger className="size-10 p-2 hover:bg-[#D97757]/10 active:bg-[#D97757]/20 rounded-md text-[#D97757] transition-colors dark:text-[#D97757] dark:hover:bg-[#D97757]/10 dark:active:bg-[#D97757]/20">
                    <MenuIcon className="size-9" />
                  </SidebarTrigger>
                </div>

                <div className="hidden lg:flex shrink-0 items-center justify-center gap-2 xl:gap-3 py-1 px-4">
                  <div className="assamese-text font-bold text-[10px] xl:text-xs 2xl:text-sm text-zinc-950 dark:text-white whitespace-nowrap leading-none">ভাৰতীয় প্ৰযুক্তিবিদ্যা প্ৰতিষ্ঠান গুৱাহাটী</div>
                  <div className="w-px h-3 xl:h-4 bg-zinc-400 dark:bg-zinc-600"></div>
                  <div className="hindi-text font-bold text-[10px] xl:text-xs 2xl:text-sm text-zinc-950 dark:text-white whitespace-nowrap leading-none pt-0.5">भारतीय प्रौद्योगिकी संस्थान गुवाहाटी</div>
                  <div className="w-px h-3 xl:h-4 bg-zinc-400 dark:bg-zinc-600"></div>
                  <div className="english-text font-serif font-bold text-xs xl:text-sm 2xl:text-[15px] text-zinc-950 dark:text-white whitespace-nowrap tracking-tight leading-none pt-1">Indian Institute of Technology Guwahati</div>
                </div>

                <div className="flex items-center flex-1 justify-end">
                  {currentUser && (
                    <div className="flex items-center gap-3">
                      <ThemeToggle />
                      {/* Search Button */}
                      <button
                        onClick={openPalette}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-600 bg-white dark:bg-zinc-900 hover:bg-zinc-50 border border-zinc-200 rounded-md transition-colors shadow-sm dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 dark:hover:bg-zinc-800"
                      >
                        <SearchIcon className="h-4 w-4" />
                        <span className="hidden sm:inline font-medium">Search</span>
                        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-mono bg-zinc-100 border border-zinc-200 rounded text-zinc-500 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400">
                          ⌘K
                        </kbd>
                      </button>
                      {isUserLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-zinc-200 animate-pulse dark:bg-zinc-800"></div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 pl-3">
                          {userImageUrl ? (
                            <img
                              src={userImageUrl}
                              alt="User Profile"
                              className="h-8 w-8 rounded-full object-cover border border-zinc-200 shadow-sm dark:border-zinc-700"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null;
                                target.src = 'https://placehold.co/36x36/E4E4E7/3F3F46?text=U';
                              }}
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center border border-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400">
                              <UserIcon className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </header>
              <main className="flex-1 p-4 lg:p-4 bg-[#F9F7F2] dark:bg-zinc-900">
                <div className="mx-auto w-full animate-in fade-in duration-500">
                  <Outlet />
                </div>
              </main>
              {/* Command Palette */}
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
      <FrappeProvider
        socketPort="9001"
        siteName="prornd.local"
      >
        <AppContent />
      </FrappeProvider>
    </ThemeProvider>
  );
}

export default App;