// proxy.ts - COMPLETE FIXED VERSION
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { NextRequest } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import { checkIPBlocklist, recordFailedAttempt } from "@/lib/ip-blocklist";
import { validateRequest } from "@/lib/validate-request";
import { getSecurityHeaders } from "@/lib/security-headers";
import { 
  logSecurityIncident, 
  logLogin, 
  logLogout, 
  logPageView, 
  logAPIAccess 
} from "@/lib/security-logger";
import { getClientIP } from "@/lib/ip-utils";
import { csrfProtection, addCSRFToken } from "@/lib/csrf";
import { refreshSessionIfNeeded } from "@/lib/refresh-session";

type UserRole = 
  | 'ADMIN' | 'SUPER_ADMIN' | 'KITCHEN' | 'FB' | 'MARKETING' 
  | 'FINANCE' | 'STOCK_MANAGER' | 'PURCHASING' | 'DELIVERY' 
  | 'POS' | 'WAITRESS' | 'DEFAULT';

// ============================================
// PROTECTED PAGES WITH ROLE REQUIREMENTS
// ============================================
const PROTECTED_PAGES = new Map<string, UserRole[]>([
  ['/dashboard', ['ADMIN']],
  ['/stock', ['ADMIN', 'FINANCE', 'STOCK_MANAGER', 'PURCHASING']],
  ['/scategory', ['ADMIN', 'FINANCE', 'STOCK_MANAGER']],
  ['/stockReport', ['ADMIN', 'FINANCE', 'STOCK_MANAGER', 'PURCHASING']],
  ['/purchase-request', ['ADMIN', 'FINANCE', 'STOCK_MANAGER', 'PURCHASING']],
  ['/items', ['ADMIN', 'FB']],
  ['/catagory', ['ADMIN', 'FB']],
  ['/healthy-menu', ['ADMIN']],
  ['/menu-profitability', ['ADMIN', 'FB']],
  ['/orders', ['ADMIN', 'KITCHEN']],
  ['/delivery', ['ADMIN', 'KITCHEN', 'DELIVERY']],
  ['/blog', ['ADMIN', 'MARKETING']],
  ['/contents', ['ADMIN', 'MARKETING']],
  ['/applications', ['ADMIN', 'MARKETING']],
  ['/sales', ['ADMIN', 'FINANCE']],
  ['/expe', ['ADMIN', 'FINANCE']],
  ['/profit', ['ADMIN', 'FINANCE']],
  ['/expenses', ['FINANCE']],
  ['/training', ['ADMIN', 'KITCHEN', 'FB', 'MARKETING', 'FINANCE', 'STOCK_MANAGER', 'PURCHASING', 'DELIVERY', 'POS', 'WAITRESS']],
  ['/Pregister', ['ADMIN', 'FB']],
  ['/preparation', ['ADMIN', 'KITCHEN', 'FB']],
  ['/Sregister', ['ADMIN', 'FB']],
  ['/standards', ['ADMIN', 'KITCHEN', 'FB', 'MARKETING', 'FINANCE', 'STOCK_MANAGER', 'PURCHASING', 'DELIVERY', 'POS']],
  ['/staffregister', ['ADMIN']],
  ['/waitress', ['ADMIN']],
  ['/restaurants', ['ADMIN']],
  ['/pos', ['ADMIN', 'POS', 'WAITRESS']],
  ['/edit', ['POS']],
  ['/myorders', ['POS', 'WAITRESS']],
  ['/table-arrangement', ['ADMIN', 'POS', 'WAITRESS']],
  ['/profile', ['ADMIN', 'KITCHEN', 'FB', 'MARKETING', 'FINANCE', 'STOCK_MANAGER', 'PURCHASING', 'DELIVERY', 'POS', 'WAITRESS']],
  ['/daily-tasks', ['ADMIN', 'KITCHEN', 'FB', 'MARKETING', 'FINANCE', 'STOCK_MANAGER', 'PURCHASING', 'DELIVERY', 'POS', 'WAITRESS']],
  ['/feedback', ['MARKETING']],
  ['/search', ['ADMIN']],
  ['/BirthDate', ['ADMIN']],
  ['/prizes', ['ADMIN']],
]);

