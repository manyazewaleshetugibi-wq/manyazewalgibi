import NextAuth, { type NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { MongoDBAdapter } from "@next-auth/mongodb-adapter"
import bcrypt from "bcrypt"
import { MongoClient, ObjectId } from "mongodb"
import { UserRole } from "@/models/User"

// HARDCODED CONFIGURATION
const MONGODB_URI = process.env.MONGODB_URI || "";
const DATABASE_NAME = process.env.MONGODB_DATABASE || "";
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "";
const NEXTAUTH_URL = process.env.NEXTAUTH_URL;

// Build-safe MongoDB client promise
function getClientPromise() {
  // During build phase, return a mock client
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.log("🔨 Build phase detected - using mock MongoDB client");
    return Promise.resolve({
      db: () => ({
        collection: () => ({
          findOne: () => Promise.resolve(null),
          updateOne: () => Promise.resolve({ modifiedCount: 0 }),
        })
      }),
      close: () => Promise.resolve()
    } as unknown as MongoClient);
  }
  
  // If no MongoDB URI, return a rejected promise
  if (!MONGODB_URI) {
    console.warn("⚠️ MONGODB_URI is not set");
    return Promise.reject(new Error("MongoDB URI is required"));
  }
  
  // Create real MongoDB connection
  console.log("🔌 Connecting to MongoDB");
  const client = new MongoClient(MONGODB_URI);
  return client.connect();
}

const clientPromise = getClientPromise();

// Build-safe MongoDB adapter
function getAdapter() {
  // During build phase, return undefined adapter
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.log("🔨 Build phase - skipping MongoDB adapter");
    return undefined;
  }
  
  // If no MongoDB URI, return undefined
  if (!MONGODB_URI) {
    console.warn("⚠️ MONGODB_URI missing - skipping MongoDB adapter");
    return undefined;
  }
  
  // Return real MongoDB adapter
  return MongoDBAdapter(clientPromise, {
    databaseName: DATABASE_NAME
  });
}

export const authOptions: NextAuthOptions = {
  adapter: getAdapter(),
  secret: NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<any> {
        // During build phase, return null
        if (process.env.NEXT_PHASE === 'phase-production-build') {
          console.log("🔨 Build phase - skipping authentication");
          return null;
        }
        
        console.log("🔐 Login attempt for:", credentials?.email);
        
        if (!credentials?.email || !credentials?.password) {
          console.log("❌ Missing credentials");
          throw new Error("Email and password required");
        }
        
        // Check if MongoDB URI is available
        if (!MONGODB_URI) {
          console.error("❌ MONGODB_URI is not configured");
          throw new Error("Authentication service is not configured");
        }
        
        try {
          const client = await clientPromise;
          const db = client.db(DATABASE_NAME);
          
          console.log(`📁 Looking for user: ${credentials.email}`);
          
          // Try to find user in users collection
          const user = await db.collection("users").findOne({ 
            email: credentials.email.toLowerCase().trim()
          });
          
          if (!user) {
            console.log(`❌ No user found with email: ${credentials.email}`);
            throw new Error("Invalid credentials");
          }
          
          // Check if account is active
          if (user.status && user.status !== "active") {
            console.log(`❌ Account is ${user.status}`);
            throw new Error("Account is not active. Please contact administrator.");
          }
          
          // Check if account is locked
          if (user.loginAttempts >= 5 && user.lastLogin) {
            const lockDuration = 15 * 60 * 1000; // 15 minutes
            const timeSinceLastAttempt = Date.now() - user.lastLogin.getTime();
            
            if (timeSinceLastAttempt < lockDuration) {
              const remainingTime = Math.ceil((lockDuration - timeSinceLastAttempt) / 60000);
              throw new Error(`Account is temporarily locked. Try again in ${remainingTime} minutes.`);
            }
          }
          
          console.log(`✅ User found: ${user.email}`);
          console.log(`📋 User requires password change: ${user.requiresPasswordChange}`);
          
          if (!user.password) {
            console.log("❌ User has no password set");
            throw new Error("Invalid credentials");
          }
          
          // Compare password
          const isPasswordValid = await bcrypt.compare(
            credentials.password, 
            user.password
          );
          
          console.log(`🔐 Password valid: ${isPasswordValid}`);
          
          if (!isPasswordValid) {
            // Update login attempts
            const attempts = (user.loginAttempts || 0) + 1;
            await db.collection("users").updateOne(
              { _id: user._id },
              { 
                $set: { 
                  loginAttempts: attempts,
                  lastLogin: new Date()
                } 
              }
            );
            
            console.log("❌ Password comparison failed");
            throw new Error("Invalid credentials");
          }
          
          // Reset login attempts on successful login
          await db.collection("users").updateOne(
            { _id: user._id },
            { 
              $set: { 
                loginAttempts: 0,
                lastLogin: new Date()
              } 
            }
          );
          
          // Return user object with requiresPasswordChange flag
          const userData = {
            id: user._id.toString(),
            email: user.email,
            name: user.name || user.email,
            role: (user.role || "user") as UserRole,
            image: user.image,
            employeeId: user.employeeId || "",
            permissions: user.permissions || [],
            requiresPasswordChange: user.requiresPasswordChange !== undefined 
              ? user.requiresPasswordChange 
              : true
          };
          
          console.log(`🎉 Login successful for: ${userData.email}`);
          console.log(`🔑 Requires password change: ${userData.requiresPasswordChange}`);
          
          return userData;
          
        } catch (error: any) {
          console.error("🔥 Auth error details:", error);
          throw new Error(error.message || "Authentication failed");
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Skip during build
      if (process.env.NEXT_PHASE === 'phase-production-build') {
        return token;
      }
      
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.email = user.email;
        token.name = user.name;
        token.employeeId = user.employeeId;
        token.permissions = user.permissions;
        token.requiresPasswordChange = user.requiresPasswordChange;
      }
      
      // Update session when password is changed
      if (trigger === "update" && session?.requiresPasswordChange !== undefined) {
        console.log("🔄 Updating JWT with new requiresPasswordChange:", session.requiresPasswordChange);
        token.requiresPasswordChange = session.requiresPasswordChange;
      }
      
      // Check database for latest requiresPasswordChange value
      if (token.id && MONGODB_URI) {
        try {
          const client = await clientPromise;
          const db = client.db(DATABASE_NAME);
          
          const userDoc = await db.collection("users").findOne(
            { _id: new ObjectId(token.id as string) },
            { projection: { requiresPasswordChange: 1 } }
          );
          
          if (userDoc) {
            token.requiresPasswordChange = userDoc.requiresPasswordChange || false;
          }
        } catch (error) {
          console.error("Error refreshing token from DB:", error);
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = token.role as UserRole;
        session.user.employeeId = token.employeeId as string;
        session.user.permissions = token.permissions as string[];
        session.user.requiresPasswordChange = token.requiresPasswordChange as boolean;
        session.user.image = token.image as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  debug: process.env.NODE_ENV === "development",
}

// Export a build-safe NextAuth instance
export default NextAuth(authOptions);