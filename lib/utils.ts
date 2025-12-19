import { clsx, type ClassValue } from "clsx"
import { NextResponse } from "next/server";
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const createResponse = (status: number, success: boolean, message: string, data: any = null) => {
  return NextResponse.json({ success, message, data }, { status });
};
// @/lib/utils.ts - Updated redirectByRole function
export const redirectByRole = (role: string, router: any, requiresPasswordChange: boolean) => {
  // If password change is required, redirect to change-password page
  if (requiresPasswordChange) {
    router.replace("/change-password");
    return;
  }
  
  // Otherwise, redirect based on role
  switch (role.toLowerCase()) {
    case "admin":
      router.replace("/dashboard"); // Changed from "/dashboard" to "/admin/dashboard"
      break;
    case "pos":
      router.replace("/pos");
      break;
    case "kitchen":
      router.replace("/orders");
      break;
    case "fb":
    case "f&b":
      router.replace("/items");
      break;
    case "marketing":
      router.replace("/blog"); // Changed from "/blog" to "/marketing/dashboard"
      break;
    case "finance":
      router.replace("/sales");
      break;
    case "stock_manager":
      router.replace("/stock");
      break;
    default:
      router.replace("/"); // Changed from "/" to "/dashboard"
  }
};