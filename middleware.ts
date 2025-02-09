import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const url = req.nextUrl.clone();

  const publicRoutes = new Set(["/about", "/", "/blogs", "/contact"]);

  if (!token) {
    if (url.pathname !== "/login" && !publicRoutes.has(url.pathname)) {
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (url.pathname === "/login") {
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  const userRole = token.role;
  const roleRoutes = {
    "KITCHEN": new Set(["/orders", "/training"]),
    "FB": new Set(["/training", "/items"]),
    "MARKETING": new Set(["/blog", "/contents", "/training"]),
    "FINANCE": new Set(["/expenses", "/training"]),
    "STOCK_MANAGER": new Set(["/training", "/stock"]),
    "POS": new Set(["/pos", "/training"]),
    "ADMIN": new Set(["/kitchen", "/fb", "/marketing", "/finance", "/stock", "/orders", "/training", "/blog", "/contents", "/items", "/expenses", "/pos"]),
  };

  const allowedRoutes = roleRoutes[userRole] || new Set();
  
  if (![...allowedRoutes].some(route => url.pathname.startsWith(route))) {
    url.pathname = "/unauthorized";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/kitchen/:path*", "/fb/:path*", "/marketing/:path*", "/finance/:path*", "/stock/:path*", "/orders/:path*", "/training/:path*", "/blog/:path*", "/contents/:path*", "/items/:path*", "/expenses/:path*", "/pos/:path*"
  ],
};
