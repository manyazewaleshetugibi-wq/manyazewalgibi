// app/unauthorized/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

export default function UnauthorizedPage() {
  const { data: session } = useSession();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
        <div className="mx-auto bg-red-100 rounded-full p-4 w-20 h-20 flex items-center justify-center mb-6">
          <ShieldAlert className="h-10 w-10 text-red-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-4">
          You don't have permission to access this page.
        </p>
        
        {session?.user?.email && (
          <div className="bg-gray-50 rounded-md p-3 mb-6 text-sm">
            <p className="text-gray-700">
              <span className="font-medium">Logged in as:</span> {session.user.email}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Your role:</span> {session.user.role || 'DEFAULT'}
            </p>
          </div>
        )}
        
        <div className="space-y-3">
          <Link href="/dashboard">
            <button className="w-full bg-primary text-white py-2.5 px-4 rounded-md hover:bg-primary/90 transition">
              <Home className="inline-block mr-2 h-4 w-4" />
              Go to Dashboard
            </button>
          </Link>
          <Link href="/">
            <button className="w-full bg-gray-200 text-gray-700 py-2.5 px-4 rounded-md hover:bg-gray-300 transition">
              <ArrowLeft className="inline-block mr-2 h-4 w-4" />
              Return Home
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}