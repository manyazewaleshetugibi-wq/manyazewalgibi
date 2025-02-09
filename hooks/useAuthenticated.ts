import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust the import path for your auth configuration

type Role = "POS" | "KITCHEN" | "FB" | "MARKETING" | "ADMIN" | "CUSTOMER" | "FINANCE" | "STOCK_MANAGER" | "ALL";

export const withAuthenticated = async (req: NextRequest, allowedRole: Role) => {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.redirect("/auth/signin");
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
