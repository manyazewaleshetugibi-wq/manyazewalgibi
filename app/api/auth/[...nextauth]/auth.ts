import NextAuth, { type NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { MongoDBAdapter } from "@next-auth/mongodb-adapter"
import bcrypt from "bcrypt"
import { MongoClient, ObjectId } from "mongodb"
import { UserRole } from "@/models/User"

// HARDCODED CONFIGURATION
const MONGODB_URI = "mongodb+srv://aweke2011:awe2011@gold.av49bjz.mongodb.net/?retryWrites=true&w=majority";
const DATABASE_NAME = "gold"
const NEXTAUTH_SECRET = "snbcsbdnbjkdbhjddfbdnbfhdhrhfrfjkfjdkja"
const NEXTAUTH_URL = "http://localhost:3000"

const client = new MongoClient(MONGODB_URI)
const clientPromise = client.connect()

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise, {
    databaseName: DATABASE_NAME
  }),
  secret: NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<any> {
        console.log("🔐 Login attempt for:", credentials?.email);
        
        if (!credentials?.email || !credentials?.password) {
          console.log("❌ Missing credentials");
          throw new Error("Email and password required");
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
          // If field doesn't exist, default to true (force password change)
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
              : true // Default to true if field doesn't exist
          };
          
          console.log(`🎉 Login successful for: ${userData.email}`);
          console.log(`🔑 Requires password change: ${userData.requiresPasswordChange}`);
          console.log(`👤 User data:`, userData);
          
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
      
      // Update session when password is changed (via updateSession trigger)
      if (trigger === "update" && session?.requiresPasswordChange !== undefined) {
        console.log("🔄 Updating JWT with new requiresPasswordChange:", session.requiresPasswordChange);
        token.requiresPasswordChange = session.requiresPasswordChange;
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
  debug: true,
}

export default NextAuth(authOptions);