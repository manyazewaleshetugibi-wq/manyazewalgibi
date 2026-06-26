// lib/security/useSecurityLogger.ts - FIXED
'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

export function useSecurityLogger() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const previousPath = useRef<string>('');

  useEffect(() => {
    // Only log if path changed and it's not the initial load
    if (previousPath.current && previousPath.current !== pathname) {
      // Log page view on the client side
      logClientAction('page_view', {
        from: previousPath.current,
        to: pathname,
        query: Object.fromEntries(searchParams.entries()),
        isAuthenticated: !!session?.user,
        userEmail: session?.user?.email,
        userRole: session?.user?.role,
        userId: session?.user?.id,
        userName: session?.user?.name,
      });
    }
    previousPath.current = pathname;
  }, [pathname, searchParams, session]);

  // ✅ Also log when user logs in/out via session change
  useEffect(() => {
    if (session?.user && previousPath.current) {
      // User is authenticated - log session
      logClientAction('session_active', {
        userEmail: session.user.email,
        userRole: session.user.role,
        userId: session.user.id,
        path: pathname,
      });
    }
  }, [session, pathname]);
}

// Client-side logging function
export async function logClientAction(
  action: string,
  data: Record<string, any>
): Promise<void> {
  try {
    // Send to API endpoint for logging
    const response = await fetch('/api/security/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        data,
        timestamp: new Date().toISOString(),
      }),
    });
    
    if (!response.ok) {
      console.warn('Failed to log client action:', response.status);
    }
  } catch (error) {
    // Silently fail
    console.debug('Failed to log client action:', error);
  }
}