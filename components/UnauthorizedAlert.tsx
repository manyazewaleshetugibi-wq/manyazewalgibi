// components/UnauthorizedBanner.tsx
"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export function UnauthorizedBanner() {
  const searchParams = useSearchParams();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hasUnauthorized = searchParams?.get('unauthorized') === 'true';
    const hasCookie = document.cookie.includes('unauthorized_access=true');
    
    if (hasUnauthorized || hasCookie) {
      setShow(true);
      
      // Clear cookie
      document.cookie = 'unauthorized_access=; Max-Age=0; path=/';
      
      // Remove param from URL
      if (hasUnauthorized && window.history.replaceState) {
        const newUrl = window.location.pathname + window.location.search.replace(/[?&]unauthorized=true/, '');
        window.history.replaceState({}, '', newUrl);
      }
      
      // Auto-hide after 5 seconds
      setTimeout(() => setShow(false), 5000);
    }
  }, [searchParams]);

  if (!show) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white p-4 text-center shadow-lg animate-slide-down">
      <div className="container mx-auto">
        <p className="font-semibold text-lg">
          ⚠️ Access Denied
        </p>
        <p className="text-sm mt-1">
          You don't have permission to access this page.
        </p>
      </div>
    </div>
  );
}