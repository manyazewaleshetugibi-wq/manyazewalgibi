// hooks/useRoleProtection.ts - UPDATED VERSION
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';

const ALL_ROUTES = {
  ADMIN: [
    '/dashboard', '/stock', '/scategory', '/stockReport', '/purchase-request',
    '/items', '/catagory', '/healthy-menu', '/menu-profitability',
    '/orders', '/delivery', '/blog', '/contents', '/applications', '/books',
    '/sales', '/expe', '/profit', '/training', '/Pregister',
    '/preparation', '/Sregister', '/standards', '/staffregister',
    '/waitress', '/restaurants', '/BirthDate', '/prizes',
    '/pos', '/search', '/daily-tasks', '/profile', '/change-password',
    '/feedback', '/edit', '/myorders', '/expenses',
    '/qr', '/user-performance' // ✅ ADDED
  ],
  KITCHEN: [
    '/dashboard', '/orders', '/delivery', '/training',
    '/preparation', '/standards', '/daily-tasks', '/profile',
    '/change-password'
  ],
  FB: [
    '/dashboard', '/items', '/catagory', '/menu-profitability',
    '/Pregister', '/Sregister', '/training', '/preparation',
    '/standards', '/daily-tasks', '/profile', '/change-password', '/books'
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
    '/training', '/standards',
    '/daily-tasks', '/profile', '/change-password'
  ],
  WAITRESS: [
    '/dashboard', '/pos', '/myorders',
    '/training', '/daily-tasks', '/profile', '/change-password'
  ],
  BARISTA: [
    '/dashboard', '/orders', '/preparation', '/standards',
    '/daily-tasks', '/profile', '/change-password'
  ],
  COFFEE_MAKER: [
    '/dashboard', '/orders', '/preparation', '/standards',
    '/daily-tasks', '/profile', '/change-password'
  ],
  OTHER: [
    '/Culture', '/training', '/preparation', '/standards',
    '/daily-tasks', '/profile', '/attendance', '/change-password'
  ],
  DEFAULT: [
    '/dashboard', '/training', '/daily-tasks', '/profile',
    '/change-password'
  ]
};

// Normalize role function
const normalizeRole = (role: string | undefined): string => {
  if (!role) return 'DEFAULT';
  return role.toUpperCase().trim();
};

// Check if route is public
const isPublicRoute = (pathname: string): boolean => {
  const publicRoutes = [
    '/', '/home', '/login', '/Register', '/register', 
    '/belog', '/Contact', '/contactus', '/about', '/blogs', 
    '/menu', '/auth/error', '/auth/signin', '/auth/signup'
  ];
  return publicRoutes.some(route => {
    if (route === '/') {
      return pathname === '/';
    }
    return pathname === route || pathname.startsWith(route + '/');
  });
};

// Get default redirect for role
const getDefaultRedirect = (role: string): string => {
  const defaults: { [key: string]: string } = {
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
    OTHER: '/Culture',
    DEFAULT: '/dashboard'
  };
  return defaults[role] || '/dashboard';
};

export function useRoleProtection() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Wait for session to load
    if (status === 'loading') return;

    // ✅ DEBUG: Log what's happening




    
    // Allow public routes without authentication
    if (isPublicRoute(pathname)) {

      return;
    }

    // Check if user is authenticated
    if (status === 'unauthenticated') {

      router.push('/login');
      return;
    }

    // Get user role and normalize it
    const userRole = session?.user?.role || 'DEFAULT';
    const normalizedRole = normalizeRole(userRole);
    const allowedRoutes = ALL_ROUTES[normalizedRole as keyof typeof ALL_ROUTES] || ALL_ROUTES.DEFAULT;




    // ✅ SPECIAL CASE: Check if trying to access /qr
    if (pathname === '/qr' || pathname.startsWith('/qr/')) {
      const isAdmin = normalizedRole === 'ADMIN';

      if (isAdmin) {

        return;
      } else {

        const defaultPage = getDefaultRedirect(normalizedRole);
        router.push(defaultPage + '?unauthorized=true');
        return;
      }
    }

    // Check if current path is accessible
    const isAccessible = allowedRoutes.some(route => {
      // Exact match
      if (pathname === route) return true;
      // Starts with route + '/'
      if (pathname.startsWith(route + '/')) return true;
      return false;
    });



    // If not accessible, redirect to default page
    if (!isAccessible) {
      console.warn(`🚫 ${normalizedRole} tried to access ${pathname} - Redirecting`);
      const defaultPage = getDefaultRedirect(normalizedRole);
      router.push(defaultPage + '?unauthorized=true');
    } else {

    }
  }, [pathname, session, status, router]);
}

// Export helper functions
export function getAllowedRoutes(role: string): string[] {
  const normalizedRole = normalizeRole(role);
  return ALL_ROUTES[normalizedRole as keyof typeof ALL_ROUTES] || ALL_ROUTES.DEFAULT;
}

export function hasRouteAccess(role: string, pathname: string): boolean {
  const allowedRoutes = getAllowedRoutes(role);
  return allowedRoutes.some(route => {
    if (pathname === route) return true;
    if (pathname.startsWith(route + '/')) return true;
    return false;
  });
}