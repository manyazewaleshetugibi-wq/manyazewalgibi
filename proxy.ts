// proxy.ts
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

// ============================================
// ROLE-BASED ROUTE ACCESS CONTROL - STRICT
// ============================================

const ROLE_ROUTE_PERMISSIONS = {
  ADMIN: {
    routes: [
      '/dashboard',
      '/stock',
      '/scategory',
      '/stockReport',
      '/purchase-request',
      '/items',
      '/catagory',
      '/healthy-menu',
      '/menu-profitability',
      '/orders',
      '/delivery',
      '/blog',
      '/contents',
      '/applications',
      '/sales',
      '/expe',
      '/profit',
      '/training',
      '/Pregister',
      '/preparation',
      '/Sregister',
      '/standards',
      '/staffregister',
      '/waitress',
      '/restaurants',
      '/BirthDate',
      '/prizes',
      '/pos',
      '/search',
      '/daily-tasks',
      '/profile',
      '/change-password',
      '/table-arrangement',
      '/feedback',
      '/edit',
      '/myorders',
      '/expenses',
    ],
    apiRoutes: [
      '/api/order',
      '/api/orders',
      '/api/items',
      '/api/stock',
      '/api/item-category',
      '/api/categories',
      '/api/users',
      '/api/current',
      '/api/restaurants',
      '/api/sales',
      '/api/expenses',
      '/api/profit',
      '/api/training',
      '/api/blog',
      '/api/contents',
      '/api/delivery',
      '/api/purchase-request',
      '/api/scategory',
      '/api/stockReport',
      '/api/menu-profitability',
      '/api/healthy-menu',
      '/api/applications',
      '/api/expe',
      '/api/Pregister',
      '/api/preparation',
      '/api/Sregister',
      '/api/standards',
      '/api/staffregister',
      '/api/waitress',
      '/api/BirthDate',
      '/api/prizes',
      '/api/search',
      '/api/daily-tasks',
      '/api/table-arrangement',
      '/api/feedback',
      '/api/edit',
      '/api/myorders',
    ],
    defaultRedirect: '/dashboard'
  },
  
  KITCHEN: {
    routes: [
      '/dashboard',
      '/orders',
      '/delivery',
      '/training',
      '/preparation',
      '/standards',
      '/daily-tasks',
      '/profile',
      '/change-password',
      '/table-arrangement',
    ],
    apiRoutes: [
      '/api/order',
      '/api/orders',
      '/api/delivery',
      '/api/training',
      '/api/preparation',
      '/api/standards',
      '/api/daily-tasks',
      '/api/table-arrangement',
    ],
    defaultRedirect: '/orders'
  },
  
  FB: {
    routes: [
      '/dashboard',
      '/items',
      '/catagory',
      '/menu-profitability',
      '/Pregister',
      '/Sregister',
      '/training',
      '/preparation',
      '/standards',
      '/daily-tasks',
      '/profile',
      '/change-password',
    ],
    apiRoutes: [
      '/api/items',
      '/api/item-category',
      '/api/categories',
      '/api/menu-profitability',
      '/api/Pregister',
      '/api/Sregister',
      '/api/training',
      '/api/preparation',
      '/api/standards',
      '/api/daily-tasks',
    ],
    defaultRedirect: '/items'
  },
  
  MARKETING: {
    routes: [
      '/dashboard',
      '/blog',
      '/contents',
      '/training',
      '/feedback',
      '/standards',
      '/daily-tasks',
      '/profile',
      '/change-password',
    ],
    apiRoutes: [
      '/api/blog',
      '/api/contents',
      '/api/training',
      '/api/feedback',
      '/api/standards',
      '/api/daily-tasks',
    ],
    defaultRedirect: '/blog'
  },
  
  FINANCE: {
    routes: [
      '/dashboard',
      '/stock',
      '/scategory',
      '/stockReport',
      '/purchase-request',
      '/sales',
      '/expe',
      '/profit',
      '/training',
      '/expenses',
      '/standards',
      '/daily-tasks',
      '/profile',
      '/change-password',
    ],
    apiRoutes: [
      '/api/stock',
      '/api/scategory',
      '/api/stockReport',
      '/api/purchase-request',
      '/api/sales',
      '/api/expe',
      '/api/profit',
      '/api/training',
      '/api/expenses',
      '/api/standards',
      '/api/daily-tasks',
    ],
    defaultRedirect: '/dashboard'
  },
  
  STOCK_MANAGER: {
    routes: [
      '/dashboard',
      '/stock',
      '/scategory',
      '/stockReport',
      '/purchase-request',
      '/training',
      '/standards',
      '/daily-tasks',
      '/profile',
      '/change-password',
    ],
    apiRoutes: [
      '/api/stock',
      '/api/scategory',
      '/api/stockReport',
      '/api/purchase-request',
      '/api/training',
      '/api/standards',
      '/api/daily-tasks',
    ],
    defaultRedirect: '/stock'
  },
  
  PURCHASING: {
    routes: [
      '/dashboard',
      '/purchase-request',
      '/stock',
      '/stockReport',
      '/training',
      '/standards',
      '/daily-tasks',
      '/profile',
      '/change-password',
    ],
    apiRoutes: [
      '/api/purchase-request',
      '/api/stock',
      '/api/stockReport',
      '/api/training',
      '/api/standards',
      '/api/daily-tasks',
    ],
    defaultRedirect: '/purchase-request'
  },
  
  DELIVERY: {
    routes: [
      '/dashboard',
      '/delivery',
      '/training',
      '/standards',
      '/daily-tasks',
      '/profile',
      '/change-password',
    ],
    apiRoutes: [
      '/api/delivery',
      '/api/orders',
      '/api/training',
      '/api/standards',
      '/api/daily-tasks',
    ],
    defaultRedirect: '/delivery'
  },
  
  POS: {
    routes: [
      '/dashboard',
      '/pos',
      '/edit',
      '/myorders',
      '/table-arrangement',
      '/training',
      '/standards',
      '/daily-tasks',
      '/profile',
      '/change-password',
    ],
    apiRoutes: [
      '/api/pos',
      '/api/orders',
      '/api/edit',
      '/api/myorders',
      '/api/table-arrangement',
      '/api/training',
      '/api/standards',
      '/api/daily-tasks',
    ],
    defaultRedirect: '/pos'
  },
  
  WAITRESS: {
    routes: [
      '/dashboard',
      '/pos',
      '/myorders',
      '/table-arrangement',
      '/training',
      '/daily-tasks',
      '/profile',
      '/change-password',
    ],
    apiRoutes: [
      '/api/pos',
      '/api/orders',
      '/api/myorders',
      '/api/table-arrangement',
      '/api/training',
      '/api/daily-tasks',
    ],
    defaultRedirect: '/pos'
  },
  
  DEFAULT: {
    routes: [
      '/dashboard',
      '/training',
      '/daily-tasks',
      '/profile',
      '/change-password',
    ],
    apiRoutes: [
      '/api/training',
      '/api/daily-tasks',
    ],
    defaultRedirect: '/dashboard'
  }
};

