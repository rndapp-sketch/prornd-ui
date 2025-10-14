import { FrappeProvider, useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/RndSidebar";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import * as React from "react";
import { MenuIcon, UserIcon } from "lucide-react";

function App() {
  const { currentUser } = useFrappeAuth();
  const { data: userData, isLoading: isUserLoading } = useFrappeGetDoc("User", currentUser ?? "", {
    fields: ["user_image", "full_name", "roles"],
    enabled: !!currentUser,
  });

  let fullName = "";
  let isPermanentEmployee = false;

  let actualUserData = null;

  if (userData) {
    if (Array.isArray(userData)) {
      actualUserData = userData.find((user: any) => user.name === currentUser);
    } else {
      actualUserData = userData;
    }
  }

  if (actualUserData) {
    fullName = actualUserData.full_name;
    if (Array.isArray(actualUserData.roles) && actualUserData.roles.length > 0) {
      if (typeof actualUserData.roles[0] === 'string') {
        isPermanentEmployee = actualUserData.roles.includes("Permanent Employee");
      } else if (typeof actualUserData.roles[0] === 'object' && actualUserData.roles[0] !== null && 'role' in actualUserData.roles[0]) {
        isPermanentEmployee = actualUserData.roles.some((role: any) => role.role === "Permanent Employee");
      }
    }
  }

  return (
    <div className="App">
      <FrappeProvider
        socketPort="9001"
        siteName="prornd.local"
      >
        <SidebarProvider className="flex h-screen bg-gray-50">
          {currentUser && <AppSidebar isPermanentEmployee={isPermanentEmployee} />}
          <SidebarInset>
            {/* <header className="flex items-center justify-between gap-4 p-4 border-b bg-white">
              <div className="flex items-center gap-4">
                <SidebarTrigger>
                  <MenuIcon className="size-6" />
                </SidebarTrigger> */}
                {/* The title will be dynamic based on the current route, handled by Outlet */}
                {/* <h1 className="text-2xl font-bold">R&D Portal</h1>
              </div>
              {currentUser && (
                <div className="flex items-center gap-2">
                  {isUserLoading ? (
                    <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
                  ) : (
                    <img
                      src={userData?.user_image || 'https://placehold.co/32x32/E0E7FF/4F46E5?text=NA'}
                      alt="User Profile"
                      className="h-8 w-8 rounded-full object-cover border border-gray-200"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.onerror = null;
                        target.src = 'https://placehold.co/32x32/E0E7FF/4F46E5?text=NA';
                      }}
                    />
                  )}
                  <span>Welcome, {fullName || currentUser}</span>
                </div>
              )}
            </header> */}
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
