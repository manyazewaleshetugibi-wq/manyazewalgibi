import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

// ============================================
// PROXY / MIDDLEWARE - SERVER-SIDE AUTH GATE
// ============================================

// Internal / static prefixes that never require auth
const SKIP_PREFIXES = [
  "/_next",
  "/favicon.ico",
  "/manifest.json",
  "/robots.txt",
  "/sitemap.xml",
];

// Public page routes (accessible without login)
const PUBLIC_PAGES = [
  "/home",
  "/about",
  "/blogs",
  "/contact",
  "/contactus",
  "/login",
  "/register",
  "/change-password",
  "/attendance/clock",
  "/auth/error",
];

// Public API routes. `methods` empty/undefined = all methods allowed.
// Order matters: more specific prefixes must come first.
const PUBLIC_API_RULES: { prefix: string; methods?: string[] }[] = [
  { prefix: "/api/auth" }, // NextAuth handlers + password change + registration
  { prefix: "/api/cron" }, // scheduled Vercel cron jobs (no session)
  { prefix: "/api/user/register", methods: ["POST"] }, // public account registration
  { prefix: "/api/user/validate-inviter", methods: ["GET"] },
  { prefix: "/api/attendance/staff/lookup", methods: ["POST"] },
  { prefix: "/api/attendance", methods: ["POST"] }, // clock-in kiosk
  { prefix: "/api/webauthn" }, // passkey clock-in flows
  { prefix: "/api/blog", methods: ["GET"] }, // public blog reading only
  { prefix: "/api/items", methods: ["GET"] }, // public menu items
  { prefix: "/api/item-category", methods: ["GET"] }, // public menu categories
  { prefix: "/api/waitress", methods: ["GET"] }, // public waitress list
  { prefix: "/api/order", methods: ["POST"] }, // landing page ordering
  { prefix: "/api/delivery", methods: ["POST"] }, // landing page delivery booking
  { prefix: "/api/tables/arrangement", methods: ["GET"] }, // public table lookup
];

// Roles that are never allowed into protected areas (web customers)
const BLOCKED_ROLES = ["customer"];

// Endpoints reachable while a password change is pending
const PASSWORD_CHANGE_ENDPOINTS = [
  "/api/auth/change-password-first",
  "/api/auth/session",
  "/api/auth/signout",
];

function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

function isPublicPage(pathname: string): boolean {
  if (pathname === "/") return true;
  return startsWithAny(pathname, PUBLIC_PAGES);
}

function isPublicApi(pathname: string, method: string): boolean {
  for (const rule of PUBLIC_API_RULES) {
    if (
      pathname === rule.prefix ||
      pathname.startsWith(rule.prefix + "/")
    ) {
      if (!rule.methods || rule.methods.includes(method)) return true;
    }
  }
  return false;
}

// ============================================
// MAIN PROXY HANDLER
// ============================================

export default async function proxy(req: NextRequest) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;
  const method = req.method;

  // Handle legacy semicolon-as-path-separator URLs (table QR flows)
  if (pathname.includes(";")) {
    const tableMatch = pathname.match(/;?(?:[?&])?table=([^&]+)/);
    if (tableMatch) {
      url.pathname = "/";
      url.search = "?table=" + tableMatch[1];
      return NextResponse.redirect(url);
    }
  }

  // Internal / static assets always pass through
  if (startsWithAny(pathname, SKIP_PREFIXES)) {
    return NextResponse.next();
  }

  const isApi = pathname.startsWith("/api/");

  // Public routes pass through without auth
  if (isApi) {
    if (isPublicApi(pathname, method)) return NextResponse.next();
  } else if (isPublicPage(pathname)) {
    return NextResponse.next();
  }

  // ============================================
  // PROTECTED ROUTES - require authentication
  // ============================================

  let token = null;
  try {
    token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  } catch (error) {
    console.error("Error reading session token:", error);
  }

  if (!token) {
    if (isApi) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required",
          error: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    url.pathname = "/login";
    url.searchParams.set("callbackUrl", pathname + url.search);
    return NextResponse.redirect(url);
  }

  // Block web-customer accounts from protected areas
  const role = String(token.role || "").toLowerCase();
  if (BLOCKED_ROLES.includes(role)) {
    if (isApi) {
      return NextResponse.json(
        {
          success: false,
          message: "This account does not have access",
          error: "FORBIDDEN",
        },
        { status: 403 }
      );
    }
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Force password change gate
  if (token.requiresPasswordChange === true) {
    const isAllowed = startsWithAny(
      pathname,
      PASSWORD_CHANGE_ENDPOINTS
    );
    if (!isAllowed) {
      if (isApi) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Password change required before accessing this resource",
            requiresPasswordChange: true,
          },
          { status: 403 }
        );
      }

      url.pathname = "/change-password";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // Inject identity headers for downstream API handlers
  if (isApi) {
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-user-id", String(token.id || ""));
    requestHeaders.set("x-user-email", String(token.email || ""));
    requestHeaders.set("x-user-role", role);
    requestHeaders.set("x-employee-id", String(token.employeeId || ""));
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|mp3|mp4|woff2?|ttf|otf|eot|pdf)$).*)",
  ],
};