// ============================================
// PUBLIC ROUTES - COMPLETE LIST
// ============================================

const PUBLIC_ROUTES = [
  '/',
  '/home',
  '/login',
  '/Register',  // ✅ This is already here - make sure it's correct case
  '/belog',
  '/contact',
  '/register',  // ✅ Also has lowercase version
  '/about',
  '/blogs',
  '/auth/error',
  '/auth/signin',
  '/auth/signup',
  '/api/auth',
  '/api/auth/change-password-first',
  '/api/auth/session',
  '/api/auth/signout',
  '/_next/',
  '/favicon.ico',
  '/manifest.json',
  '/robots.txt',
  '/sitemap.xml',
  '/api/auth/callback',
  '/api/auth/providers',
  '/api/auth/csrf',
];

const AUTH_SKIP_ROUTES = [
  '/api/auth',
  '/_next',
  '/favicon.ico',
  '/manifest.json',
  '/robots.txt',
  '/sitemap.xml',
  '/api/auth/callback',
  '/api/auth/providers',
  '/api/auth/csrf',
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function normalizeRole(role: string | undefined): string {
  if (!role) return 'DEFAULT';
  return role.toUpperCase().trim();
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => {
    if (route.endsWith('/')) {
      return pathname.startsWith(route);
    }
    return pathname === route || pathname.startsWith(route + '/');
  });
}

function shouldSkipAuth(pathname: string): boolean {
  return AUTH_SKIP_ROUTES.some(route => pathname.startsWith(route));
}

function hasRouteAccess(role: string, pathname: string): boolean {
  const normalizedRole = normalizeRole(role);
  const permissions = ROLE_ROUTE_PERMISSIONS[normalizedRole as keyof typeof ROLE_ROUTE_PERMISSIONS];
  
  if (!permissions) {
    return false;
  }
  
  // Check if it's an API route
  const isApiRoute = pathname.startsWith('/api/');
  
  // Get the appropriate route list based on whether it's an API route
  const routeList = isApiRoute ? permissions.apiRoutes : permissions.routes;
  
  if (!routeList) {
    return false;
  }
  
  // Check exact match
  if (routeList.includes(pathname)) {
    return true;
  }
  
  // Check if path starts with any allowed route
  for (const route of routeList) {
    if (pathname.startsWith(route + '/')) {
      return true;
    }
  }
  
  return false;
}

function getDefaultRedirect(role: string): string {
  const normalizedRole = normalizeRole(role);
  const permissions = ROLE_ROUTE_PERMISSIONS[normalizedRole as keyof typeof ROLE_ROUTE_PERMISSIONS];
  return permissions?.defaultRedirect || '/dashboard';
}

// ============================================
// ⭐ MAIN MIDDLEWARE
// ============================================

