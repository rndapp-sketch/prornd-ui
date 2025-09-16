

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
import { useNavigate } from "react-router";
import { useState } from "react";

interface SubMenuItem {
  label: string;
  onClick: () => void;
}

interface MenuItem {
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  subMenu?: SubMenuItem[];
}

const menuItems: MenuItem[] = [
  {
    label: "Home",
    icon: HomeIcon,
    onClick: () => {},
  },
  {
    label: "Projects",
    icon: FileText,
    subMenu: [
      {
        label: "Endorsement",
        onClick: () => {},
      },
      {
        label: "Project Registration",
        onClick: () => {},
      },
      {
        label: "Add Fund Sanction",
        onClick: () => {},
      },
      {
        label: "Add Received Funds",
        onClick: () => {},
      },
      {
        label: "User Creation",
        onClick: () => {},
      },
    ],
  },
  {
    label: "Users",
    icon: UsersIcon,
    subMenu: [
      {
        label: "User List",
        onClick: () => {},
      },
    ],
  },
  {
    label: "Settings",
    icon: SettingsIcon,
    onClick: () => {},
  },
];

export function AppSidebar({ setActiveView }: { setActiveView: (view: string) => void }) {
  const { logout } = useFrappeAuth();
  const { state } = useSidebar();
  const navigate = useNavigate();
  const [openSubMenus, setOpenSubMenus] = useState<string[]>([]);

  const handleMenuItemClick = (item: MenuItem) => {
    if (item.subMenu) {
      setOpenSubMenus((prev) =>
        prev.includes(item.label)
          ? prev.filter((label) => label !== item.label)
          : [...prev, item.label]
      );
    } else if (item.onClick) {
      item.onClick();
    }
  };

  const handleSubMenuItemClick = (subItem: SubMenuItem) => {
    subItem.onClick();
  };

  menuItems[0].onClick = () => setActiveView("home");
  menuItems[1].subMenu![0].onClick = () => setActiveView("endorsement");
  menuItems[1].subMenu![1].onClick = () => setActiveView("project-registration");
  menuItems[1].subMenu![2].onClick = () => setActiveView("add-fund-sanction");
  menuItems[1].subMenu![3].onClick = () => setActiveView("add-received-funds");
  menuItems[1].subMenu![4].onClick = () => setActiveView("user-creation");
  menuItems[2].subMenu![0].onClick = () => setActiveView("user-list");
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
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                onClick={() => handleMenuItemClick(item)}
                className="justify-between"
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
