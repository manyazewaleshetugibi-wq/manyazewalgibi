import { signOut } from "next-auth/react";

export const logoutAndRedirect = async (router: any) => {
  // Clear any stored data
  localStorage.removeItem("rememberedEmail");
  
  // Sign out from NextAuth
  await signOut({ callbackUrl: "/login" });
};

export const redirectBasedOnRole = (role: string, router: any, requiresPasswordChange: boolean) => {
  // If password change is required, redirect to change-password page
  if (requiresPasswordChange) {
    router.replace("/change-password");
    return;
  }
  
  // Otherwise, redirect based on role
  switch (role.toLowerCase()) {
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
    case "other":
      router.replace("/Culture");
      break;
      case "user":
        router.replace("/dashboard");
        break;
    default:
      router.replace("/");
  }
};