// ============================================
// PUBLIC PAGES (NO AUTH REQUIRED)
// ============================================
const PUBLIC_PAGES = [
  '/', '/about', '/blogs', '/contact', '/login',
  '/auth/signin', '/auth/error', '/auth/signout',
  '/unauthorized', '/menu', '/menu-items', '/gallery',
  '/api/health', // Health check endpoints
];

// ============================================
// EXCLUDED API ROUTES
// ============================================
const EXCLUDED_API_ROUTES = [
  '/api/auth', '/api/auth/session', '/api/auth/csrf',
  '/api/auth/providers', '/api/auth/callback',
  '/api/auth/user-permissions', '/api/health',
  '/api/users/current', '/api/users', '/api/items',
  '/api/item-category', '/api/waitress', '/api/tables',
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function normalizeRole(role: string | undefined): UserRole {
  if (!role) return 'DEFAULT';
  const upperRole = role.toUpperCase();
  const validRoles: UserRole[] = [
    'ADMIN', 'SUPER_ADMIN', 'KITCHEN', 'FB', 'MARKETING',
    'FINANCE', 'STOCK_MANAGER', 'PURCHASING', 'DELIVERY',
    'POS', 'WAITRESS', 'DEFAULT'
  ];
  return validRoles.includes(upperRole as UserRole) ? (upperRole as UserRole) : 'DEFAULT';
}

function isPublicPage(pathname: string): boolean {
  if (PUBLIC_PAGES.includes(pathname)) return true;
  for (const page of PUBLIC_PAGES) {
    if (page !== '/' && pathname.startsWith(page)) return true;
  }
  return false;
}

function isExcludedApiRoute(pathname: string): boolean {
  for (const route of EXCLUDED_API_ROUTES) {
    if (pathname.startsWith(route)) return true;
  }
  return false;
}

function getRequiredRoles(pathname: string): UserRole[] | null {
  if (PROTECTED_PAGES.has(pathname)) {
    return PROTECTED_PAGES.get(pathname)!;
  }
  for (const [route, roles] of PROTECTED_PAGES) {
    if (pathname.startsWith(route + '/')) {
      return roles;
    }
  }
  return null;
}

// ============================================
// MAIN PROXY FUNCTION
// ============================================
export async function proxy(req: NextRequest) {
  const clientIP = getClientIP(req);
  const pathname = req.nextUrl.pathname;
  const method = req.method;
  const isApi = pathname.startsWith('/api/');

  // --- LAYER 1: IP BLOCKLIST ---
  const blockResponse = await checkIPBlocklist(req);
  if (blockResponse) {
    await logSecurityIncident(req, 'blocked_ip_access', {
      ip: clientIP,
      path: pathname,
    }, 'critical');
    return blockResponse;
  }

  // --- LAYER 2: RATE LIMITING ---
  const rateLimitResponse = await rateLimit(req);
  if (rateLimitResponse) {
    await logSecurityIncident(req, 'rate_limit_exceeded', {
      ip: clientIP,
      path: pathname,
    }, 'warning');
    await recordFailedAttempt(req);
    return rateLimitResponse;
  }

  // --- LAYER 3: REQUEST VALIDATION ---
  const validation = validateRequest(req);
  if (!validation.valid) {
    await logSecurityIncident(req, 'suspicious_request', {
      ip: clientIP,
      reason: validation.reason,
      details: validation.details,
      url: req.nextUrl.toString(),
    }, 'error');
    await recordFailedAttempt(req);
    return NextResponse.json(
      { error: 'Invalid request', reason: validation.reason },
      { status: 400 }
    );
  }

  // --- LAYER 4: CSRF PROTECTION (NEW) ---
  const csrfResponse = await csrfProtection(req);
  if (csrfResponse) {
    await logSecurityIncident(req, 'csrf_attack', {
      ip: clientIP,
      path: pathname,
      method: method,
    }, 'error');
    return csrfResponse;
  }

  // --- LAYER 5: SESSION REFRESH (NEW) ---
  const sessionRefreshResponse = await refreshSessionIfNeeded(req);
  if (sessionRefreshResponse) {
    // Session needs refresh - let NextAuth handle it
    return sessionRefreshResponse;
  }

  // --- LAYER 6: CHECK IF PUBLIC/EXCLUDED ---
  if (isPublicPage(pathname)) {
    const response = NextResponse.next();
    const securityHeaders = getSecurityHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    // ✅ Add CSRF token for forms
    addCSRFToken(response);
    
    // Log page view for public pages (with sampling)
    await logPageView(req);
    return response;
  }

  if (isExcludedApiRoute(pathname)) {
    const response = NextResponse.next();
    const securityHeaders = getSecurityHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    // Log API access for excluded routes
    await logAPIAccess(req);
    return response;
  }

  // --- LAYER 7: AUTHENTICATION ---
  const session = await auth();
  
  if (!session?.user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", req.url);
    await logSecurityIncident(req, 'unauthorized_access', {
      ip: clientIP,
      path: pathname,
      reason: 'Not authenticated',
    }, 'warning');
    return NextResponse.redirect(url);
  }

  // --- LAYER 8: LOGIN SUCCESS LOGGING ---
  if (pathname === '/api/auth/callback' || pathname === '/login') {
    await logLogin(req, {
      id: session.user.id || '',
      email: session.user.email || '',
      role: session.user.role || 'DEFAULT',
      name: session.user.name || '',
    }, true);
  }

  // --- LAYER 9: AUTHORIZATION ---
  const userRole = normalizeRole(session.user.role);
  const userId = session.user.id;
  const userEmail = session.user.email || '';
  const userName = session.user.name || '';

  // Admin/Super Admin bypass
  if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
    const response = NextResponse.next({
      request: {
        headers: new Headers({
          ...Object.fromEntries(req.headers),
          'x-user-id': session.user.id || '',
          'x-user-email': session.user.email || '',
          'x-user-name': session.user.name ? encodeURIComponent(session.user.name) : '',
          'x-user-role': session.user.role || 'DEFAULT',
          'x-employee-id': session.user.employeeId || '',
          'x-client-ip': clientIP,
        }),
      },
    });
    
    const securityHeaders = getSecurityHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    // ✅ Add CSRF token
    addCSRFToken(response);
    
    // Log page view for authenticated users
    if (!isApi) {
      await logPageView(req, {
        id: userId,
        email: session.user.email || '',
        role: userRole,
        name: session.user.name || '',
      });
    } else {
      await logAPIAccess(req, {
        id: userId,
        email: session.user.email || '',
        role: userRole,
        name: session.user.name || '',
      });
    }
    
    return response;
  }

  // Check role-based access
  const requiredRoles = getRequiredRoles(pathname);
  if (requiredRoles && !requiredRoles.includes(userRole)) {
    await logSecurityIncident(req, 'unauthorized_access', {
      userRole,
      userId,
      attemptedPath: pathname,
      userEmail,
      ip: clientIP,
      reason: `Role ${userRole} not allowed for ${pathname}. Required: ${requiredRoles.join(', ')}`,
    }, 'error');
    await recordFailedAttempt(req);
    
    const url = req.nextUrl.clone();
    url.pathname = "/unauthorized";
    return NextResponse.redirect(url);
  }

  // --- LAYER 10: FINAL RESPONSE WITH HEADERS ---
  const response = NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(req.headers),
        'x-user-id': session.user.id || '',
        'x-user-email': session.user.email || '',
        'x-user-name': session.user.name ? encodeURIComponent(session.user.name) : '',
        'x-user-role': session.user.role || 'DEFAULT',
        'x-employee-id': session.user.employeeId || '',
        'x-client-ip': clientIP,
      }),
    },
  });

  const securityHeaders = getSecurityHeaders();
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // ✅ Add CSRF token
  addCSRFToken(response);

  // Log page view for authenticated users
  if (!isApi) {
    await logPageView(req, {
      id: userId,
      email: session.user.email || '',
      role: userRole,
      name: session.user.name || '',
    });
  } else {
    await logAPIAccess(req, {
      id: userId,
      email: session.user.email || '',
      role: userRole,
      name: session.user.name || '',
    });
  }

  return response;
}

// ============================================
// CONFIGURATION
// ============================================
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|mp4|webm|woff2?|ttf|otf|eot|pdf)).*)",
  ],
};