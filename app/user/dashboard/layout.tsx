"use client";

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarHeader, 
  SidebarRail,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset
} from '@/components/ui/sidebar';
import { 
  User,
  ShoppingCart,
  History,
  Star,
  Gift,
  Share2,
  Home,
  Settings,
  TrendingUp,
  Bell,
  Package,
  Heart,
  LogOut,
  ChevronDown
} from 'lucide-react';

const userNavItems = [
  {
    title: "Dashboard",
    url: "/user/dashboard",
    icon: Home,
  },
  {
    title: "My Profile",
    url: "/user/profile/edit",
    icon: User,
  },
  {
    title: "Order History",
    url: "/user/dashboard/order",
    icon: ShoppingCart,
  },
  {
    title: "Favorite Foods",
    url: "/user/dashboard/favorites",
    icon: Heart,
  },
  {
    title: "My Points",
    url: "/user/dashboard/points",
    icon: Gift,
  },
 
  {
    title: "Notifications",
    url: "/user/dashboard/notifications",
    icon: Bell,
  },

];

// Simple UserNav component
const UserNav = ({ user }: { user: any }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-accent transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <User className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 text-left group-data-[collapsible=icon]:hidden">
          <p className="text-sm font-medium truncate">
            {user?.name || user?.email?.split('@')[0] || 'User'}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {user?.email || 'user@example.com'}
          </p>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''} group-data-[collapsible=icon]:hidden`} />
      </button>
      
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 bg-white border rounded-lg shadow-lg z-50 w-56">
          <div className="p-2">
            <a
              href="/dashboard/profile"
              className="flex items-center gap-2 px-3 py-2 rounded hover:bg-accent text-sm"
            >
              <User className="h-4 w-4" />
              <span>My Profile</span>
            </a>
            <a
              href="/dashboard/settings"
              className="flex items-center gap-2 px-3 py-2 rounded hover:bg-accent text-sm"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </a>
            <div className="border-t my-1"></div>
            <button
              onClick={() => {
                // Handle logout
                console.log('Logout clicked');
              }}
              className="flex items-center gap-2 w-full px-3 py-2 rounded hover:bg-accent text-sm text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            Please login to access the dashboard
          </p>
          <a
            href="/login"
            className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      {/* Sidebar for desktop */}
      <Sidebar 
        collapsible="icon" 
        className="border-r"
      >
        <SidebarHeader className="p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <span className="text-white font-bold">U</span>
            </div>
            <div className="group-data-[collapsible=icon]:hidden">
              <h2 className="font-semibold">User Dashboard</h2>
              <p className="text-xs text-muted-foreground">Welcome back!</p>
            </div>
          </div>
        </SidebarHeader>
        
        <SidebarContent className="p-2">
          <nav className="space-y-1">
            {userNavItems.map((item) => (
              <a
                key={item.title}
                href={item.url}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-accent transition-colors"
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
              </a>
            ))}
          </nav>
        </SidebarContent>
        
        <SidebarFooter className="p-4 border-t">
          <UserNav user={session.user} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      {/* Mobile bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t shadow-lg">
        <div className="flex justify-around items-center p-2">
          {userNavItems.slice(0, 4).map((item) => (
            <a
              key={item.title}
              href={item.url}
              className="flex flex-col items-center p-2 text-xs hover:text-primary transition-colors"
            >
              <item.icon className="h-5 w-5 mb-1" />
              <span>{item.title}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Main content */}
      <SidebarInset>
        <div className="p-4 md:p-6 pb-20 md:pb-0">
          <div className="flex items-center gap-2 mb-4">
            <SidebarTrigger />
          </div>

          {/* Welcome header */}
          <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border">
            <h1 className="text-2xl font-bold">
              Welcome back, {session.user?.name?.split(' ')[0] || 'User'}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's what's happening with your account today.
            </p>
          </div>
          
          {/* Dashboard content */}
          <div className="space-y-6">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}