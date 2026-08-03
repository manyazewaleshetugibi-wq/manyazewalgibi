// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster as ToastToaster } from "react-hot-toast";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "./Provider";
import { UserDataProvider } from '@/providers/UserDataProvider';
import { UnauthorizedBanner } from '../components/UnauthorizedAlert';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Suspense } from 'react';
import { LoadingScreen } from '@/components/LoadingScreen';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Manyazewal Eshetu Gibi | Ethiopian & International Cuisine",
  description: "Experience a unique fusion of Ethiopian cultural dishes and international favorites at our culinary oasis in the heart of Bole. Enjoy organic ingredients and attentive service in our welcoming atmosphere.",
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <UserDataProvider>
            <Suspense fallback={<LoadingScreen />}>
              <UnauthorizedBanner />
              <ProtectedRoute>
                {children}
              </ProtectedRoute>
            </Suspense>
          </UserDataProvider>
        </Providers>
        <ToastToaster position="bottom-right" />
        <Toaster />
      </body>
    </html>
  );
}