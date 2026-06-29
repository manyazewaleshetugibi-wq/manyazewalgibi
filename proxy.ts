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
// All these pages are accessible WITHOUT login
// ============================================

const PUBLIC_ROUTES = [
  '/',                // Home page
  '/home',            // Home page
  '/login',           // Login page
  '/Register',        // Registration page
  '/register',        // Registration page (lowercase)
  '/belog',           // Blog page
  '/Contact',         // ✅ Contact page - PUBLIC
  '/contactus',       // ✅ Contact Us page - PUBLIC
  '/about',           // About page - PUBLIC
  '/blogs',           // Blogs page - PUBLIC
  '/menu',            // Menu page - PUBLIC
  '/auth/error',      // Auth error page
  '/auth/signin',     // Sign in page
  '/auth/signup',     // Sign up page
  '/api/auth',        // Auth API routes
  '/api/auth/change-password-first',
  '/api/auth/session',
  '/api/auth/signout',
  '/_next/',          // Next.js internal
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
  // Remove trailing slash for comparison (except root)
  const cleanPath = pathname.endsWith('/') && pathname.length > 1 
    ? pathname.slice(0, -1) 
    : pathname;
  
  // Check exact match
  if (PUBLIC_ROUTES.includes(cleanPath)) {
    return true;
  }
  
  // Check if path starts with any public route
  for (const route of PUBLIC_ROUTES) {
    // Handle routes that end with '/'
    if (route.endsWith('/')) {
      if (pathname.startsWith(route)) {
        return true;
      }
    }
    // Handle routes like /contact, /about, etc.
    else if (cleanPath === route || cleanPath.startsWith(route + '/')) {
      return true;
    }
  }
  
  return false;
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
  
  const isApiRoute = pathname.startsWith('/api/');
  const routeList = isApiRoute ? permissions.apiRoutes : permissions.routes;
  
  if (!routeList) {
    return false;
  }
  
  if (routeList.includes(pathname)) {
    return true;
  }
  
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

  // ✅ CHECK IF ROUTE IS PUBLIC
  const isPublic = isPublicRoute(pathname);
  
  // ✅ FOR PUBLIC ROUTES - Allow access immediately
  if (isPublic) {
    // If user is logged in and trying to access login/register, redirect to dashboard
    if (
      pathname === '/login' || 
      pathname === '/belog' || 
      pathname === '/Register' ||
      pathname === '/register' || 
      pathname === '/auth/signin' ||
      pathname === '/auth/signup'
    ) {
      try {
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (token) {
          const userRole = token.role || 'DEFAULT';
          const defaultPage = getDefaultRedirect(userRole);
          url.pathname = defaultPage;
          return NextResponse.redirect(url);
        }
      } catch (error) {
        // If token check fails, just show the login page
        console.error('Error checking token for login redirect:', error);
      }
    }
    
    // ✅ ALLOW ACCESS TO ALL PUBLIC PAGES (contact, about, blogs, etc.)
    // No authentication required!
    return NextResponse.next();
  }

  // ============================================
  // PROTECTED ROUTES - Require authentication
  // ============================================
  
  let token = null;
  try {
    token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  } catch (error) {
    console.error('Error getting token:', error);
  }

  // No token - redirect to login
  if (!token) {
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

  // Role-based access control
  const userRole = token.role || 'DEFAULT';
  const normalizedRole = normalizeRole(userRole);
  
  // Root redirect
  if (pathname === '/') {
    const defaultPage = getDefaultRedirect(normalizedRole);
    url.pathname = defaultPage;
    return NextResponse.redirect(url);
  }
  
  // Check access
  const hasAccess = hasRouteAccess(normalizedRole, pathname);
  
  if (!hasAccess) {
    console.warn(`🚫 ACCESS DENIED: ${normalizedRole} attempted to access ${pathname}`);
    
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Access Denied: ${normalizedRole} does not have permission`,
          role: normalizedRole,
        },
        { status: 403 }
      );
    }
    
    const defaultPage = getDefaultRedirect(normalizedRole);
    url.pathname = defaultPage;
    url.searchParams.delete('callbackUrl');
    url.searchParams.set('unauthorized', 'true');
    
    const response = NextResponse.redirect(url);
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