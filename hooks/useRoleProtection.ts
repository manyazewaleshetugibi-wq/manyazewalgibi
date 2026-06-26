// hooks/useRoleProtection.ts
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';

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
  // ... add all other roles
  DEFAULT: [
    '/dashboard', '/training', '/daily-tasks', '/profile',
    '/change-password'
  ]
};

export function useRoleProtection() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    const userRole = session?.user?.role || 'DEFAULT';
    const normalizedRole = userRole.toUpperCase().trim();
    const allowedRoutes = ALL_ROUTES[normalizedRole as keyof typeof ALL_ROUTES] || ALL_ROUTES.DEFAULT;

    // Check if current path is accessible
    const isAccessible = allowedRoutes.some(route => 
      pathname === route || pathname.startsWith(route + '/')
    );

    // If not accessible and not a public route, redirect
    if (!isAccessible && !isPublicRoute(pathname)) {
      console.warn(`🚫 ${normalizedRole} tried to access ${pathname} - Redirecting`);
      const defaultPage = getDefaultRedirect(normalizedRole);
      router.push(defaultPage);
    }
  }, [pathname, session, status, router]);
}

function isPublicRoute(pathname: string): boolean {
  const publicRoutes = ['/', '/login', '/belog', '/register', '/home', '/about', '/blogs'];
  return publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));
}

function getDefaultRedirect(role: string): string {
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
}