export default async function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;
  
  // Skip static assets
  if (shouldSkipAuth(pathname)) {
    return NextResponse.next();
  }

  // Check if route is public
  const isPublic = isPublicRoute(pathname);
  
  // Get token
  let token = null;
  if (!isPublic) {
    try {
      token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    } catch (error) {
      console.error('Error getting token:', error);
    }
  }

  // Handle public routes
  if (isPublic) {
    // If user is logged in and trying to access login/register pages, redirect to dashboard
    if (token && (
      pathname === '/login' || 
      pathname === '/belog' || 
      pathname === '/Register' ||  // ✅ Added Register here
      pathname === '/register' ||  // ✅ Added lowercase register
      pathname === '/auth/signin' ||
      pathname === '/auth/signup'
    )) {
      const userRole = token.role || 'DEFAULT';
      const defaultPage = getDefaultRedirect(userRole);
      url.pathname = defaultPage;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // No token - redirect to login
  if (!token) {
    // For API routes, return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Authentication required',
          error: 'UNAUTHORIZED'
        },
        { status: 401 }
      );
    }
    
    const redirectUrl = pathname + url.search;
    url.pathname = '/login';
    url.searchParams.set('callbackUrl', redirectUrl);
    return NextResponse.redirect(url);
  }

  // Check password change requirement
  const requiresPasswordChange = token.requiresPasswordChange === true;
  if (requiresPasswordChange && pathname !== "/change-password") {
    const allowedEndpoints = [
      "/api/auth/change-password-first",
      "/api/auth/signout",
      "/api/auth/session",
    ];
    
    if (allowedEndpoints.some(endpoint => pathname.startsWith(endpoint))) {
      return NextResponse.next();
    }
    
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Password change required before accessing this resource",
          requiresPasswordChange: true
        },
        { status: 403 }
      );
    }
    
    url.pathname = "/change-password";
    return NextResponse.redirect(url);
  }

  // ⭐⭐ STRICT ROLE-BASED ACCESS CONTROL
  const userRole = token.role || 'DEFAULT';
  const normalizedRole = normalizeRole(userRole);
  
  // Root redirect
  if (pathname === '/') {
    const defaultPage = getDefaultRedirect(normalizedRole);
    url.pathname = defaultPage;
    return NextResponse.redirect(url);
  }
  
  // ⭐ CRITICAL: Check if user has access to this route
  const hasAccess = hasRouteAccess(normalizedRole, pathname);
  
  if (!hasAccess) {
    // Log unauthorized access
    console.warn(`🚫 ACCESS DENIED: ${normalizedRole} attempted to access ${pathname}`);
    console.warn(`📍 User: ${token.email || token.id}`);
    
    // For API routes - return 403
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Access Denied: ${normalizedRole} does not have permission to access ${pathname}`,
          attemptedUrl: pathname,
          role: normalizedRole,
          allowedRoutes: ROLE_ROUTE_PERMISSIONS[normalizedRole as keyof typeof ROLE_ROUTE_PERMISSIONS]?.apiRoutes || []
        },
        { status: 403 }
      );
    }
    
    // ⭐ For page routes - redirect to role-specific default with error param
    const defaultPage = getDefaultRedirect(normalizedRole);
    url.pathname = defaultPage;
    url.searchParams.delete('callbackUrl');
    
    // Add error parameter to show unauthorized message
    url.searchParams.set('unauthorized', 'true');
    
    const response = NextResponse.redirect(url);
    
    // Also set a cookie for client-side detection
    response.cookies.set('unauthorized_access', 'true', { 
      maxAge: 5, 
      httpOnly: false,
      path: '/'
    });
    
    return response;
  }

  // Add user info to headers
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", token.id || "");
  requestHeaders.set("x-user-email", token.email || "");
  requestHeaders.set("x-user-role", normalizedRole);
  requestHeaders.set("x-employee-id", token.employeeId || "");
  requestHeaders.set("x-requires-password-change", requiresPasswordChange.toString());

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

// Export helper functions
export function getUserRoutes(role: string): string[] {
  const normalizedRole = normalizeRole(role);
  const permissions = ROLE_ROUTE_PERMISSIONS[normalizedRole as keyof typeof ROLE_ROUTE_PERMISSIONS];
  return permissions ? permissions.routes : ROLE_ROUTE_PERMISSIONS.DEFAULT.routes;
}

export function getUserApiRoutes(role: string): string[] {
  const normalizedRole = normalizeRole(role);
  const permissions = ROLE_ROUTE_PERMISSIONS[normalizedRole as keyof typeof ROLE_ROUTE_PERMISSIONS];
  return permissions ? permissions.apiRoutes : ROLE_ROUTE_PERMISSIONS.DEFAULT.apiRoutes;
}

export function isPublicRoutePath(pathname: string): boolean {
  return isPublicRoute(pathname);
}

export function getUserDefaultRoute(role: string): string {
  return getDefaultRedirect(role);
}