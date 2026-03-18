"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
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
  Cake,
  Truck,
  Store,
  BookCheckIcon,
  Pen,
  StoreIcon,
  Hand,
  ListOrderedIcon,
  UserSquare2Icon,
  User,
  Settings,
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
import { title } from "process";

// Define role-based navigation configurations
const roleBasedNavigation = {
  ADMIN: {
    navMain: [
      {
        title: "Stock Management",
        url: "#",
        icon: Package,
        items: [
          { title: "Stock", url: "/stock" },
          { title: "Categories", url: "/stock/category" },
          { title: "stockReport", url: "/stockReport" },
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
          { title: "In-Restaurant", url: "/orders" },
          { title: "Pending Delivery", url: "/orders/delivery" },
        ],
      },
      {
        title: "Marketing",
        url: "#",
        icon: AudioWaveform,
        items: [
          { title: "Blogs", url: "/blog" },
          { title: "Contents", url: "/contents" },
          { title: "Applications", url: "/applications" },
        ],
      },
      {
        title: "Reports",
        url: "#",
        icon: FileText,
        items: [
          { title: "Sales", url: "/sales" },
          { title: "Expenses", url: "/expe" },
          {title: "profit", url: "/profit"}
        ],
      },
      {
        title: "BirthDate",
        url: "/birthdate",
        icon: Cake,
        items: [
          { title: "BirthDate", url: "/BirthDate" },
          { title: "prizes", url: "/prizes" },
        ],
      }


    ],
    projects: [
      { name: "Dashboard", url: "/dashboard", icon: Tag },
      { name: "POS", url: "/pos", icon: SquareTerminal },
      { name: "Training", url: "/training", icon: BookCheckIcon },
      { name: "Expenses", url: "/expenses", icon: DollarSign },
      { name: "Feedback", url: "/feedback", icon: Pen },
      { name: "Waitress", url: "/waitress", icon: UserSquare2Icon },
    ],
  },
  KITCHEN: {
    navMain: [
      {
        title: "Orders",
        url: "#",
        icon: ShoppingCart,
        items: [
          { title: "In-Restaurant", url: "/orders" },
          { title: "Pending Delivery", url: "/orders/delivery" },
        ],
      },
    ],
    projects: [
      { name: "Training", url: "/training", icon: BookCheckIcon },
    ],
  },
  FB: {
    navMain: [
      {
        title: "Menu Management",
        url: "#",
        icon: ClipboardList,
        items: [
          { title: "Items", url: "/items" },
          { title: "Item Categories", url: "/items/catagory" },
        ],
      },
    ],
    projects: [
      { name: "Training", url: "/training", icon: BookCheckIcon },
    ],
  },
  MARKETING: {
    navMain: [
      {
        title: "Marketing",
        url: "#",
        icon: AudioWaveform,
        items: [
          { title: "Blogs", url: "/blog" },
          { title: "Contents", url: "/contents" },
        ],
      },
    ],
    projects: [
      { name: "Training", url: "/training", icon: BookCheckIcon },
      { name: "Feedback", url: "/feedback", icon: Pen },
    ],
  },
  FINANCE: {
    navMain: [
      {
        title: "Stock Management",
        url: "#",
        icon: Package,
        items: [
          { title: "Stock", url: "/stock" },
          { title: "Categories", url: "/stock/category" },
          { title: "stockReport", url: "/stockReport" },
        ],
      },
      {
        title: "Reports",
        url: "#",
        icon: FileText,
        items: [
          { title: "Sales", url: "/sales" },
          { title: "Expenses", url: "/expe" },
          {title: "profit", url: "/profit"}
        ],
      },
    ],
    projects: [
      { name: "Training", url: "/training", icon: BookCheckIcon },
      { name: "Expenses", url: "/expenses", icon: DollarSign },
    ],
  },
  STOCK_MANAGER: {
    navMain: [
      {
        title: "Stock Management",
        url: "#",
        icon: Package,
        items: [
          { title: "Stock", url: "/stock" },
          { title: "Categories", url: "/stock/category" },
          { title: "stockReport", url: "/stockReport" },
        ],
      },
    ],
    projects: [
      { name: "Training", url: "/training", icon: BookCheckIcon },
    ],
  },
  POS: {
    navMain: [
      {
        title: "pos",
        url: "#",
        icon: ShoppingCart,
        items: [
          { title: "POs", url: "/pos"  },
           { title: "edit", url: "/orders/edit"  },
           { title: "myorders", url: "/orders/myorders"  },
        ],
      },
    ],
    projects: [
      { name: "POS", url: "/pos", icon: SquareTerminal },
      { name: "Training", url: "/training", icon: BookCheckIcon },
    ],
  },
  // Add a default/fallback role configuration
  DEFAULT: {
    navMain: [],
    projects: [
      { name: "Training", url: "/training", icon: BookCheckIcon },
    ],
  },
};

// Updated navigation data for restaurant management
const data = {
  user: {
    name: "Manyazewal Gibi",
    email: "Manyazewl Eshetu Gibi",
    avatar: "/man_logo.jpg",
  },
  teams: [
    {
      name: "Bole Branch",
      logo: Store,
      plan: "Premium",
    },
  ],
};

// Helper function to normalize role (remove case sensitivity)
const normalizeRole = (role: string | undefined): string => {
  if (!role) return 'DEFAULT';
  return role.toUpperCase().trim();
};

// Function to get navigation for a role
const getNavigationForRole = (role: string) => {
  const normalizedRole = normalizeRole(role);
  
  // Check if the role exists in our configuration
  if (roleBasedNavigation[normalizedRole as keyof typeof roleBasedNavigation]) {
    return roleBasedNavigation[normalizedRole as keyof typeof roleBasedNavigation];
  }
  
  // Fall back to DEFAULT if role not found
  return roleBasedNavigation.DEFAULT;
};

// Function to add Edit Profile for all roles
const addEditProfileForAllRoles = (projects: Array<{ name: string; url: string; icon: any }>) => {
  return [
    // Add Edit Profile at the top for easy access for ALL roles
    { name: "Edit Profile", url: "/profile/edit", icon: Settings },
    // Then the existing projects
    ...projects,
  ];
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const navigation = getNavigationForRole(userRole);
  
  // Add Edit Profile to projects for ALL roles
  const enhancedProjects = addEditProfileForAllRoles(navigation.projects || []);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {enhancedProjects.length > 0 && (
          <NavProjects projects={enhancedProjects} />
        )}
        {navigation.navMain.length > 0 && (
          <NavMain items={navigation.navMain} />
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{...data.user, role: userRole || 'DEFAULT'}} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}