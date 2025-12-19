import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const url = req.nextUrl.clone();

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

  // Add user info to headers for API routes
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", token.id || "");
  requestHeaders.set("x-user-email", token.email || "");
  requestHeaders.set("x-user-name", token.name || "");
  requestHeaders.set("x-user-role", token.role || "");
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
    /*
     * Match all request paths except for:
     * 1. /api/auth (NextAuth API routes)
     * 2. /_next/static (static files)
     * 3. /_next/image (image optimization files)
     * 4. /favicon.ico (favicon file)
     * 5. Public routes defined above
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};