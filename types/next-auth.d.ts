import NextAuth from "next-auth";
import { UserRole } from "@/types/user";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      employeeId?: string;
      shift?: string;
      specialization?: string;
      permissions: string[];
      requiresPasswordChange: boolean;
      image?: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    employeeId?: string;
    shift?: string;
    specialization?: string;
    permissions: string[];
    requiresPasswordChange: boolean;
    image?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    employeeId?: string;
    shift?: string;
    specialization?: string;
    permissions: string[];
    requiresPasswordChange: boolean;
    image?: string;
  }
}