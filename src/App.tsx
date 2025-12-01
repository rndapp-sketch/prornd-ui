



import { FrappeProvider, useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk";
import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar } from "@/components/RndSidebar";
import { SidebarProvider, SidebarTrigger, SidebarInset, Sidebar } from "@/components/ui/sidebar";
import { MenuIcon, UserIcon } from "lucide-react";
import { GlobalLoader } from "@/components/ui/global-loader";
import { SWRConfig } from "swr";

function App() {
  const { currentUser } = useFrappeAuth();
  const location = useLocation();
  const isPublicPage = location.pathname === "/" || location.pathname === "/login";

  const { data: userData, isLoading: isUserLoading } = useFrappeGetDoc("User", currentUser ?? "", {
    fields: ["user_image", "full_name", "roles"],
    enabled: !!currentUser,
  });

  // let fullName = "";
  // let isPermanentEmployee = false;

  // Process user data to get the actual user information
  let actualUserData = null;

  if (userData) {
    if (Array.isArray(userData)) {
      // If userData is an array, find the current user
      actualUserData = userData.find((user: any) => user.name === currentUser);
    } else {
      // If userData is a single object, use it directly
      actualUserData = userData;
    }
  }

  // Extract user information from the processed data
  // if (actualUserData) {
  //   fullName = actualUserData.full_name || currentUser || "User";

  //   // Handle roles array to determine if user is permanent employee
  //   if (Array.isArray(actualUserData.roles) && actualUserData.roles.length > 0) {
  //     if (typeof actualUserData.roles[0] === 'string') {
  //       isPermanentEmployee = actualUserData.roles.includes("Permanent Employee");
  //     } else if (typeof actualUserData.roles[0] === 'object' && actualUserData.roles[0] !== null && 'role' in actualUserData.roles[0]) {
  //       isPermanentEmployee = actualUserData.roles.some((role: any) => role.role === "Permanent Employee");
  //     }
  //   }
  // }

  // Get user image URL with fallback
  const getUserImageUrl = () => {
    if (!actualUserData?.user_image) {
      return null;
    }

    // If user_image is a full URL, use it directly
    if (actualUserData.user_image.startsWith('http')) {
      return actualUserData.user_image;
    }

    // If it's a relative path, construct the full URL
    return `https://prornd.local${actualUserData.user_image}`;
  };

  const userImageUrl = getUserImageUrl();

  return (
    <div className="App">
      <GlobalLoader isLoading={isUserLoading} />
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
            <SidebarProvider className="flex h-screen bg-gray-50">
              {currentUser && (
                <Sidebar collapsible="offcanvas">
                  <AppSidebar />
                </Sidebar>
              )}
              <SidebarInset>
                <header className="relative flex items-center justify-between gap-4 p-7 border-b bg-[#EBECF4] shadow-sm">
                  <div className="flex items-center gap-4">
                    <SidebarTrigger className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                      <MenuIcon className="size-5 text-gray-600" />
                    </SidebarTrigger>
                    {/* <h1 className="text-xl font-semibold text-gray-800">R&D Portal</h1> */}
                  </div>

                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ justifyContent: 'center', alignItems: 'center', gap: '48px', display: 'inline-flex' }}>
                    <img src="/IITG_Logo.svg" alt="IITG Logo" style={{ width: '80px', height: '80px' }} />
                    <div style={{ justifyContent: 'flex-start', alignItems: 'center', gap: '50px', display: 'flex' }}>
                      <div className="assamese-text font-bold text-base whitespace-nowrap">ভাৰতীয় প্ৰযুক্তিবিদ্যা প্ৰতিষ্ঠান গুৱাহাটী</div>
                      <div className="vertical-line"></div>
                      <div className="hindi-text font-bold text-lg whitespace-nowrap">भारतीय प्रौद्योगिकी संस्थान गुवाहाटी</div>
                      <div className="vertical-line"></div>
                      <div className="english-text font-bold text-lg whitespace-nowrap">Indian Institute of Technology Guwahati</div>
                    </div>
                  </div>
                  {currentUser && (
                    <div className="flex items-center gap-3">
                      {isUserLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
                          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                          {userImageUrl ? (
                            <img
                              src={userImageUrl}
                              alt="User Profile"
                              className="h-8 w-8 rounded-full object-cover border border-gray-300"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null;
                                target.src = 'https://placehold.co/32x32/E0E7FF/4F46E5?text=NA';
                              }}
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200">
                              <UserIcon className="h-4 w-4 text-blue-600" />
                            </div>
                          )}
                          {/* <div className="flex flex-col"> */}
                          {/* <span className="text-sm font-medium text-gray-700">
                            {fullName}
                          </span> */}
                          {/* <span className="text-xs text-gray-500">
                            {isPermanentEmployee ? "Permanent Employee" : "Project Staff"}
                          </span> */}
                          {/* </div> */}
                        </div>
                      )}
                    </div>
                  )}
                </header>
                <main className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
                  <Outlet />
                </main>
              </SidebarInset>
            </SidebarProvider>
          )}
        </SWRConfig>
      </FrappeProvider>
    </div>
  );
}

export default App;