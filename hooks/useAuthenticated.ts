import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth"; // Adjust the import path for your auth configuration

type Role = "POS" | "KITCHEN" | "FB" | "MARKETING" | "ADMIN" | "CUSTOMER" | "FINANCE" | "STOCK_MANAGER" | "ALL";

export const withAuthenticated = async (req: NextRequest, allowedRole: Role) => {
  const session = await auth();

  if (!session) {
    return NextResponse.redirect("/login");
  }

  const userRole = session.user?.role as Role;

  if (allowedRole !== "ALL" && userRole !== allowedRole) {
    return NextResponse.redirect("/unauthorized");
  }

  return {
    isAuthenticated: true,
    session,
  };
};
