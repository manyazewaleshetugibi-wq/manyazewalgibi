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
  
  // Normalize role to lowercase for consistent matching
  const normalizedRole = role.toLowerCase().trim();
  
  // Otherwise, redirect based on role
  switch (normalizedRole) {
    case "admin":
      router.replace("/dashboard");
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
      router.replace("/blog");
      break;
    case "finance":
      router.replace("/sales");
      break;
    case "stock_manager":
      router.replace("/stock");
      break;
    case "purchasing":  // FIXED: Changed from "purchaser" to "purchasing"
      router.replace("/purchase-request");
      break;
    case "delivery":
      router.replace("/delivery");
      break;
    case "waitress":
      router.replace("/pos");
      break;
    case "customer":
      router.replace("/blogs");
      break;
    case "user":
      router.replace("/");
      break;
    default:
      // For unknown roles, redirect to home page with a warning
      console.warn(`Unknown role: ${role}, redirecting to home page`);
      router.replace("/");
  }
};