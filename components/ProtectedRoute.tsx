// components/ProtectedRoute.tsx
"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingScreen } from "./LoadingScreen";

// Define ALL_ROUTES here or import from your config
const ALL_ROUTES = {
  ADMIN: [
    '/dashboard', '/stock', '/scategory', '/stockReport', '/purchase-request',
    '/items', '/catagory', '/healthy-menu', '/menu-profitability',
    '/orders', '/delivery', '/blog', '/contents', '/applications',
    '/sales', '/expe', '/profit', '/training', '/Pregister',
    '/preparation', '/Sregister', '/standards', '/staffregister',
    '/waitress', '/restaurants', '/BirthDate', '/prizes',
    '/pos', '/search', '/daily-tasks', '/profile', '/change-password',
    '/table-arrangement', '/feedback', '/edit', '/myorders', '/expenses'
  ],
  KITCHEN: [
    '/dashboard', '/orders', '/delivery', '/training',
    '/preparation', '/standards', '/daily-tasks', '/profile',
    '/change-password', '/table-arrangement'
  ],
  FB: [
    '/dashboard', '/items', '/catagory', '/menu-profitability',
    '/Pregister', '/Sregister', '/training', '/preparation',
    '/standards', '/daily-tasks', '/profile', '/change-password'
  ],
  MARKETING: [
    '/dashboard', '/blog', '/contents', '/training',
    '/feedback', '/standards', '/daily-tasks', '/profile',
    '/change-password'
  ],
  FINANCE: [
    '/dashboard', '/stock', '/scategory', '/stockReport',
    '/purchase-request', '/sales', '/expe', '/profit',
    '/training', '/expenses', '/standards', '/daily-tasks',
    '/profile', '/change-password'
  ],
  STOCK_MANAGER: [
    '/dashboard', '/stock', '/scategory', '/stockReport',
    '/purchase-request', '/training', '/standards',
    '/daily-tasks', '/profile', '/change-password'
  ],
  PURCHASING: [
    '/dashboard', '/purchase-request', '/stock', '/stockReport',
    '/training', '/standards', '/daily-tasks', '/profile',
    '/change-password'
  ],
  DELIVERY: [
    '/dashboard', '/delivery', '/training', '/standards',
    '/daily-tasks', '/profile', '/change-password'
  ],
  POS: [
    '/dashboard', '/pos', '/edit', '/myorders',
    '/table-arrangement', '/training', '/standards',
    '/daily-tasks', '/profile', '/change-password'
  ],
  WAITRESS: [
    '/dashboard', '/pos', '/myorders', '/table-arrangement',
    '/training', '/daily-tasks', '/profile', '/change-password'
  ],
  DEFAULT: [
    '/dashboard', '/training', '/daily-tasks', '/profile',
    '/change-password'
  ]
};

// Helper functions
const normalizeRole = (role: string | undefined): string => {
  if (!role) return 'DEFAULT';
  return role.toUpperCase().trim();
};

const isPublicRoute = (pathname: string): boolean => {
  const publicRoutes = ['/', '/login', '/belog', '/register', '/home', '/about', '/blogs'];
  return publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));
};

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

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    
    // Check if it's a public route
    if (isPublicRoute(pathname)) {
      setIsAuthorized(true);
      return;
    }

    // If still loading, keep showing loading
    if (status === 'loading') {
      setIsAuthorized(null);
      return;
    }

    // If not authenticated, redirect to login
    if (status === 'unauthenticated') {
      setIsAuthorized(false);
      router.push('/login');
      return;
    }

    // Check role-based access
    if (status === 'authenticated' && session?.user?.role) {
      const userRole = normalizeRole(session.user.role);
      const allowedRoutes = ALL_ROUTES[userRole as keyof typeof ALL_ROUTES] || ALL_ROUTES.DEFAULT;
      
      // Check if current path is allowed
      const isAllowed = allowedRoutes.some(route => 
        pathname === route || pathname.startsWith(route + '/')
      );

      if (isAllowed) {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
        // Redirect to default page for this role
        const defaultPage = getDefaultRedirect(userRole);
        router.push(defaultPage + '?unauthorized=true');
      }
    }
  }, [status, session, pathname, router, isClient]);

  // Show loading screen while checking authorization
  if (!isClient || status === 'loading' || isAuthorized === null) {
    return <LoadingScreen />;
  }

  // If authorized, render children
  if (isAuthorized) {
    return <>{children}</>;
  }

  // If not authorized, show nothing (will redirect)
  return null;
}