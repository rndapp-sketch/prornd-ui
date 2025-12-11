import { FrappeProvider, useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk";
import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "@/components/RndSidebar";
import { SidebarProvider, SidebarTrigger, SidebarInset, Sidebar } from "@/components/ui/sidebar";
import { MenuIcon, UserIcon, SearchIcon } from "lucide-react";
import { GlobalLoader } from "@/components/ui/global-loader";
import { SWRConfig } from "swr";
import { useRef, useEffect, useState } from "react";
import CommandPalette, { useCommandPalette } from "@/components/CommandPalette";

function App() {
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
    <div className="App">
      <GlobalLoader isLoading={showGlobalLoader} />
      <FrappeProvider
        socketPort="9001"
        siteName="prornd.local"
      >
        <SWRConfig value={{
          revalidateOnFocus: false,
          revalidateOnReconnect: false,
          refreshInterval: 0,
          shouldRetryOnError: false
        }}>
          {isPublicPage ? (
            <Outlet />
          ) : (
            <SidebarProvider className="flex h-screen bg-[#F0F4F8]">
              {currentUser && (
                <Sidebar collapsible="offcanvas">
                  <AppSidebar />
                </Sidebar>
              )}
              <SidebarInset>
                <header className="relative flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-200 bg-white shadow-sm">
                  <div className="flex items-center gap-4">
                    <SidebarTrigger className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
                      <MenuIcon className="size-5 text-gray-500" />
                    </SidebarTrigger>
                  </div>

                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-8">
                    {/* <img src="/IITG_Logo.svg" alt="IITG Logo" className="w-16 h-16" /> */}
                    <div className="flex items-center gap-6">
                      <div className="assamese-text font-medium text-sm text-gray-600 whitespace-nowrap">ভাৰতীয় প্ৰযুক্তিবিদ্যা প্ৰতিষ্ঠান গুৱাহাটী</div>
                      <div className="w-px h-6 bg-gray-200"></div>
                      <div className="hindi-text font-medium text-sm text-gray-600 whitespace-nowrap">भारतीय प्रौद्योगिकी संस्थान गुवाहाटी</div>
                      <div className="w-px h-6 bg-gray-200"></div>
                      <div className="english-text font-semibold text-sm text-gray-900 whitespace-nowrap">Indian Institute of Technology Guwahati</div>
                    </div>
                  </div>
                  {currentUser && (
                    <div className="flex items-center gap-3">
                      {/* Search Button */}
                      <button
                        onClick={openPalette}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors"
                      >
                        <SearchIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">Search...</span>
                        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-mono bg-white border border-gray-300 rounded">
                          ⌘K
                        </kbd>
                      </button>
                      {isUserLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="h-9 w-9 rounded-xl bg-gray-100 animate-pulse"></div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
                          {userImageUrl ? (
                            <img
                              src={userImageUrl}
                              alt="User Profile"
                              className="h-9 w-9 rounded-xl object-cover border border-gray-200"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null;
                                target.src = 'https://placehold.co/36x36/E0F7F6/0EA5A4?text=NA';
                              }}
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-xl bg-[#E0F7F6] flex items-center justify-center border border-[#0EA5A4]/20">
                              <UserIcon className="h-4 w-4 text-[#0EA5A4]" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </header>
                <main className="flex-1 overflow-y-auto p-4 bg-[#F0F4F8]">
                  <Outlet />
                </main>
                {/* Command Palette */}
                <CommandPalette isOpen={isCommandPaletteOpen} onClose={closePalette} />
              </SidebarInset>
            </SidebarProvider>
          )}
        </SWRConfig>
      </FrappeProvider>
    </div>
  );
}

export default App;