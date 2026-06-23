// middleware.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { NextRequest } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import { checkIPBlocklist, recordFailedAttempt } from "@/lib/ip-blocklist";
import { validateRequest } from "@/lib/validate-request";
import { getSecurityHeaders } from "@/lib/security-headers";
import { logSecurityIncident } from "@/lib/security-logger";

// ============================================
// 1. ALL ROLES FROM SIDEBAR
// ============================================
type UserRole = 
  | 'ADMIN' 
  | 'SUPER_ADMIN' 
  | 'KITCHEN' 
  | 'FB' 
  | 'MARKETING' 
  | 'FINANCE' 
  | 'STOCK_MANAGER' 
  | 'PURCHASING' 
  | 'DELIVERY' 
  | 'POS' 
  | 'WAITRESS' 
  | 'DEFAULT';

// ============================================
// 2. PROTECTED SIDEBAR PAGES ONLY
// ============================================
const PROTECTED_PAGES = new Map<string, UserRole[]>([
  // Dashboard
  ['/dashboard', ['ADMIN']],
  
  // Stock Management
  ['/stock', ['ADMIN', 'FINANCE', 'STOCK_MANAGER', 'PURCHASING']],
  ['/scategory', ['ADMIN', 'FINANCE', 'STOCK_MANAGER']],
  ['/stockReport', ['ADMIN', 'FINANCE', 'STOCK_MANAGER', 'PURCHASING']],
  ['/purchase-request', ['ADMIN', 'FINANCE', 'STOCK_MANAGER', 'PURCHASING']],
  
  // Menu Management
  ['/items', ['ADMIN', 'FB']],
  ['/catagory', ['ADMIN', 'FB']],
  ['/healthy-menu', ['ADMIN']],
  ['/menu-profitability', ['ADMIN', 'FB']],
  
  // Orders
  ['/orders', ['ADMIN', 'KITCHEN']],
  ['/delivery', ['ADMIN', 'KITCHEN', 'DELIVERY']],
  
  // Marketing
  ['/blog', ['ADMIN', 'MARKETING']],
  ['/contents', ['ADMIN', 'MARKETING']],
  ['/applications', ['ADMIN', 'MARKETING']],
  
  // Finance
  ['/sales', ['ADMIN', 'FINANCE']],
  ['/expe', ['ADMIN', 'FINANCE']],
  ['/profit', ['ADMIN', 'FINANCE']],
  ['/expenses', ['FINANCE']],
  
  // HR & Training
  ['/training', ['ADMIN', 'KITCHEN', 'FB', 'MARKETING', 'FINANCE', 'STOCK_MANAGER', 'PURCHASING', 'DELIVERY', 'POS', 'WAITRESS']],
  ['/Pregister', ['ADMIN', 'FB']],
  ['/preparation', ['ADMIN', 'KITCHEN', 'FB']],
  ['/Sregister', ['ADMIN', 'FB']],
  ['/standards', ['ADMIN', 'KITCHEN', 'FB', 'MARKETING', 'FINANCE', 'STOCK_MANAGER', 'PURCHASING', 'DELIVERY', 'POS']],
  ['/staffregister', ['ADMIN']],
  ['/waitress', ['ADMIN']],
  ['/restaurants', ['ADMIN']],
  
  // POS & Tables
  ['/pos', ['ADMIN', 'POS', 'WAITRESS']],
  ['/edit', ['POS']],
  ['/myorders', ['POS', 'WAITRESS']],
  ['/table-arrangement', ['ADMIN', 'POS', 'WAITRESS']],
  
  // User
  ['/profile', ['ADMIN', 'KITCHEN', 'FB', 'MARKETING', 'FINANCE', 'STOCK_MANAGER', 'PURCHASING', 'DELIVERY', 'POS', 'WAITRESS']],
  
  // Tasks
  ['/daily-tasks', ['ADMIN', 'KITCHEN', 'FB', 'MARKETING', 'FINANCE', 'STOCK_MANAGER', 'PURCHASING', 'DELIVERY', 'POS', 'WAITRESS']],
  ['/feedback', ['MARKETING']],
  ['/search', ['ADMIN']],
  
  // Birthday
  ['/BirthDate', ['ADMIN']],
  ['/prizes', ['ADMIN']],
]);

// ============================================
// 3. PUBLIC PAGES - NO PERMISSION NEEDED
// ============================================
const PUBLIC_PAGES = [
  '/',
  '/about',
  '/blogs',
  '/contact',
  '/login',
  '/auth/signin',
  '/auth/error',
  '/auth/signout',
  '/unauthorized',
  '/menu',
  '/menu-items',
  '/gallery',
];

// ============================================
// 4. API ROUTES - EXCLUDED FROM PERMISSIONS
// ============================================
const API_ROUTES = [
  '/api/auth',
  '/api/auth/session',
  '/api/auth/csrf',
  '/api/auth/providers',
  '/api/auth/callback',
  '/api/auth/user-permissions',
  '/api/health',
  '/api/users/current',
  '/api/users',
  '/api/items',
  '/api/item-category',
  '/api/waitress',
  '/api/tables',
];

