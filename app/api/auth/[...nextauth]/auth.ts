import NextAuth, { type NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { MongoDBAdapter } from "@next-auth/mongodb-adapter"
import bcrypt from "bcrypt"

// HARDCODED CONFIGURATION
const MONGODB_URI = "mongodb+srv://aweke2011:awe2011@gold.av49bjz.mongodb.net/?retryWrites=true&w=majority";
const DATABASE_NAME = "gold"
const NEXTAUTH_SECRET = "snbcsbdnbjkdbhjddfbdnbfhdhrhfrfjkfjdkja"
const NEXTAUTH_URL = "http://localhost:3000"

import { MongoClient } from "mongodb"
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
          
          // Find user
          const user = await db.collection("users").findOne({ 
            email: credentials.email 
          });
          
          if (!user) {
            console.log(`❌ No user found with email: ${credentials.email}`);
            throw new Error("Invalid credentials");
          }
          
          console.log(`✅ User found: ${user.email}`);
          console.log(`📝 User has password: ${!!user.password}`);
          
          if (!user.password) {
            console.log("❌ User has no password set");
            throw new Error("Invalid credentials");
          }
          
          // DEBUG: Log password details
          console.log(`🔑 Password comparison:`);
          console.log(`   Input password length: ${credentials.password.length}`);
          console.log(`   Stored hash length: ${user.password.length}`);
          console.log(`   Stored hash prefix: ${user.password.substring(0, 20)}...`);
          
          // Compare password
          const isPasswordValid = await bcrypt.compare(
            credentials.password, 
            user.password
          );
          
          console.log(`🔐 Password valid: ${isPasswordValid}`);
          
          if (!isPasswordValid) {
            console.log("❌ Password comparison failed");
            
            // DEBUG: Try to see if it's a bcrypt hash
            const isBcryptHash = user.password.startsWith('$2b$') || 
                                 user.password.startsWith('$2a$') || 
                                 user.password.startsWith('$2y$');
            console.log(`🔍 Is bcrypt hash: ${isBcryptHash}`);
            
            throw new Error("Invalid credentials");
          }
          
          // Return user object
          const userData = {
            id: user._id.toString(),
            email: user.email,
            name: user.name || user.email,
            role: user.role || "user",
            image: user.image
          };
          
          console.log(`🎉 Login successful for: ${userData.email}`);
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
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  debug: true, // Enable debug mode
}

export default NextAuth(authOptions);