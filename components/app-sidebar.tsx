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
  ChefHat,
  ListChecks,
  ClipboardCheck,
  SearchCheckIcon,
  TrendingUp,
  Wallet,
  TruckIcon,
  ShoppingBag,
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
          { title: "Categories", url: "/scategory" },
          { title: "stockReport", url: "/stockReport" },
          { title: "purchase-request", url: "/purchase-request" }
        ],
      },
      {
        title: "Menu Management",
        url: "#",
        icon: ClipboardList,
        items: [
          { title: "Items", url: "/items" },
          { title: "Item Categories", url: "/catagory" },
          { title: "healthy-menu", url: "/healthy-menu" },
          { title: "menu-profitability", url: "/menu-profitability" }
        ],
      },
      {
        title: "Orders Management",
        url: "#",
        icon: ShoppingCart,
        items: [
          { title: "In-Restaurant", url: "/orders" },
          { title: "Pending Delivery", url: "/delivery" },
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
        title: "Finance and Purchase",
        url: "#",
        icon: FileText,
        items: [
          { title: "Sales", url: "/sales" },
          { title: "Expenses", url: "/expe" },
          { title: "profit", url: "/profit" }
        ],
      },
      {
        title: "HR Training and Culture",
        url: "#",
        icon: ChefHat,
        items: [
          {
            title: "Training",
            url: "/training",
            icon: BookCheckIcon
          },
          {
            title: "SOP",
            url: "#",
            icon: ListChecks,
            items: [
              { title: "Steps-Register", url: "/Pregister", icon: ListChecks },
              { title: "Steps-Card", url: "/preparation", icon: ListChecks },
              { title: "Standards-Register", url: "/Sregister", icon: ClipboardCheck },
              { title: "Standards-Cards", url: "/standards", icon: ClipboardCheck },
            ],
          },
        ],
      },
      {
        title: "Restaurant and Staff",
        url: "#",
        icon: ChefHat,
        items: [
          { title: "Staff Management", url: "/staffregister", icon: ListChecks },
          { title: "Waitress", url: "/waitress", icon: UserSquare2Icon },
          { title: "Restaurant-Management", url: "/restaurants", icon: ListChecks },
        ],
      },
      {
        title: "BirthDate",
        url: "#",
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
      { name: "search", url: "/search", icon: SearchCheckIcon },
      { name: "daily-tasks", url: "/daily-tasks", icon: ListOrderedIcon }
    ],
  },

  KITCHEN: {
    navMain: [
      {
        title: "Orders Management",
        url: "#",
        icon: ShoppingCart,
        items: [
          { title: "In-Restaurant", url: "/orders" },
          { title: "Pending Delivery", url: "/delivery" },
        ],
      },
    ],
    projects: [
      { name: "Training", url: "/training", icon: BookCheckIcon },
      { name: "preparation", url: "/preparation", icon: ChefHat },
      { name: "standards", url: "/standards", icon: ClipboardCheck },
      { name: "daily-tasks", url: "/daily-tasks", icon: ListOrderedIcon }
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
          { title: "Item Categories", url: "/catagory" },
          { title: "menu-profitability", url: "/menu-profitability" }
        ],
      },
      {
        title: "steps-standards",
        url: "#",
        icon: ChefHat,
        items: [
          { title: "steps-register", url: "/Pregister", icon: ListChecks },
          { title: "standards-register", url: "/Sregister", icon: ClipboardCheck },
        ],
      },
    ],
    projects: [
      { name: "Training", url: "/training", icon: BookCheckIcon },
      { name: "preparation", url: "/preparation", icon: ChefHat },
      { name: "standards", url: "/standards", icon: ClipboardCheck },
      { name: "daily-tasks", url: "/daily-tasks", icon: ListOrderedIcon }
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
      { name: "standards", url: "/standards", icon: ClipboardCheck },
      { name: "daily-tasks", url: "/daily-tasks", icon: ListOrderedIcon }
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
          { title: "Categories", url: "/scategory" },
          { title: "stockReport", url: "/stockReport" },
          { title: "purchase-request", url: "/purchase-request" }
        ],
      },
      {
        title: "Reports",
        url: "#",
        icon: FileText,
        items: [
          { title: "Sales", url: "/sales" },
          { title: "Expenses", url: "/expe" },
          { title: "profit", url: "/profit" }
        ],
      },
    ],
    projects: [
      { name: "Training", url: "/training", icon: BookCheckIcon },
      { name: "Expenses", url: "/expenses", icon: DollarSign },
      { name: "standards", url: "/standards", icon: ClipboardCheck },
      { name: "daily-tasks", url: "/daily-tasks", icon: ListOrderedIcon }
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
          { title: "Categories", url: "/scategory" },
          { title: "stockReport", url: "/stockReport" },
          { title: "purchase-request", url: "/purchase-request" }
        ],
      },
    ],
    projects: [
      { name: "Training", url: "/training", icon: BookCheckIcon },
      { name: "standards", url: "/standards", icon: ClipboardCheck },
      { name: "daily-tasks", url: "/daily-tasks", icon: ListOrderedIcon }
    ],
  },

  PURCHASING: {
    navMain: [
      {
        title: "Purchase Management",
        url: "#",
        icon: ShoppingBag,
        items: [
          { title: "Purchase Requests", url: "/purchase-request" },
        ],
      },
      {
        title: "Stock Management",
        url: "#",
        icon: Package,
        items: [
          { title: "Stock", url: "/stock" },
          { title: "stockReport", url: "/stockReport" },
        ],
      },
    ],
    projects: [
      { name: "Dashboard", url: "/dashboard", icon: Tag },
      { name: "Training", url: "/training", icon: BookCheckIcon },
      { name: "standards", url: "/standards", icon: ClipboardCheck },
      { name: "daily-tasks", url: "/daily-tasks", icon: ListOrderedIcon }
    ],
  },

  DELIVERY: {
    navMain: [
      {
        title: "Delivery Management",
        url: "#",
        icon: Truck,
        items: [
          { title: "Pending Deliveries", url: "/delivery" },
        ],
      },
    ],
    projects: [
      { name: "Dashboard", url: "/dashboard", icon: Tag },
      { name: "Training", url: "/training", icon: BookCheckIcon },
      { name: "standards", url: "/standards", icon: ClipboardCheck },
      { name: "daily-tasks", url: "/daily-tasks", icon: ListOrderedIcon },
    ],
  },

  POS: {
    navMain: [
      {
        title: "pos",
        url: "#",
        icon: ShoppingCart,
        items: [
          { title: "POS", url: "/pos" },
          { title: "edit", url: "/edit" },
          { title: "myorders", url: "/myorders" },
        ],
      },
      {
        title: "Table Management",
        url: "#",
        icon: FileText,
        items: [
          { title: "Table Management", url: "/table-arrangement" },
        ],
      },
    ],
    projects: [
      { name: "POS", url: "/pos", icon: SquareTerminal },
      { name: "Training", url: "/training", icon: BookCheckIcon },
      { name: "standards", url: "/standards", icon: ClipboardCheck },
      { name: "daily-tasks", url: "/daily-tasks", icon: ListOrderedIcon }
    ],
  },

  WAITRESS: {
    navMain: [
      {
        title: "Orders",
        url: "#",
        icon: ShoppingCart,
        items: [
          { title: "Take Order", url: "/pos" },
          { title: "My Orders", url: "/myorders" },
        ],
      },
      {
        title: "Table Management",
        url: "#",
        icon: FileText,
        items: [
          { title: "View Tables", url: "/table-arrangement" },
        ],
      },
    ],
    projects: [
      { name: "Training", url: "/training", icon: BookCheckIcon },
      { name: "daily-tasks", url: "/daily-tasks", icon: ListOrderedIcon }
    ],
  },

  DEFAULT: {
    navMain: [],
    projects: [
      { name: "Training", url: "/training", icon: BookCheckIcon },
      { name: "daily-tasks", url: "/daily-tasks", icon: ListOrderedIcon }
    ],
  },
};

// Navigation data for sidebar
const data = {
  user: {
    name: "Manyazewal Gibi",
    email: "Manyazewal Eshetu Gibi",
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

// Helper function to normalize role
const normalizeRole = (role: string | undefined): string => {
  if (!role) return 'DEFAULT';
  return role.toUpperCase().trim();
};

// Function to get navigation for a role
const getNavigationForRole = (role: string | undefined) => {
  const normalizedRole = normalizeRole(role);
  
  if (roleBasedNavigation[normalizedRole as keyof typeof roleBasedNavigation]) {
    return roleBasedNavigation[normalizedRole as keyof typeof roleBasedNavigation];
  }
  
  return roleBasedNavigation.DEFAULT;
};

// Function to add Edit Profile for all roles
const addEditProfileForAllRoles = (projects: Array<{ name: string; url: string; icon: any }>) => {
  return [
    { name: "Edit Profile", url: "/profile", icon: Settings },
    ...projects,
  ];
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const navigation = getNavigationForRole(userRole);
  
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