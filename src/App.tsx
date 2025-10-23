

// v2 avatar


import { FrappeProvider, useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/RndSidebar";
import { SidebarProvider, SidebarTrigger, SidebarInset, Sidebar } from "@/components/ui/sidebar";
import * as React from "react";
import { MenuIcon } from "lucide-react";

function App() {
  const { currentUser } = useFrappeAuth();
  
  // If `currentUser` is falsy, skip fetching user data
  const { data: userData, isLoading: isUserLoading } = useFrappeGetDoc("User", currentUser ?? "", {
    fields: ["user_image", "full_name", "roles"],
    enabled: !!currentUser,
  });

  // Debugging logs to see what data is being fetched
  console.log("Current User: ", currentUser);
  console.log("User Data: ", userData);

  let fullName = "";
  let isPermanentEmployee = false;
  let userImage = "";

  // Process user data
  let actualUserData = null;
  if (userData) {
    if (Array.isArray(userData)) {
      actualUserData = userData.find((user: any) => user.name === currentUser);
    } else {
      actualUserData = userData;
    }
  }

  if (actualUserData) {
    fullName = actualUserData.full_name || "Unknown User";  // Set default value
    userImage = actualUserData.user_image || ''; // Handle image URL fallback

    // Check roles and set isPermanentEmployee
    if (Array.isArray(actualUserData.roles)) {
      isPermanentEmployee = actualUserData.roles.some(
        (role: any) => role.role === "Permanent Employee"
      );
    }
  }

  return (
    <div className="App">
      <FrappeProvider socketPort="9001" siteName="prornd.local">
        <SidebarProvider className="flex h-screen bg-gray-50">
          {currentUser && (
            <Sidebar collapsible="offcanvas">
              {/* <AppSidebar isPermanentEmployee={!!isPermanentEmployee} /> */}
            </Sidebar>
          )}
          <SidebarInset>
            <header className="flex items-center justify-between gap-2 p-4 border-b bg-white">
              <div className="flex items-center gap-2 flex-grow"> {/* Added flex-grow */}
                <SidebarTrigger>
                  <MenuIcon className="size-6" />
                </SidebarTrigger>
                <div className="flex items-center justify-center gap-2 overflow-hidden flex-grow"> {/* Adjusted gap, added overflow-hidden, justify-center and flex-grow */}
                  <img src="/IITG_Logo.svg" alt="IITG Logo" style={{ width: '40px', height: '40px', flexShrink: 0 }} /> {/* Added flex-shrink: 0 */}
                  <div className="flex items-center gap-2 flex-wrap min-w-0"> {/* Added flex-wrap and min-w-0 */}
                      <div className="assamese-text text-xs sm:text-sm whitespace-nowrap font-bold">ভাৰতীয় প্ৰযুক্তিবিদ্যা প্ৰতিষ্ঠান গুৱাহাটী</div> {/* Adjusted text size and added whitespace-nowrap */}
                      <div className="vertical-line h-4 hidden sm:block"></div> {/* Hidden on small screens */}
                      <div className="hindi-text text-xs sm:text-sm whitespace-nowrap font-bold">भारतीय प्रौद्योगिकी संस्थान गुवाहाटी</div> {/* Adjusted text size and added whitespace-nowrap */}
                      <div className="vertical-line h-4 hidden sm:block"></div> {/* Hidden on small screens */}
                      <div className="english-text text-xs sm:text-sm whitespace-nowrap font-bold">Indian Institute of Technology Guwahati</div> {/* Adjusted text size and added whitespace-nowrap */}
                  </div>
                </div>
              </div>

              {currentUser && (
                <div className="flex items-center gap-2 flex-shrink-0"> {/* Added flex-shrink-0 */}
                  {/* Loading State */}
                  {isUserLoading ? (
                    <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
                  ) : (
                    <>
                      {/* User profile image */}
                      <img
                        src={userImage || 'https://placehold.co/32x32/E0E7FF/4F46E5?text=NA'}
                        alt="User Profile"
                        className="h-8 w-8 rounded-full object-cover border border-gray-200"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.src = 'https://placehold.co/32x32/E0E7FF/4F46E5?text=NA';
                        }}
                      />
                      {/* User's Full Name and Role */}
                      <div className="flex flex-col text-sm">
                        <span className="font-semibold whitespace-nowrap">{fullName || currentUser}</span> {/* Added whitespace-nowrap */}
                        <span className="text-gray-500 whitespace-nowrap">{isPermanentEmployee ? "Permanent Employee" : "Guest"}</span> {/* Added whitespace-nowrap */}
                      </div>
                    </>
                  )}
                </div>
              )}
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-4">
              <Outlet />
            </main>
          </SidebarInset>
        </SidebarProvider>
      </FrappeProvider>
    </div>
  );
}

export default App;
