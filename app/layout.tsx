import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast"
import { Providers } from "./Provider";
import { UserDataProvider } from '@/providers/UserDataProvider'




const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
        {children} 
        </UserDataProvider>
        </Providers>
        <Toaster position="bottom-right" />

      </body>
    </html>
  );
}
