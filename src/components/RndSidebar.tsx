

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
import { HomeIcon, UsersIcon, SettingsIcon, LogOutIcon, FileText, ChevronDownIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useFrappeAuth } from "frappe-react-sdk";
import { useNavigate, useLocation } from "react-router-dom"; // Import useNavigate and useLocation
import { useState } from "react";

interface SubMenuItem {
  label: string;
  path: string; // Use path instead of onClick
}

interface MenuItem {
  label: string;
  icon: LucideIcon;
  path?: string; // Use path instead of onClick
  subMenu?: SubMenuItem[];
  roles?: string[]; // Optional roles for access control
}

export function AppSidebar({ isPermanentEmployee }: { isPermanentEmployee: boolean }) { // Accept isPermanentEmployee prop
  const { logout } = useFrappeAuth();
  const { state } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation(); // Get current location for active state
  const [openSubMenus, setOpenSubMenus] = useState<string[]>([]);

  const menuItems: MenuItem[] = [
    {
      label: "Home",
      icon: HomeIcon,
      path: "/home",
      roles: ["All_ProRnd_User", "All", "Guest", "Desk User"], // Roles that can access Home
    },
    {
      label: "PI Home Page",
      icon: HomeIcon, // Using HomeIcon for now, can be changed
      path: "/pihomepage",
      roles: ["Permanent Employee"], // Roles that can access PI Home Page
    },
    {
      label: "Projects",
      icon: FileText,
      subMenu: [
        {
          label: "Projects View",
          path: "/projects-view",
        },
        {
          label: "Endorsement",
          path: "/endorsement",
        },
        {
          label: "Project Registration",
          path: "/project-registration",
        },
        {
          label: "Add Fund Sanction",
          path: "/add-fund-sanction",
        },
        {
          label: "Add Received Funds",
          path: "/add-received-funds",
        },
        {
          label: "User Creation",
          path: "/user-creation",
        },
      ],
      roles: ["All_ProRnd_User", "Permanent Employee", "All"], // Example roles for Projects
    },
    {
      label: "Users",
      icon: UsersIcon,
      path: "/users", // Base path for users
      subMenu: [
        {
          label: "User List",
          path: "/user-list",
        },
      ],
      roles: ["All_ProRnd_User", "Permanent Employee", "All"], // Example roles for Users
    },
    {
      label: "Settings",
      icon: SettingsIcon,
      path: "/settings", // Example path for settings
      roles: ["All_ProRnd_User", "Permanent Employee", "All"], // Example roles for Settings
    },
  ];

  const handleMenuItemClick = (item: MenuItem) => {
    if (item.subMenu) {
      setOpenSubMenus((prev) =>
        prev.includes(item.label)
          ? prev.filter((label) => label !== item.label)
          : [...prev, item.label]
      );
    }
    if (item.path) {
      navigate(item.path);
    }
  };

  const handleSubMenuItemClick = (subItem: SubMenuItem) => {
    navigate(subItem.path);
  };

  // Filter menu items based on user's permanent employee status
  const filteredMenuItems = menuItems.filter(item => {
    if (item.label === "Home" && isPermanentEmployee) {
      return false; // Permanent employees should not see "Home"
    }
    if (item.label === "PI Home Page" && !isPermanentEmployee) {
      return false; // Non-permanent employees should not see "PI Home Page"
    }
    return true; // Show other items for now, more granular role checks can be added
  });


  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <img src="/rndops_Logo.svg" alt="R&D Operations Logo" className="w-10 h-10" />
          {state === 'expanded' && <span className="text-lg font-semibold">R&D Portal</span>}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {filteredMenuItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                onClick={() => handleMenuItemClick(item)}
                className={`justify-between ${location.pathname === item.path ? "bg-gray-200" : ""}`} // Highlight active item
              >
                <div className="flex items-center gap-2">
                  <item.icon className="size-4" />
                  {item.label}
                </div>
                {item.subMenu && (
                  <ChevronDownIcon
                    className={`size-4 transition-transform ${
                      openSubMenus.includes(item.label) ? "rotate-180" : ""
                    }`}
                  />
                )}
              </SidebarMenuButton>
              {item.subMenu && openSubMenus.includes(item.label) && (
                <SidebarMenuSub>
                  {item.subMenu.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.label}>
                      <SidebarMenuSubButton
                        onClick={() => handleSubMenuItemClick(subItem)}
                        className={`${location.pathname === subItem.path ? "bg-gray-200" : ""}`} // Highlight active sub-item
                      >
                        {subItem.label}
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => {
              logout();
              navigate('/login');
            }}>
              <LogOutIcon className="size-4" />
              Log out
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