// ============================================
// 5. HELPER FUNCTIONS
// ============================================

// Helper to normalize role
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

// Get client IP address
function getClientIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
         req.headers.get('x-real-ip') || 
         'unknown';
}

// Check if page is public
function isPublicPage(pathname: string): boolean {
  if (PUBLIC_PAGES.includes(pathname)) return true;
  for (const page of PUBLIC_PAGES) {
    if (page !== '/' && pathname.startsWith(page)) return true;
  }
  return false;
}

// Check if path is an API route
function isApiRoute(pathname: string): boolean {
  if (!pathname.startsWith('/api/')) return false;
  for (const route of API_ROUTES) {
    if (pathname.startsWith(route)) return true;
  }
  return true; // All other API routes are allowed
}

// Get required roles for a path
function getRequiredRoles(pathname: string): UserRole[] | null {
  // Exact match
  if (PROTECTED_PAGES.has(pathname)) {
    return PROTECTED_PAGES.get(pathname)!;
  }
  
  // Prefix match for nested routes
  for (const [route, roles] of PROTECTED_PAGES) {
    if (pathname.startsWith(route + '/')) {
      return roles;
    }
  }
  
  return null;
}

// ============================================
// 6. MAIN PROXY FUNCTION
// ============================================
export async function proxy(req: NextRequest) {
  const clientIP = getClientIP(req);
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  // --- LAYER 1: IP BLOCKLIST ---
  const blockResponse = await checkIPBlocklist(req);
  if (blockResponse) {
    await logSecurityIncident(req, 'blocked_ip_access', {
      ip: clientIP,
      path: pathname,
    });
    return blockResponse;
  }

  // --- LAYER 2: RATE LIMITING ---
  const rateLimitResponse = await rateLimit(req);
  if (rateLimitResponse) {
    await logSecurityIncident(req, 'rate_limit_exceeded', {
      ip: clientIP,
      path: pathname,
    });
    return rateLimitResponse;
  }

  // --- LAYER 3: REQUEST VALIDATION ---
  const validation = validateRequest(req);
  if (!validation.valid) {
    await logSecurityIncident(req, 'suspicious_request', {
      ip: clientIP,
      reason: validation.reason,
      url: req.nextUrl.toString(),
    });
    await recordFailedAttempt(req);
    return NextResponse.json(
      { error: 'Invalid request', reason: validation.reason },
      { status: 400 }
    );
  }

  // --- LAYER 4: CHECK IF PAGE NEEDS PROTECTION ---
  // Skip protection for public pages and API routes
  if (isPublicPage(pathname) || isApiRoute(pathname)) {
    // For API routes, we don't need authentication
    // For public pages, just proceed
    return NextResponse.next();
  }

  // --- LAYER 5: AUTHENTICATION FOR PROTECTED PAGES ---
  const session = await auth();

  // If not authenticated, redirect to login
  if (!session?.user) {
    url.pathname = "/auth/signin";
    url.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(url);
  }

  // --- LAYER 6: AUTHORIZATION FOR PROTECTED PAGES ---
  const userRole = normalizeRole(session.user.role);
  const userId = session.user.id;

  // Admin and Super Admin can access everything
  if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
    // Add user headers
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-user-id", session.user.id || "");
    requestHeaders.set("x-user-email", session.user.email || "");
    requestHeaders.set("x-user-name", session.user.name ? encodeURIComponent(session.user.name) : "");
    requestHeaders.set("x-user-role", session.user.role || "DEFAULT");
    requestHeaders.set("x-employee-id", session.user.employeeId || "");

    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });

    // Add security headers
    const securityHeaders = getSecurityHeaders();
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }

  // Check if the route requires specific roles
  const requiredRoles = getRequiredRoles(pathname);
  
  if (requiredRoles) {
    // Check if user's role is in the allowed roles
    if (!requiredRoles.includes(userRole)) {
      // Log unauthorized access
      await logSecurityIncident(req, 'unauthorized_access', {
        userRole,
        userId,
        attemptedPath: pathname,
        userEmail: session.user.email,
        reason: `Role ${userRole} not allowed for ${pathname}. Required: ${requiredRoles.join(', ')}`,
      });
      
      await recordFailedAttempt(req);
      
      url.pathname = "/unauthorized";
      return NextResponse.redirect(url);
    }
  }

  // --- LAYER 7: ADD USER HEADERS ---
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", session.user.id || "");
  requestHeaders.set("x-user-email", session.user.email || "");
  requestHeaders.set("x-user-name", session.user.name ? encodeURIComponent(session.user.name) : "");
  requestHeaders.set("x-user-role", session.user.role || "DEFAULT");
  requestHeaders.set("x-employee-id", session.user.employeeId || "");

  // --- LAYER 8: SECURITY HEADERS ---
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const securityHeaders = getSecurityHeaders();
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

// ============================================
// 7. CONFIGURATION
// ============================================
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};