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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/lol/:path*",
    "/jsda/:path*",
    "/dsa/:path*",
    "/fda/:path*",
    "/fda/:path*",
    "/dfa/:path*",
    "/fdafd/:path*",
  ],
};
