// components/ProtectedRoute.tsx
"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingScreen } from "./LoadingScreen";

// Define ALL_ROUTES here or import from your config
const ALL_ROUTES = {
  ADMIN: [
    '/dashboard', '/Culture','/entenfsandretreat','/stock', '/scategory', '/stockReport', '/purchase-request',
    '/items', '/catagory', '/healthy-menu', '/menu-profitability','/qr',
    '/orders', '/delivery', '/blog', '/contents', '/applications', '/books',
    '/sales', '/expe', '/profit', '/training', '/Pregister',
    '/preparation', '/Sregister', '/standards', '/staffregister',
    '/waitress', '/restaurants', '/BirthDate', '/prizes',
    '/pos', '/search', '/daily-tasks', '/profile', '/change-password',
    '/table-arrangement', '/feedback', '/edit', '/myorders', '/expenses',
    '/attendance', '/salary', '/audit'
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
  BARISTA: [
    '/Culture', '/orders', '/training', '/preparation', '/standards',
    '/daily-tasks', '/profile', '/change-password'
  ],
  COFFEE_MAKER: [
    '/Culture', '/orders', '/training', '/preparation', '/standards',
    '/daily-tasks', '/profile', '/change-password'
  ],
  DEFAULT: [
    '/Culture', '/training', '/daily-tasks', '/profile',
    '/change-password'
  ]
};

// Helper functions
const normalizeRole = (role: string | undefined): string => {
  if (!role) return 'DEFAULT';
  return role.toUpperCase().trim();
};

const isPublicRoute = (pathname: string): boolean => {
  const publicRoutes = ['/', '/login', '/belog', '/register', '/home', '/about', '/blogs', '/contact', '/contactus', '/attendance/clock', '/scan'];
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
    BARISTA: '/orders',
    COFFEE_MAKER: '/orders',
    DEFAULT: '/dashboard'
  };
  return defaults[role as keyof typeof defaults] || '/dashboard';
};

// Function to handle semicolon URL pattern
const normalizePathname = (pathname: string): string => {
  // If pathname contains semicolon, extract the path before it
  if (pathname.includes(';')) {
    const semicolonIndex = pathname.indexOf(';');
    const beforeSemicolon = pathname.substring(0, semicolonIndex);
    
    // If before semicolon is empty or just '/', treat as root
    if (!beforeSemicolon || beforeSemicolon === '/') {
      return '/';
    }
    
    // Otherwise, use the path before semicolon
    return beforeSemicolon;
  }
  
  return pathname;
};

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [normalizedPath, setNormalizedPath] = useState<string>('');

  useEffect(() => {
    setIsClient(true);
    
    // Normalize the pathname to handle semicolon URLs
    const normalized = normalizePathname(pathname);
    setNormalizedPath(normalized);
    
    // Check if there's a table parameter in the URL
    const tableParam = searchParams.get('table');
    if (tableParam) {

      // You can handle the table parameter here if needed
      // For example, store it in state or context
    }
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!isClient) return;
    
    // Use normalized path for route checking
    const currentPath = normalizedPath || normalizePathname(pathname);
    
    // Check if it's a public route
    if (isPublicRoute(currentPath)) {
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
      
      // Check if current normalized path is allowed
      const isAllowed = allowedRoutes.some(route => 
        currentPath === route || currentPath.startsWith(route + '/')
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
  }, [status, session, pathname, normalizedPath, router, isClient]);

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