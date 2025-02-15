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

// Define role-based navigation configurations
const roleBasedNavigation = {
  KITCHEN: {
    navMain: [
      {
        title: "Orders",
        url: "#",
        icon: ShoppingCart,
        items: [
          { title: "In-Restaurant", url: "/orders" },
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
        title: "Orders",
        url: "#",
        icon: ShoppingCart,
        items: [
          { title: "In-Restaurant", url: "/orders" },
        ],
      },
    ],
    projects: [
      { name: "POS", url: "/pos", icon: SquareTerminal },
      { name: "Training", url: "/training", icon: BookCheckIcon },
    ],
  },
  ADMIN: {
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
      { name: "Training", url: "/training", icon: BookCheckIcon },
      { name: "Expenses", url: "/expenses", icon: DollarSign },
      { name: "Feedback", url: "/feedback", icon: Pen },
      { name: "Waitress", url: "/waitress", icon: UserSquare2Icon },
    ],
  },
};

// Updated navigation data for restaurant management
const data = {
  user: {
    name: "Manyazewal Gibi",
    email: "Manyazewl Eshetu Gibi",
    avatar: "/avatars/restaurant.jpg",
  },
  teams: [
    {
      name: "Bole Branch",
      logo: Store,
      plan: "Premium",
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession();
  const userRole = session?.user?.role || 'ADMIN'; // Default to ADMIN if no role
  
  const navigation = roleBasedNavigation[userRole as keyof typeof roleBasedNavigation] || roleBasedNavigation.ADMIN;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavProjects projects={navigation.projects} />
        <NavMain items={navigation.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{...data.user, role: userRole}} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
