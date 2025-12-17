import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      employeeId?: string
      shift?: string
      specialization?: string
    }
  }

  interface User {
    role: string
    employeeId?: string
    shift?: string
    specialization?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    id: string
    employeeId?: string
    shift?: string
    specialization?: string
  }
}