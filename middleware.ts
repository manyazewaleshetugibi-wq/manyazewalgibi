// proxy.ts
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

// ============================================
// ROLE-BASED ROUTE ACCESS CONTROL - STRICT
// ============================================

// Define role-based route permissions
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
      '/expenses'
    ],
    patterns: [
      /^\/api\/admin\/.*/,
      /^\/api\/users\/.*/,
      /^\/api\/items\/.*/,
      /^\/api\/stock\/.*/,
      /^\/api\/orders\/.*/,
      /^\/api\/sales\/.*/,
      /^\/api\/training\/.*/,
    ],
    // Default landing page for this role
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
      '/table-arrangement'
    ],
    patterns: [
      /^\/api\/kitchen\/.*/,
      /^\/api\/orders\/.*/,
      /^\/api\/delivery\/.*/,
    ],
    defaultRedirect: '/orders'  // Kitchen default page
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
    patterns: [
      /^\/api\/fb\/.*/,
      /^\/api\/items\/.*/,
      /^\/api\/categories\/.*/,
    ],
    defaultRedirect: '/items'  // F&B default page
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
    patterns: [
      /^\/api\/marketing\/.*/,
      /^\/api\/blog\/.*/,
      /^\/api\/feedback\/.*/,
    ],
    defaultRedirect: '/blog'  // Marketing default page
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
    patterns: [
      /^\/api\/finance\/.*/,
      /^\/api\/stock\/.*/,
      /^\/api\/sales\/.*/,
      /^\/api\/expenses\/.*/,
    ],
    defaultRedirect: '/dashboard'  // Finance default page
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
    patterns: [
      /^\/api\/stock\/.*/,
      /^\/api\/inventory\/.*/,
    ],
    defaultRedirect: '/stock'  // Stock Manager default page
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
    patterns: [
      /^\/api\/purchasing\/.*/,
      /^\/api\/stock\/.*/,
    ],
    defaultRedirect: '/purchase-request'  // Purchasing default page
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
    patterns: [
      /^\/api\/delivery\/.*/,
      /^\/api\/orders\/.*/,
    ],
    defaultRedirect: '/delivery'  // Delivery default page
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
    patterns: [
      /^\/api\/pos\/.*/,
      /^\/api\/orders\/.*/,
    ],
    defaultRedirect: '/pos'  // POS default page
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
    patterns: [
      /^\/api\/waitress\/.*/,
      /^\/api\/orders\/.*/,
    ],
    defaultRedirect: '/pos'  // Waitress default page
  },
  
  DEFAULT: {
    routes: [
      '/dashboard',
      '/training',
      '/daily-tasks',
      '/profile',
      '/change-password',
    ],
    patterns: [
      /^\/api\/.*/,
    ],
    defaultRedirect: '/dashboard'
  }
};

// ============================================
// COMPLETE PUBLIC ROUTES LIST
// ============================================

const PUBLIC_ROUTES = [
  '/',
  '/home',
  '/login',
  '/belog',
  '/contact',
  '/register',
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
];

const AUTH_SKIP_ROUTES = [
  '/api/auth',
  '/_next',
  '/favicon.ico',
  '/manifest.json',
  '/robots.txt',
  '/sitemap.xml',
];

// ============================================
// SECURITY CONFIGURATION
// ============================================

const SECURITY_CONFIG = {
  blockedDomains: [
    'bedpage.com',
    'bedpage.',
    'malicious.',
    '.xyz',
    '.top',
    '.club',
    '.click',
    '.stream',
    '.download',
  ],
  allowedRedirectProtocols: ['http:', 'https:'],
  maxCallbackUrlLength: 500,
};

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
    const defaultPermissions = ROLE_ROUTE_PERMISSIONS.DEFAULT;
    return checkRouteMatch(pathname, defaultPermissions);
  }
  
  return checkRouteMatch(pathname, permissions);
}

