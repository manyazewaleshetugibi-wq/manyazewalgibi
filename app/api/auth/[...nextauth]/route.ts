import NextAuth from "next-auth"
import { authOptions } from "./auth"

// Create the handler but don't call it immediately
const createHandler = () => {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    // Return simple handlers during build
    const simpleResponse = () => new Response(JSON.stringify({ 
      message: 'Auth not available during build' 
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
    return {
      GET: simpleResponse,
      POST: simpleResponse
    };
  }
  
  // Use real NextAuth during runtime
  return NextAuth(authOptions);
}

const handler = createHandler();

export const GET = handler.GET;
export const POST = handler.POST;