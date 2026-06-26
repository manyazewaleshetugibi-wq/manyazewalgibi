// components/LoadingScreen.tsx
"use client";

import React from 'react';

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-gray-900">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 rounded-full animate-spin">
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 dark:border-blue-400 rounded-full animate-spin" 
                 style={{ 
                   borderTopColor: 'transparent',
                   borderRightColor: 'transparent',
                   borderBottomColor: 'transparent'
                 }} />
          </div>
        </div>
        
        {/* Loading Text */}
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            Loading...
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Please wait while we verify your access
          </p>
        </div>
      </div>
    </div>
  );
}