function checkRouteMatch(pathname: string, permissions: { routes: string[], patterns: RegExp[] }): boolean {
  if (permissions.routes.includes(pathname)) {
    return true;
  }
  
  for (const route of permissions.routes) {
    if (pathname.startsWith(route + '/')) {
      return true;
    }
  }
  
  for (const pattern of permissions.patterns) {
    if (pattern.test(pathname)) {
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

function getFirstAccessibleRoute(role: string): string {
  const normalizedRole = normalizeRole(role);
  const permissions = ROLE_ROUTE_PERMISSIONS[normalizedRole as keyof typeof ROLE_ROUTE_PERMISSIONS];
  
  if (permissions && permissions.routes.length > 0) {
    // Return the first route (excluding /dashboard if there are others)
    const routes = permissions.routes.filter(r => r !== '/dashboard');
    return routes.length > 0 ? routes[0] : '/dashboard';
  }
  
  return '/dashboard';
}

function validateRedirectUrl(urlString: string, baseOrigin: string): { 
  valid: boolean; 
  reason?: string; 
} {
  try {
    const url = new URL(urlString);
    
    if (urlString.length > SECURITY_CONFIG.maxCallbackUrlLength) {
      return { valid: false, reason: 'URL too long' };
    }
    
    if (!SECURITY_CONFIG.allowedRedirectProtocols.includes(url.protocol)) {
      return { valid: false, reason: 'Invalid protocol' };
    }
    
    const hostname = url.hostname.toLowerCase();
    const isBlocked = SECURITY_CONFIG.blockedDomains.some(domain => {
      if (domain.startsWith('.')) {
        return hostname.endsWith(domain);
      } else if (domain.endsWith('.')) {
        return hostname.startsWith(domain);
      } else {
        return hostname === domain || hostname.includes(domain);
      }
    });
    
    if (isBlocked) {
      return { valid: false, reason: 'Blocked domain' };
    }
    
    if (url.origin !== baseOrigin && !urlString.startsWith('/')) {
      return { valid: false, reason: 'External redirect not allowed' };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, reason: 'Invalid URL format' };
  }
}

let lastLogTime = 0;
const LOG_THROTTLE_MS = 5000;

function logSecurityIncident(
  req: NextRequest, 
  type: string, 
  details: Record<string, any>
) {
  const now = Date.now();
  if (now - lastLogTime < LOG_THROTTLE_MS && process.env.NODE_ENV === 'production') {
    return;
  }
  lastLogTime = now;
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    type,
    path: req.nextUrl.pathname,
    method: req.method,
    ...details,
  };
  
  console.error('🔒 SECURITY INCIDENT:', logEntry);
}

// ============================================
// ⭐ MAIN PROXY FUNCTION - MIDDLEWARE ONLY
// ============================================

export default async function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;
  
  // ==========================================
  // FAST PATH: Skip checks for static assets
  // ==========================================
  if (shouldSkipAuth(pathname)) {
    return NextResponse.next();
  }

  // ==========================================
  // CHECK IF ROUTE IS PUBLIC
  // ==========================================
  const isPublic = isPublicRoute(pathname);
  
  // ==========================================
  // GET TOKEN
  // ==========================================
  let token = null;
  if (!isPublic) {
    try {
      token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    } catch (error) {
      console.error('Error getting token:', error);
    }
  }

  // ==========================================
  // HANDLE PUBLIC ROUTES
  // ==========================================
  if (isPublic) {
    // If user is logged in and trying to access login/register pages
    if (token && (
      pathname === '/login' || 
      pathname === '/belog' || 
      pathname === '/register' ||
      pathname === '/auth/signin' ||
      pathname === '/auth/signup'
    )) {
      // Redirect to role-specific default page
      const userRole = token.role || 'DEFAULT';
      const defaultPage = getDefaultRedirect(userRole);
      url.pathname = defaultPage;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // ==========================================
  // NO TOKEN - Redirect to login
  // ==========================================
  if (!token) {
    const redirectUrl = pathname + url.search;
    url.pathname = '/login';
    url.searchParams.set('callbackUrl', redirectUrl);
    return NextResponse.redirect(url);
  }

  // ==========================================
  // SECURITY: VALIDATE ALL REDIRECTS
  // ==========================================
  const callbackUrl = url.searchParams.get('callbackUrl');
  if (callbackUrl) {
    const validation = validateRedirectUrl(callbackUrl, req.nextUrl.origin);
    if (!validation.valid) {
      console.error(`🚨 SECURITY: ${validation.reason}`, callbackUrl);
      url.searchParams.delete('callbackUrl');
      
      logSecurityIncident(req, 'malicious_redirect', {
        attemptedUrl: callbackUrl,
        reason: validation.reason,
        userAgent: req.headers.get('user-agent'),
        ip: req.headers.get('x-forwarded-for') || req.ip,
      });
      
      const userRole = token.role || 'DEFAULT';
      const defaultPage = getDefaultRedirect(userRole);
      url.pathname = defaultPage;
      return NextResponse.redirect(url);
    }
  }

  // ==========================================
  // HANDLE PASSWORD CHANGE
  // ==========================================
  const passwordChanged = url.searchParams.get('passwordChanged') === 'true' || 
                         req.cookies.get('password-changed')?.value === 'true';
  
  if (passwordChanged && token) {
    console.log('🔄 Password change detected, refreshing session...');
    
    const response = NextResponse.next();
    response.cookies.delete('password-changed');
    url.searchParams.delete('passwordChanged');
    
    const headers = new Headers(req.headers);
    headers.set('x-force-session-refresh', 'true');
    
    return NextResponse.next({
      request: {
        headers,
      },
    });
  }

  // ==========================================
  // CHECK PASSWORD CHANGE REQUIREMENT
  // ==========================================
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

  // ==========================================
  // ⭐ STRICT ROLE-BASED ACCESS CONTROL
  // ==========================================
  const userRole = token.role || 'DEFAULT';
  const normalizedRole = normalizeRole(userRole);
  
  // Special case: Redirect root to role-specific default
  if (pathname === '/') {
    const defaultPage = getDefaultRedirect(normalizedRole);
    url.pathname = defaultPage;
    return NextResponse.redirect(url);
  }
  
  // Check if user has access to this route
  const hasAccess = hasRouteAccess(normalizedRole, pathname);
  
  if (!hasAccess) {
    // Log unauthorized access attempt
    console.warn(`🚫 ACCESS DENIED: ${normalizedRole} attempted to access ${pathname}`);
    
    logSecurityIncident(req, 'unauthorized_access', {
      role: normalizedRole,
      attemptedUrl: pathname,
      userId: token.id || token.email,
      userAgent: req.headers.get('user-agent'),
      ip: req.headers.get('x-forwarded-for') || req.ip,
    });
    
    // For API routes, return 403
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Access Denied: ${normalizedRole} does not have permission`,
          attemptedUrl: pathname
        },
        { status: 403 }
      );
    }
    
    // For page routes, redirect to role-specific default page
    const defaultPage = getDefaultRedirect(normalizedRole);
    url.pathname = defaultPage;
    // Remove any error parameters - clean redirect
    url.searchParams.delete('accessDenied');
    url.searchParams.delete('attemptedUrl');
    return NextResponse.redirect(url);
  }

  // ==========================================
  // ADD USER INFO TO HEADERS
  // ==========================================
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", token.id || "");
  requestHeaders.set("x-user-email", token.email || "");
  
  const encodedName = token.name ? encodeURIComponent(token.name) : "";
  requestHeaders.set("x-user-name", encodedName);
  requestHeaders.set("x-user-role", normalizedRole);
  requestHeaders.set("x-employee-id", token.employeeId || "");
  requestHeaders.set("x-requires-password-change", requiresPasswordChange.toString());

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// ==========================================
// EXPORT CONFIGURATION
// ==========================================

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

// ==========================================
// HELPER FUNCTIONS FOR SERVER COMPONENTS
// ==========================================

export function canUserAccessRoute(role: string, pathname: string): boolean {
  return hasRouteAccess(role, pathname);
}

export function getUserRoutes(role: string): string[] {
  const normalizedRole = normalizeRole(role);
  const permissions = ROLE_ROUTE_PERMISSIONS[normalizedRole as keyof typeof ROLE_ROUTE_PERMISSIONS];
  return permissions ? permissions.routes : ROLE_ROUTE_PERMISSIONS.DEFAULT.routes;
}

export function isPublicRoutePath(pathname: string): boolean {
  return isPublicRoute(pathname);
}

export function getUserDefaultRoute(role: string): string {
  return getDefaultRedirect(role);
}

export function getUserAccessibleRoutes(role: string): { routes: string[], patterns: RegExp[], defaultRedirect: string } {
  const normalizedRole = normalizeRole(role);
  const permissions = ROLE_ROUTE_PERMISSIONS[normalizedRole as keyof typeof ROLE_ROUTE_PERMISSIONS];
  
  if (!permissions) {
    return {
      ...ROLE_ROUTE_PERMISSIONS.DEFAULT,
      defaultRedirect: ROLE_ROUTE_PERMISSIONS.DEFAULT.defaultRedirect
    };
  }
  
  return {
    routes: [...permissions.routes],
    patterns: [...permissions.patterns],
    defaultRedirect: permissions.defaultRedirect
  };
}