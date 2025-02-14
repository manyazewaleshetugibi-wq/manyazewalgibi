"use client";

import * as React from "react";
import {
  AudioWaveform,
  BookOpen,
  Bot,
  Command,
  Frame,
  GalleryVerticalEnd,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
  ShoppingCart,
  Package,
  ClipboardList,
  DollarSign,
  Users,
  FileText,
  LayoutDashboard,
  Tag,
  Truck,
  Store,
  BookCheckIcon,
  Pen,
  StoreIcon,
  Hand,
  ListOrderedIcon,
  UserSquare2Icon,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";

// Updated navigation data for restaurant management
const data = {
  user: {
    name: "Manyazewal Gibi",
    email: "manager@manyazewal.com",
    avatar: "/avatars/restaurant.jpg",
  },
  teams: [
    {
      name: "Bole Branch",
      logo: Store,
      plan: "Premium",
    },
  ],
  navMain: [
   
    {
      title: "Stock Management",
      url: "#",
      icon: Package,
      items: [
        { title: "Stock", url: "/stock" },
        { title: "Categories", url: "/stock/category" },
      ],
    },
    {
      title: "Menu Management",
      url: "#",
      icon: ClipboardList,
      items: [
        { title: "Items", url: "/items" },
        { title: "Item Categories", url: "/items/catagory" },
      ],
    },
    {
      title: "Orders",
      url: "#",
      icon: ShoppingCart,
      items: [
        { title: "In-Restaurant", url: "orders" },
      ],
    },
  
    {
      title: "Marketing",
      url: "#",
      icon: AudioWaveform,
      items: [
        { title: "Blogs", url: "/blog" },
        { title: "Contents", url: "/contents" },
      ],
    },
  
    {
      title: "Reports",
      url: "#",
      icon: FileText,
      items: [
        { title: "Sales", url: "/sales" },
        { title: "Expenses", url: "/expe" },
      ],
    },
  ],
  projects: [
    { name: "Dashboard", url: "/dashboard", icon: Tag },
    { name: "POS", url: "/pos", icon: SquareTerminal },
    { name: "Training", url: "/training", icon: BookCheckIcon},
    { name: "Expenses", url: "/expenses", icon: DollarSign },
    { name: "Feedback", url: "/feedback", icon: Pen },
    { name: "Waitress", url: "/waitress", icon: UserSquare2Icon},
  ],
};

// Add type for user role
type UserRole = 'KITCHEN' | 'FB' | 'MARKETING' | 'ADMIN' | 'CUSTOMER' | 'FINANCE' | 'STOCK_MANAGER' | 'POS';

// Add interface for props
interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  userRole?: UserRole;
}

// Filter navigation items based on role
const getFilteredNavItems = (role?: UserRole) => {
  if (role === 'KITCHEN') {
    return data.navMain.filter(item => 
      ['Orders'].includes(item.title)
    );
  }
  return data.navMain;
};

const getFilteredProjects = (role?: UserRole) => {
  if (role === 'KITCHEN') {
    return data.projects.filter(item => 
      ['Training'].includes(item.name)
    );
  }
  return data.projects;
};

export function AppSidebar({ userRole, ...props }: AppSidebarProps) {
  const filteredNavItems = getFilteredNavItems(userRole);
  const filteredProjects = getFilteredProjects(userRole);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavProjects projects={filteredProjects} />
        <NavMain items={filteredNavItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
