import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import bcrypt from "bcrypt"
import { MongoClient, ObjectId } from "mongodb"
import type { UserRole } from "@/models/User"

/**
 * SAFE ENV ACCESS (NO "!" ASSERTIONS)
 */
const MONGODB_URI = process.env.MONGODB_URI
const DATABASE_NAME = process.env.DATABASE_NAME
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET

if (!DATABASE_NAME || !NEXTAUTH_SECRET) {
  console.warn("Missing required auth environment variables")
}

/**
 * GLOBAL MONGO SINGLETON (Vercel-safe)
 */
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

let clientPromise: Promise<MongoClient>

// ONLY create client if URI exists
if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is missing")
}

if (!global._mongoClientPromise) {
  const client = new MongoClient(MONGODB_URI)
  global._mongoClientPromise = client.connect()
}

clientPromise = global._mongoClientPromise

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  adapter: MongoDBAdapter(clientPromise, {
    databaseName: DATABASE_NAME!,
  }),

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
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required")
        }

        const dbClient = await clientPromise
        const db = dbClient.db(DATABASE_NAME!)

        const user = await db.collection("users").findOne({
          email: credentials.email.toLowerCase().trim(),
        })

        if (!user) throw new Error("Invalid credentials")

        if (user.status && user.status !== "active") {
          throw new Error("Account is not active")
        }

        if (!user.password) throw new Error("Invalid credentials")

        const validPassword = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!validPassword) {
          const attempts = (user.loginAttempts || 0) + 1

          await db.collection("users").updateOne(
            { _id: user._id },
            {
              $set: {
                loginAttempts: attempts,
                lastLogin: new Date(),
              },
            }
          )

          throw new Error("Invalid credentials")
        }

        await db.collection("users").updateOne(
          { _id: user._id },
          {
            $set: {
              loginAttempts: 0,
              lastLogin: new Date(),
            },
          }
        )

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name || user.email,
          role: (user.role || "user") as UserRole,
          image: user.image || null,
          employeeId: user.employeeId || "",
          permissions: user.permissions || [],
          requiresPasswordChange:
            user.requiresPasswordChange !== undefined
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
        trigger === "update" &&
        session?.requiresPasswordChange !== undefined
      ) {
        token.requiresPasswordChange = session.requiresPasswordChange
      }

      if (token.id) {
        try {
          const dbClient = await clientPromise
          const db = dbClient.db(DATABASE_NAME!)

          const latestUser = await db.collection("users").findOne(
            { _id: new ObjectId(token.id as string) },
            { projection: { requiresPasswordChange: 1 } }
          )

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
