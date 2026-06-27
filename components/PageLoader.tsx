// components/PageLoader.tsx
"use client";

import React from 'react';

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
          <div className="absolute top-0 left-0 w-12 h-12 border-4 border-blue-600 dark:border-blue-400 rounded-full animate-spin"
               style={{ 
                 borderTopColor: 'transparent',
                 borderRightColor: 'transparent',
                 borderBottomColor: 'transparent'
               }} />
        </div>
        {/* .ds */}
        <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
          Loading page content...
        </p>
      </div>
    </div>
  );
}