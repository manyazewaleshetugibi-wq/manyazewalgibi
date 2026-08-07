import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"
import type { UserRole } from "@/models/User"

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET

if (!NEXTAUTH_SECRET) {
  console.warn("Missing required auth environment variables")
}

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  secret: NEXTAUTH_SECRET!,

  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },

  pages: {
    signIn: "/login",
    error: "/auth/error",
  },

  providers: [
    Credentials({
      name: "credentials",

      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        const email = credentials?.email
        const password = credentials?.password

        if (typeof email !== "string" || typeof password !== "string") {
          throw new Error("Email and password required")
        }

        const user = await prisma.user.findFirst({
          where: {
            email: email.toLowerCase().trim(),
          },
        })

        if (!user) throw new Error("Invalid credentials")

        if (user.status && user.status !== "active") {
          throw new Error("Account is not active")
        }

        if (!user.password) throw new Error("Invalid credentials")

        const validPassword = await bcrypt.compare(password, user.password)

        if (!validPassword) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              loginAttempts: (user.loginAttempts || 0) + 1,
              lastLogin: new Date(),
            },
          })

          throw new Error("Invalid credentials")
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            loginAttempts: 0,
            lastLogin: new Date(),
          },
        })

        return {
          id: user.id,
          email: user.email || "",
          name: user.name || user.email || "",
          role: (user.role || "user") as UserRole,
          image: user.image || undefined,
          employeeId: user.employeeId || "",
          permissions: user.permissions || [],
          requiresPasswordChange:
            user.requiresPasswordChange != null
              ? user.requiresPasswordChange
              : true,
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.employeeId = user.employeeId
        token.permissions = user.permissions
        token.requiresPasswordChange = user.requiresPasswordChange
      }

      if (
        typeof token.picture === "string" &&
        (token.picture.startsWith("data:") || token.picture.length > 2048)
      ) {
        delete token.picture
      }

      if (
        trigger === "update" &&
        session?.requiresPasswordChange !== undefined
      ) {
        token.requiresPasswordChange = session.requiresPasswordChange
      }

      if (token.id) {
        try {
          const latestUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { requiresPasswordChange: true },
          })

          if (latestUser) {
            token.requiresPasswordChange =
              latestUser.requiresPasswordChange || false
          }
        } catch (err) {
          console.error("JWT refresh error:", err)
        }
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
        session.user.employeeId = token.employeeId as string
        session.user.permissions = token.permissions as string[]
        session.user.requiresPasswordChange =
          token.requiresPasswordChange as boolean
      }

      return session
    },
  },

  trustHost: true,
  debug: process.env.NODE_ENV === "development",
})
