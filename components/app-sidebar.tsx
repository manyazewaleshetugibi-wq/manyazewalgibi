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
          { title: "Categories", url: "/scategory" },
          { title: "stockReport", url: "/stockReport" },
        ],
      },

     {
  title: "steps-standards",
  url: "#",
  icon: ChefHat,  // Or ClipboardList, or FileText
  items: [
    { 
      title: "steps-register", 
      url: "/preparation/register",
      icon: ListChecks  // For registration/form
    },
 { 
      title: "steps-card", 
      url: "/preparation",
      icon: ListChecks  // For registration/form
    },

    { 
      title: "standards-register", 
      url: "/standards/register",
      icon: ClipboardCheck  // Or FileCheck, or Standard
    },
     { 
      title: "standards-cards", 
      url: "/standards",
      icon: ClipboardCheck  // Or FileCheck, or Standard
    },
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
          {title: "menu-profitability", url: "/menu-profitability"}
        ],
      },
      {
        title: "Orders",
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
      {name: "search", url: "/search", icon: SearchCheckIcon},
      {name: "daily-tasks", url: "/daily-tasks", icon: ListOrderedIcon }
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
          { title: "Pending Delivery", url: "/delivery" },
        ],
      },
       {
        title: "stockReport",
        url: "#",
        icon: Package,
        items: [
          { title: "stockReport", url: "/stockReport" },
        ],
      },
       {
        title: "Sales",
        url: "#",
        icon: FileText,
        items: [
          
          { title: "Sales", url: "/sales" },
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
      { name: "Training", url: "/training", icon: BookCheckIcon },
      { name: "preparation", url: "/preparation", icon: ChefHat },
      { name: "standards", url: "/standards", icon: ClipboardCheck },
      { name : "daily-tasks", url: "/daily-tasks", icon: ListOrderedIcon }
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
          {title: "menu-profitability", url: "/menu-profitability"}
        ],
      },
 {
  title: "steps-standards",
  url: "#",
  icon: ChefHat,  // Or ClipboardList, or FileText
  items: [
    { 
      title: "steps-register", 
      url: "/preparation/register",
      icon: ListChecks  // For registration/form
    },
    { 
      title: "standards-register", 
      url: "/standards/register",
      icon: ClipboardCheck  // Or FileCheck, or Standard
    },
  ],
},
    ],

    projects: [
      { name: "Training", url: "/training", icon: BookCheckIcon },
      { name: "preparation", url: "/preparation", icon: ChefHat },
      { name: "standards", url: "/standards", icon: ClipboardCheck },
      { name : "daily-tasks", url: "/daily-tasks", icon: ListOrderedIcon }
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
     { name : "daily-tasks", url: "/daily-tasks", icon: ListOrderedIcon }

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
          { title : "purchase-request", url: "/purchase-request" }
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
      { name: "standards", url: "/standards", icon: ClipboardCheck },
            { name : "daily-tasks", url: "/daily-tasks", icon: ListOrderedIcon }

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
          { title : "purchase-request", url: "/purchase-request" }
        ],
      },
    ],
    projects: [
      { name: "Training", url: "/training", icon: BookCheckIcon },
      { name: "standards", url: "/standards", icon: ClipboardCheck },
      { name : "daily-tasks", url: "/daily-tasks", icon: ListOrderedIcon }
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
           { title: "edit", url: "/edit"  },
           { title: "myorders", url: "/myorders"  },
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
      { name : "daily-tasks", url: "/daily-tasks", icon: ListOrderedIcon }
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
    { name: "Edit Profile", url: "/profile", icon: Settings },
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
