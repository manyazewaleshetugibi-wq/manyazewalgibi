// sidebar.tsx
"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AudioWaveform,
  SquareTerminal,
  ShoppingCart,
  Package,
  ClipboardList,
  FileText,
  Tag,
  Cake,
  Truck,
  Store,
  BookCheckIcon,
  Pen,
  ListOrderedIcon,
  UserSquare2Icon,
  Settings,
  ChefHat,
  ListChecks,
  ClipboardCheck,
  SearchCheckIcon,
  DollarSign,
  QrCode,
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

// ============================================
// ROLE-BASED NAVIGATION - SAME AS MIDDLEWARE
// ============================================

const ALL_ROUTES = {
  ADMIN: [
    '/dashboard', '/stock','/Culture','/entenfsandretreat', '/scategory', '/stockReport', '/purchase-request',
    '/items', '/catagory', '/healthy-menu', '/menu-profitability',
    '/orders', '/delivery', '/blog', '/contents', '/applications', '/books',
    '/sales', '/expe', '/profit', '/training', '/Pregister',
    '/preparation', '/Sregister', '/standards', '/staffregister',
    '/waitress', '/restaurants', '/BirthDate', '/prizes',
    '/pos', '/search', '/daily-tasks', '/profile', '/change-password',
    '/table-arrangement', '/feedback', '/edit', '/myorders', '/expenses',
    '/qr' // ✅ ADDED QR PAGE - ADMIN ONLY
  ],
  KITCHEN: [
    '/Culture', '/orders', '/delivery', '/training',
    '/preparation', '/standards', '/daily-tasks', '/profile',
    '/change-password', '/table-arrangement'
  ],
  FB: [
     '/Culture', '/items', '/catagory', '/menu-profitability',
    '/Pregister', '/Sregister', '/training', '/preparation',
    '/standards', '/daily-tasks', '/profile', '/change-password', '/books'
  ],
  MARKETING: [
     '/Culture', '/entenfsandretreat', '/blog', '/contents', '/training',
    '/feedback', '/standards', '/daily-tasks', '/profile',
    '/change-password'
  ],
  FINANCE: [
     '/Culture', '/stock', '/scategory', '/stockReport',
    '/purchase-request', '/sales', '/expe', '/profit',
    '/training', '/expenses', '/standards', '/daily-tasks',
    '/profile', '/change-password'
  ],
  STOCK_MANAGER: [
    '/Culture', '/stock', '/scategory', '/stockReport',
    '/purchase-request', '/training', '/standards',
    '/daily-tasks', '/profile', '/change-password'
  ],
  PURCHASING: [
    '/Culture', '/purchase-request', '/stock', '/stockReport',
    '/training', '/standards', '/daily-tasks', '/profile',
    '/change-password'
  ],
  DELIVERY: [
    '/Culture', '/delivery', '/training', '/standards',
    '/daily-tasks', '/profile', '/change-password'
  ],
  POS: [
    '/Culture', '/pos', '/edit', '/myorders',
    '/table-arrangement', '/training', '/standards',
    '/daily-tasks', '/profile', '/change-password'
  ],
  WAITRESS: [
    '/Culture', '/pos', '/myorders', '/table-arrangement',
    '/training', '/daily-tasks', '/profile', '/change-password'
  ],
  DEFAULT: [
    '/Culture', '/training', '/daily-tasks', '/profile',
    
  ]
};

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
          { title: "Stock Report", url: "/stockReport" },
          { title: "Purchase Request", url: "/purchase-request" }
        ],
      },
      {
        title: "Menu Management",
        url: "#",
        icon: ClipboardList,
        items: [
          { title: "Items", url: "/items" },
          { title: "Item Categories", url: "/catagory" },
          { title: "Healthy Menu", url: "/healthy-menu" },
          { title: "Menu Profitability", url: "/menu-profitability" },
          { title: "Books", url: "/books" }
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
          {title: 'entenfsandretreat', url: "/entenfsandretreat"}
        ],
      },
      {
        title: "Finance and Purchase",
        url: "#",
        icon: FileText,
        items: [
          { title: "Sales", url: "/sales" },
          { title: "Expenses", url: "/expe" },
          { title: "Profit", url: "/profit" }
        ],
      },
      {
        title: "HR Training and Culture",
        url: "#",
        icon: ChefHat,
        items: [
          { title: "Training", url: "/training", icon: BookCheckIcon },
          { title: "Culture", url: "/Culture", icon: AudioWaveform },
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
          { title: "Prizes", url: "/prizes" },
        ],
      },
      {
        title: "QR Management", // ✅ NEW QR SECTION
        url: "#",
        icon: QrCode,
        items: [
          { title: "QR Generator", url: "/qr" },
        ],
      },
    ],
    projects: [
      { name: "Dashboard", url: "/dashboard", icon: Tag },
      { name: "POS", url: "/pos", icon: SquareTerminal },
      { name: "QR Code", url: "/qr", icon: QrCode }, // ✅ ADD QR TO PROJECTS
      { name: "Search", url: "/search", icon: SearchCheckIcon },
      { name: "Daily Tasks", url: "/daily-tasks", icon: ListOrderedIcon }
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
      { name: "Preparation", url: "/preparation", icon: ChefHat },
      { name: "Standards", url: "/standards", icon: ClipboardCheck },
      { name: "Daily Tasks", url: "/daily-tasks", icon: ListOrderedIcon },
      { name: "culture", url: "/Culture", icon: AudioWaveform } // ✅ ADDED CULTURE FOR KITCHEN
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
          { title: "Menu Profitability", url: "/menu-profitability" }
        ],
      },
      {
        title: "Steps & Standards",
        url: "#",
        icon: ChefHat,
        items: [
          { title: "Steps Register", url: "/Pregister", icon: ListChecks },
          { title: "Standards Register", url: "/Sregister", icon: ClipboardCheck },
        ],
      },
    ],
    projects: [
      { name: "Dashboard", url: "/dashboard", icon: Tag },
      { name: "Training", url: "/training", icon: BookCheckIcon },
      { name: "Preparation", url: "/preparation", icon: ChefHat },
      { name: "Standards", url: "/standards", icon: ClipboardCheck },
      { name: "Daily Tasks", url: "/daily-tasks", icon: ListOrderedIcon },
      { name: "culture", url: "/Culture", icon: AudioWaveform } // ✅ ADDED CULTURE FOR KITCHEN

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
          {title: "Applications", url: "/applications" },
          { title: "entenfsandretreat", url: "/entenfsandretreat" }
        ],
      },
    ],
    projects: [
      { name: "Dashboard", url: "/dashboard", icon: Tag },
      { name: "Training", url: "/training", icon: BookCheckIcon },
      { name: "Feedback", url: "/feedback", icon: Pen },
      { name: "Standards", url: "/standards", icon: ClipboardCheck },
      { name: "Daily Tasks", url: "/daily-tasks", icon: ListOrderedIcon },
      { name: "culture", url: "/Culture", icon: AudioWaveform } // ✅ ADDED CULTURE FOR KITCHEN

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
          { title: "Stock Report", url: "/stockReport" },
          { title: "Purchase Request", url: "/purchase-request" }
        ],
      },
      {
        title: "Reports",
        url: "#",
        icon: FileText,
        items: [
          { title: "Sales", url: "/sales" },
          { title: "Expenses", url: "/expe" },
          { title: "Profit", url: "/profit" }
        ],
      },
    ],
    projects: [
      { name: "Dashboard", url: "/dashboard", icon: Tag },
      { name: "Training", url: "/training", icon: BookCheckIcon },
      { name: "Expenses", url: "/expenses", icon: DollarSign },
      { name: "Standards", url: "/standards", icon: ClipboardCheck },
      { name: "Daily Tasks", url: "/daily-tasks", icon: ListOrderedIcon },
            { name: "culture", url: "/Culture", icon: AudioWaveform } // ✅ ADDED CULTURE FOR KITCHEN

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
          { title: "Stock Report", url: "/stockReport" },
          { title: "Purchase Request", url: "/purchase-request" }
        ],
      },
    ],
    projects: [
      { name: "Dashboard", url: "/dashboard", icon: Tag },
      { name: "Training", url: "/training", icon: BookCheckIcon },
      { name: "Standards", url: "/standards", icon: ClipboardCheck },
      { name: "Daily Tasks", url: "/daily-tasks", icon: ListOrderedIcon },
            { name: "culture", url: "/Culture", icon: AudioWaveform } // ✅ ADDED CULTURE FOR KITCHEN

    ],
  },

  PURCHASING: {
    navMain: [
      {
        title: "Purchase Management",
        url: "#",
        icon: Package,
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
          { title: "Stock Report", url: "/stockReport" },
        ],
      },
    ],
    projects: [
      { name: "Dashboard", url: "/dashboard", icon: Tag },
      { name: "Training", url: "/training", icon: BookCheckIcon },
      { name: "Standards", url: "/standards", icon: ClipboardCheck },
      { name: "Daily Tasks", url: "/daily-tasks", icon: ListOrderedIcon },
            { name: "culture", url: "/Culture", icon: AudioWaveform } // ✅ ADDED CULTURE FOR KITCHEN

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
      { name: "Standards", url: "/standards", icon: ClipboardCheck },
      { name: "Daily Tasks", url: "/daily-tasks", icon: ListOrderedIcon },
            { name: "culture", url: "/Culture", icon: AudioWaveform } // ✅ ADDED CULTURE FOR KITCHEN

    ],
  },

  POS: {
    navMain: [
      {
        title: "POS",
        url: "#",
        icon: ShoppingCart,
        items: [
          { title: "POS", url: "/pos" },
          { title: "Edit", url: "/edit" },
          { title: "My Orders", url: "/myorders" },
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
      { name: "Dashboard", url: "/dashboard", icon: Tag },
      { name: "POS", url: "/pos", icon: SquareTerminal },
      { name: "Training", url: "/training", icon: BookCheckIcon },
      { name: "Standards", url: "/standards", icon: ClipboardCheck },
      { name: "Daily Tasks", url: "/daily-tasks", icon: ListOrderedIcon },
      { name: "culture", url: "/Culture", icon: AudioWaveform } // ✅ ADDED CULTURE FOR KITCHEN

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
      { name: "Dashboard", url: "/dashboard", icon: Tag },
      { name: "Training", url: "/training", icon: BookCheckIcon },
      { name: "Daily Tasks", url: "/daily-tasks", icon: ListOrderedIcon },
            { name: "culture", url: "/Culture", icon: AudioWaveform } // ✅ ADDED CULTURE FOR KITCHEN

    ],
  },

  DEFAULT: {
    navMain: [],
    projects: [
      { name: "Training", url: "/training", icon: BookCheckIcon },
      { name: "Daily Tasks", url: "/daily-tasks", icon: ListOrderedIcon },
            { name: "culture", url: "/Culture", icon: AudioWaveform } // ✅ ADDED CULTURE FOR KITCHEN

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

// Helper functions
const normalizeRole = (role: string | undefined): string => {
  if (!role) return 'DEFAULT';
  return role.toUpperCase().trim();
};

const getNavigationForRole = (role: string | undefined) => {
  const normalizedRole = normalizeRole(role);
  return roleBasedNavigation[normalizedRole as keyof typeof roleBasedNavigation] || roleBasedNavigation.DEFAULT;
};

// Filter navigation items based on role
const filterNavItemsByRole = (items: any[], role: string): any[] => {
  const normalizedRole = normalizeRole(role);
  const allowedRoutes = ALL_ROUTES[normalizedRole as keyof typeof ALL_ROUTES] || ALL_ROUTES.DEFAULT;
  
  const filterItems = (item: any): any => {
    if (item.items && Array.isArray(item.items)) {
      const filteredItems = item.items
        .map(filterItems)
        .filter(subItem => {
          if (subItem.url && subItem.url !== '#') {
            return allowedRoutes.includes(subItem.url);
          }
          if (subItem.items && subItem.items.length > 0) {
            return true;
          }
          return subItem.items && subItem.items.length > 0;
        })
        .filter(subItem => {
          if (subItem.url === '#' && subItem.items && subItem.items.length === 0) {
            return false;
          }
          return true;
        });
      
      return { ...item, items: filteredItems };
    }
    
    if (item.url && item.url !== '#') {
      return allowedRoutes.includes(item.url) ? item : null;
    }
    
    return item;
  };
  
  return items
    .map(filterItems)
    .filter(item => {
      if (item.url === '#' && item.items && item.items.length === 0) {
        return false;
      }
      return item !== null;
    });
};

const addEditProfileForAllRoles = (projects: Array<{ name: string; url: string; icon: any }>, role: string) => {
  const normalizedRole = normalizeRole(role);
  const allowedRoutes = ALL_ROUTES[normalizedRole as keyof typeof ALL_ROUTES] || ALL_ROUTES.DEFAULT;
  
  const filteredProjects = projects.filter(project => 
    allowedRoutes.includes(project.url)
  );
  
  return [
    { name: "Edit Profile", url: "/profile", icon: Settings },
    ...filteredProjects,
  ];
};

// Check if route is public
const isPublicRoute = (pathname: string): boolean => {
  const publicRoutes = ['/', '/login', '/belog', '/register', '/home', '/about', '/blogs'];
  return publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));
};

// Get default redirect for role
const getDefaultRedirect = (role: string): string => {
  const defaults = {
    ADMIN: '/dashboard',
    KITCHEN: '/orders',
    FB: '/items',
    MARKETING: '/blog',
    FINANCE: '/dashboard',
    STOCK_MANAGER: '/stock',
    PURCHASING: '/purchase-request',
    DELIVERY: '/delivery',
    POS: '/pos',
    WAITRESS: '/pos',
    DEFAULT: '/dashboard'
  };
  return defaults[role as keyof typeof defaults] || '/dashboard';
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session, status } = useSession();
  const userRole = session?.user?.role;
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isMounted, setIsMounted] = useState(false);
  const [showUnauthorized, setShowUnauthorized] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
    
    // Check for unauthorized access
    const hasUnauthorizedParam = searchParams?.get('unauthorized') === 'true';
    const hasUnauthorizedCookie = document.cookie.includes('unauthorized_access=true');
    
    if (hasUnauthorizedParam || hasUnauthorizedCookie) {
      setShowUnauthorized(true);
      
      // Clear the cookie
      document.cookie = 'unauthorized_access=; Max-Age=0; path=/';
      
      // Remove the param from URL without reloading
      if (hasUnauthorizedParam && window.history.replaceState) {
        const newUrl = window.location.pathname + window.location.search.replace(/[?&]unauthorized=true/, '');
        window.history.replaceState({}, '', newUrl);
      }
      
      // Hide after 5 seconds
      setTimeout(() => {
        setShowUnauthorized(false);
      }, 5000);
    }
  }, [searchParams]);
  
  const normalizedRole = normalizeRole(userRole);
  const navigation = getNavigationForRole(userRole);
  
  // Filter navigation items based on role
  const filteredNavMain = filterNavItemsByRole(navigation.navMain || [], normalizedRole);
  const filteredProjects = navigation.projects || [];
  const enhancedProjects = addEditProfileForAllRoles(filteredProjects, normalizedRole);
  
  // Check if current path is accessible
  const isCurrentPathAccessible = React.useMemo(() => {
    if (!isMounted) return true;
    if (isPublicRoute(pathname)) return true;
    if (pathname === '/') return true;
    
    const normalizedRole = normalizeRole(userRole);
    const allowedRoutes = ALL_ROUTES[normalizedRole as keyof typeof ALL_ROUTES] || ALL_ROUTES.DEFAULT;
    
    // Check exact match
    if (allowedRoutes.includes(pathname)) {
      return true;
    }
    
    // Check if path starts with any allowed route
    for (const route of allowedRoutes) {
      if (pathname.startsWith(route + '/') || pathname === route) {
        return true;
      }
    }
    
    return false;
  }, [pathname, userRole, isMounted]);

  // Client-side redirect for unauthorized access
  useEffect(() => {
    if (!isMounted) return;
    if (status === 'loading') return;
    
    const isPublic = isPublicRoute(pathname);
    if (isPublic) return;
    
    if (status === 'unauthenticated' && !isPublic) {
      router.push('/login');
      return;
    }
    
    if (status === 'authenticated' && !isCurrentPathAccessible && !isPublic) {
      console.warn(`🚫 CLIENT: ${normalizedRole} tried to access ${pathname} - Redirecting`);
      const defaultPage = getDefaultRedirect(normalizedRole);
      router.push(defaultPage + '?unauthorized=true');
    }
  }, [pathname, status, isCurrentPathAccessible, normalizedRole, router, isMounted]);

  // Loading state
  if (!isMounted || status === 'loading') {
    return (
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader><TeamSwitcher /></SidebarHeader>
        <SidebarContent>
          <div className="p-4 text-muted-foreground">Loading...</div>
        </SidebarContent>
        <SidebarFooter>
          <div className="p-4 text-muted-foreground">Loading...</div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    );
  }

  return (
    <>
      {/* Unauthorized Access Banner */}
      {showUnauthorized && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white p-4 text-center shadow-lg">
          <div className="container mx-auto">
            <p className="font-semibold">
              ⚠️ Access Denied: You don't have permission to access this page.
            </p>
            <p className="text-sm mt-1">
              Redirected to your default dashboard.
            </p>
          </div>
        </div>
      )}
      
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader>
          <TeamSwitcher />
        </SidebarHeader>
        <SidebarContent>
          {enhancedProjects.length > 0 && (
            <NavProjects projects={enhancedProjects} />
          )}
          {filteredNavMain.length > 0 && (
            <NavMain items={filteredNavMain} />
          )}
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={{...data.user, role: normalizedRole}} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </>
  );
}