"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Menu,
  X,
  Home,
  Info,
  UtensilsCrossed,
  PhoneCall,
  BookOpen,
  LogIn,
  UserPlus,
  User,
  LogOut,
  ClipboardList,
  LayoutDashboard,
  Sparkles,
  ArrowRight,
  ShoppingCart,
  ChefHat,
  Megaphone,
  DollarSign,
  Package,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import axios from "axios"

// API client setup
const api = axios.create({
  baseURL: "/api",
})

type Role = "admin" | "pos" | "kitchen" | "fb" | "f&b" | "marketing" | "finance" | "stock_manager" | "customer" | "user"

interface NavLinkProps {
  href: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}

const navLinks = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/about", icon: Info, label: "About Us" },
  { href: "/menu", icon: UtensilsCrossed, label: "Menu" },
  { href: "/blogs", icon: BookOpen, label: "Blogs" },
  { href: "/contact", icon: PhoneCall, label: "Contact Us" },
]

export function NavBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status, update } = useSession()
  const isUserRole = session?.user?.role === "user"

  // Check user status periodically and on session changes
  useEffect(() => {
    const checkUserStatus = async () => {
      if (session?.user?.id && session?.user?.email) {
        try {
          setIsCheckingStatus(true)
          // Fetch the latest user data from the staff endpoint
          const response = await api.get(`/staff/${session.user.id}`)
          
          if (response.data.success) {
            const userData = response.data.data
            
            // If user status is not active, sign them out
            if (userData.status !== 'active') {
              console.log('User account is inactive. Logging out...')
              await handleLogout(true) // Force logout without redirect
              router.push('/login?error=account_inactive')
            }
          }
        } catch (error) {
          console.error('Failed to check user status:', error)
        } finally {
          setIsCheckingStatus(false)
        }
      }
    }

    // Check status immediately when session is available
    if (session?.user) {
      checkUserStatus()
    }

    // Set up periodic status check every 30 seconds
    const intervalId = setInterval(() => {
      if (session?.user) {
        checkUserStatus()
      }
    }, 30000) // 30 seconds

    return () => clearInterval(intervalId)
  }, [session?.user?.id, session?.user?.email])

  const NavLink = ({ href, icon: Icon, children }: NavLinkProps) => {
    const isActive = pathname === href || (href === "/" && pathname === "/home")
    return (
      <Link
        href={href}
        className={`relative flex items-center text-base font-medium transition-colors duration-200 whitespace-nowrap ${
          isActive ? "text-[#1a1942]" : "text-gray-600 hover:text-[#1a1942]"
        }`}
      >
        <Icon className="w-5 h-5 mr-2 md:hidden" />
        <span>{children}</span>
        {isActive && (
          <motion.div
            className="absolute bottom-0 left-0 w-full h-0.5 bg-[#1a1942]"
            layoutId="underline"
            initial={false}
          />
        )}
      </Link>
    )
  }

  const handleLogout = async (isSilent: boolean = false) => {
    try {
      // Clear any stored data
      localStorage.removeItem("rememberedEmail")
      localStorage.removeItem("next-auth.session-token")
      localStorage.removeItem("next-auth.callback-url")
      localStorage.removeItem("next-auth.csrf-token")
      
      // Clear session storage
      sessionStorage.clear()
      
      // Sign out from NextAuth
      await signOut({ 
        redirect: !isSilent,
        callbackUrl: isSilent ? undefined : "/login"
      })
      
      // If silent logout, manually redirect
      if (isSilent) {
        router.push('/login?error=account_inactive')
      }
    } catch (error) {
      console.error('Logout error:', error)
      // Force redirect on error
      window.location.href = '/login?error=logout_failed'
    }
  }

  const getDashboardLink = (role: string): { path: string, label: string, icon: React.ComponentType<{ className?: string }> } => {
    const roleRoutes: Record<string, { path: string, label: string, icon: React.ComponentType<{ className?: string }> }> = {
      admin: { 
        path: "/dashboard", 
        label: "Admin Dashboard", 
        icon: LayoutDashboard 
      },
      pos: { 
        path: "/pos", 
        label: "Point of Sale", 
        icon: ShoppingCart 
      },
      kitchen: { 
        path: "/orders", 
        label: "Kitchen Orders", 
        icon: ChefHat 
      },
      fb: { 
        path: "/items", 
        label: "Food & Beverage", 
        icon: UtensilsCrossed 
      },
      "f&b": { 
        path: "/items", 
        label: "Food & Beverage", 
        icon: UtensilsCrossed 
      },
      marketing: { 
        path: "/blog", 
        label: "Marketing Blog", 
        icon: Megaphone 
      },
      finance: { 
        path: "/sales", 
        label: "Sales & Finance", 
        icon: DollarSign 
      },
      stock_manager: { 
        path: "/stock", 
        label: "Stock Management", 
        icon: Package 
      },
      customer: { 
        path: "/blogs", 
        label: "Blogs", 
        icon: BookOpen 
      },
      user: {
        path: "/user/dashboard",
        label: "Accounts",
        icon: LayoutDashboard
      }
    }
    
    return roleRoutes[role.toLowerCase()] || { 
      path: "/", 
      label: "Dashboard", 
      icon: LayoutDashboard 
    }
  }

  // Function to handle login button click
  const handleLoginClick = () => {
    router.push("/login")
  }

  // Function to handle register button click
  const handleRegisterClick = () => {
    router.push("/Register")
  }

  const renderUserMenu = () => {
    if (status === "loading" || isCheckingStatus) {
      return (
        <div className="flex items-center gap-3">
          <div className="h-9 w-20 bg-gray-200 rounded-md animate-pulse"></div>
          <div className="h-9 w-20 bg-gray-200 rounded-md animate-pulse"></div>
        </div>
      )
    }

    if (session?.user) {
      const userRole = session.user.role as string
      const { path: dashboardPath, label: dashboardLabel, icon: DashboardIcon } = getDashboardLink(userRole)
      const isCustomer = userRole.toLowerCase() === "customer"
      const displayName = session.user.name || session.user.email?.split('@')[0] || "User"

      return (
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="default"
                className="relative group hover:bg-[#1a1942]/10 transition-colors px-4"
              >
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <User className="w-5 h-5 text-[#1a1942]" />
                    <motion.div
                      className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-white"
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    />
                  </div>
                  <span className="hidden md:inline font-medium text-[#1a1942]">
                    {displayName}
                  </span>
                  <ArrowRight className="w-4 h-4 text-[#1a1942]/60 hidden md:inline" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {/* User info section */}
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {session.user.name || session.user.email}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {userRole.toLowerCase().replace(/_/g, ' ')}
                </p>
              </div>
              <DropdownMenuSeparator />

              {/* Dashboard link */}
              <DropdownMenuItem asChild>
                <Link 
                  href={dashboardPath} 
                  className="flex items-center w-full cursor-pointer"
                >
                  <DashboardIcon className="w-4 h-4 mr-2 text-[#1a1942]" />
                  <span className="font-medium">{dashboardLabel}</span>
                </Link>
              </DropdownMenuItem>

              {/* Customer-specific links */}
              {isCustomer && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center w-full">
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/orders" className="flex items-center w-full">
                      <ClipboardList className="w-4 h-4 mr-2" />
                      Order History
                    </Link>
                  </DropdownMenuItem>
                </>
              )}

              {/* Change password if required */}
              {session.user.requiresPasswordChange && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/change-password" className="flex items-center w-full text-amber-600">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      <span className="font-medium">Change Password</span>
                    </Link>
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuSeparator />
              {/* Logout */}
              <DropdownMenuItem 
                onClick={() => handleLogout(false)}
                className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    }

    // For non-authenticated users - show both Login and Register buttons
    return (
      <div className="flex items-center gap-3">
        {/* Register Button */}
        <motion.div
          initial={false}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative"
        >
          <Button 
            variant="outline" 
            size="default"
            onClick={handleRegisterClick}
            className="relative overflow-hidden group border-[#1a1942] text-[#1a1942] hover:bg-[#1a1942] hover:text-white transition-all duration-300 px-6"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            <span className="font-medium tracking-wide">
              Register
            </span>
            <div className="absolute inset-0 rounded-md bg-gradient-to-r from-transparent via-[#1a1942]/10 to-transparent opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-300" />
          </Button>
        </motion.div>

        {/* Login Button */}
        <motion.div
          initial={false}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative"
        >
          <Button 
            variant="default" 
            size="default"
            onClick={handleLoginClick}
            className="relative overflow-hidden group bg-gradient-to-r from-[#1a1942] to-[#3a378f] hover:from-[#3a378f] hover:to-[#1a1942] shadow-lg hover:shadow-xl transition-all duration-300 border-0 px-6"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
            <Sparkles className="w-4 h-4 mr-2 opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="font-semibold text-white tracking-wide">
              Login
            </span>
            <div className="absolute inset-0 rounded-md bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-300" />
          </Button>
        </motion.div>
      </div>
    )
  }

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60 shadow-sm">
      <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between h-16 md:h-20">
          {/* Logo on the left */}
          <div className="flex items-center flex-1">
            <Link href="/" className="flex items-center group">
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <Image 
                  src="/man_logo.png" 
                  alt="Manyazewal Logo" 
                  width={80} 
                  height={80} 
                  className="w-auto h-10 md:h-12 transition-transform duration-300 group-hover:scale-105" 
                />
              </motion.div>
            </Link>
          </div>

          {/* Center navigation links */}
          <div className="hidden md:flex md:items-center md:justify-center md:flex-1 md:gap-4 lg:gap-8">
            {navLinks.map((link) => (
              <NavLink key={link.href} href={link.href} icon={link.icon}>
                {link.label}
              </NavLink>
            ))}
            {isUserRole && (
              <NavLink href="/user/dashboard" icon={LayoutDashboard}>
                Accounts
              </NavLink>
            )}
          </div>

          {/* Right side - User menu and mobile menu */}
          <div className="flex items-center justify-end flex-1 gap-4">
            {/* User menu / Auth buttons */}
            <div className="hidden md:flex items-center">
              {renderUserMenu()}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Toggle menu"
                className="relative text-[#1a1942] hover:bg-[#1a1942]/10"
              >
                <AnimatePresence initial={false} mode="wait">
                  <motion.div
                    key={isMenuOpen ? "close" : "open"}
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.2 }}
                  >
                    {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                  </motion.div>
                </AnimatePresence>
              </Button>
            </div>
          </div>
        </nav>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="md:hidden bg-white/95 backdrop-blur-sm border-t border-gray-100"
          >
            <div className="px-4 py-6 space-y-3">
              {navLinks.map((link) => (
                <NavLink key={link.href} href={link.href} icon={link.icon}>
                  {link.label}
                </NavLink>
              ))}
              {isUserRole && (
                <NavLink href="/user/dashboard" icon={LayoutDashboard}>
                  Accounts
                </NavLink>
              )}
              
              {/* Mobile auth buttons */}
              <div className="pt-4 mt-4 border-t border-gray-100 space-y-3">
                {!session?.user ? (
                  <>
                    {/* Mobile Login Button */}
                    <Button 
                      variant="default" 
                      size="lg"
                      className="w-full bg-gradient-to-r from-[#1a1942] to-[#3a378f] hover:from-[#3a378f] hover:to-[#1a1942]"
                      onClick={() => {
                        handleLoginClick()
                        setIsMenuOpen(false)
                      }}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Login
                    </Button>
                    
                    {/* Mobile Register Button */}
                    <Button 
                      variant="outline" 
                      size="lg"
                      className="w-full border-[#1a1942] text-[#1a1942] hover:bg-[#1a1942] hover:text-white"
                      onClick={() => {
                        handleRegisterClick()
                        setIsMenuOpen(false)
                      }}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Register
                    </Button>
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <User className="w-5 h-5 text-[#1a1942]" />
                      <div>
                        <p className="font-medium text-gray-700">
                          {session.user.name || session.user.email}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {session.user.role?.toLowerCase().replace(/_/g, ' ') || 'user'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Mobile dashboard link */}
                    <Button 
                      variant="outline" 
                      size="lg"
                      className="w-full border-[#1a1942] text-[#1a1942] hover:bg-[#1a1942] hover:text-white"
                      onClick={() => {
                        const userRole = session.user.role as string
                        const { path } = getDashboardLink(userRole)
                        
                        if (session.user.requiresPasswordChange) {
                          router.push("/change-password")
                        } else {
                          router.push(path)
                        }
                        setIsMenuOpen(false)
                      }}
                    >
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      {getDashboardLink(session.user.role as string).label}
                    </Button>

                    {/* Change password if required */}
                    {session.user.requiresPasswordChange && (
                      <Button 
                        variant="outline" 
                        size="lg"
                        className="w-full border-amber-200 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                        onClick={() => {
                          router.push("/change-password")
                          setIsMenuOpen(false)
                        }}
                      >
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Change Password
                      </Button>
                    )}
                    
                    {/* Mobile Logout Button */}
                    <Button 
                      variant="outline" 
                      size="lg"
                      className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => {
                        handleLogout(false)
                        setIsMenuOpen(false)
                      }}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}