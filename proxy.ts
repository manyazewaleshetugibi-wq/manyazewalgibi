import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

// Security configuration
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

// Security helper functions
function validateRedirectUrl(urlString: string, baseOrigin: string): { 
  valid: boolean; 
  reason?: string; 
} {
  try {
    const url = new URL(urlString);
    
    // 1. Check length
    if (urlString.length > SECURITY_CONFIG.maxCallbackUrlLength) {
      return { valid: false, reason: 'URL too long' };
    }
    
    // 2. Check protocol
    if (!SECURITY_CONFIG.allowedRedirectProtocols.includes(url.protocol)) {
      return { valid: false, reason: 'Invalid protocol' };
    }
    
    // 3. Check against blocked domains
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
    
    // 4. Ensure it's same-origin or relative
    if (url.origin !== baseOrigin && !urlString.startsWith('/')) {
      return { valid: false, reason: 'External redirect not allowed' };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, reason: 'Invalid URL format' };
  }
}

function logSecurityIncident(
  req: NextRequest, 
  type: string, 
  details: Record<string, any>
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type,
    path: req.nextUrl.pathname,
    method: req.method,
    ...details,
  };
  
  console.error('🔒 SECURITY INCIDENT:', logEntry);
}

// Main function - use 'proxy' as function name for Next.js 16
// If you want to keep 'middleware' name, just rename the file back to middleware.ts
export async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const url = req.nextUrl.clone();
  
  // === SECURITY: VALIDATE ALL REDIRECTS ===
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
      
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }
  
  // Public routes that don't require authentication
  const publicRoutes = [
    "/",
    "/about", 
    "/blogs", 
    "/contact",
    "/login",
    "/auth/error",
    "/api/auth",
    "/api/auth/change-password-first",
    "/_next/",
    "/favicon.ico"
  ];

  // Check if current path is public
  const isPublicPath = publicRoutes.some(route => 
    url.pathname.startsWith(route)
  );

  // No token - redirect to login for protected routes
  if (!token) {
    if (!isPublicPath && !url.pathname.startsWith("/auth/")) {
      url.pathname = "/auth/signin";
      url.searchParams.set("callbackUrl", req.url);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // If already logged in and trying to access login page
  if (url.pathname === "/auth/signin" || url.pathname === "/auth/error") {
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // 🔴 CRITICAL: Handle password change completion
  // Check if password was just changed (via cookie or query param)
  const passwordChanged = url.searchParams.get('passwordChanged') === 'true' || 
                         req.cookies.get('password-changed')?.value === 'true';
  
  if (passwordChanged && token) {
    console.log('🔄 Password change detected, refreshing session...');
    
    // Clear the cookie if it exists
    const response = NextResponse.next();
    response.cookies.delete('password-changed');
    
    // Remove query param
    url.searchParams.delete('passwordChanged');
    
    // Force a session refresh by calling updateSession
    // This will trigger the JWT callback with trigger: "update"
    const headers = new Headers(req.headers);
    headers.set('x-force-session-refresh', 'true');
    
    return NextResponse.next({
      request: {
        headers,
      },
    });
  }

  // Check if password change is required
  const requiresPasswordChange = token.requiresPasswordChange === true;

  // If password change is required, redirect to change-password page
  if (requiresPasswordChange && url.pathname !== "/change-password") {
    // Allow access to change-password API
    if (url.pathname.startsWith("/api/auth/change-password-first")) {
      return NextResponse.next();
    }
    
    // Allow access to logout
    if (url.pathname.startsWith("/api/auth/signout")) {
      return NextResponse.next();
    }

    // Allow access to session endpoint so client can detect the flag without error
    if (url.pathname.startsWith("/api/auth/session")) {
      return NextResponse.next();
    }
    
    // Block access to other pages/APIs (except static files)
    if (url.pathname.startsWith("/api/") || 
        (!url.pathname.startsWith("/_next/") && !url.pathname.startsWith("/favicon.ico"))) {
      
      if (url.pathname.startsWith("/api/")) {
        return NextResponse.json(
          { 
            success: false, 
            message: "Password change required before accessing this resource",
            requiresPasswordChange: true
          },
          { status: 403 }
        );
      }
      
      // Redirect to change-password page for non-API routes
      url.pathname = "/change-password";
      return NextResponse.redirect(url);
    }
  }

  // ⭐ FIX: Add user info to headers with proper encoding for Ethiopian characters
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", token.id || "");
  requestHeaders.set("x-user-email", token.email || "");
  
  // Encode name to handle non-ASCII characters (ሀሁ, አማርኛ, ትግርኛ, etc.)
  // This prevents the "Cannot convert argument to a ByteString" error
  const encodedName = token.name ? encodeURIComponent(token.name) : "";
  requestHeaders.set("x-user-name", encodedName);
  
  requestHeaders.set("x-user-role", token.role || "");
  requestHeaders.set("x-employee-id", token.employeeId || "");
  requestHeaders.set("x-requires-password-change", requiresPasswordChange.toString());

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// For App Router, use route segment config instead of export config
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};