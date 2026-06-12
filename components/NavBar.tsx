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
  Truck,
  ShoppingBag,
  Store,
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

type Role = 
  | "admin" 
  | "pos" 
  | "kitchen" 
  | "fb" 
  | "f&b" 
  | "marketing" 
  | "finance" 
  | "stock_manager" 
  | "purchasing"
  | "delivery"
  | "waitress"
  | "customer" 
  | "user"

// Extend the session user type
interface ExtendedUser {
  id: string
  role: Role
  name?: string | null
  email?: string | null
  image?: string | null
  requiresPasswordChange?: boolean
  status?: string
}

interface NavLinkProps {
  href: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  onClick?: () => void
}

const navLinks = [
  { href: "/", icon: UtensilsCrossed, label: "Menu", className: "hidden md:inline-flex text-purple-900" },
  { href: "/Home", icon: Home, label: "Home", className: "hidden md:inline-flex " },
  { href: "/about", icon: Info, label: "About Us", className: "hidden md:inline-flex " },
  { href: "/blogs", icon: BookOpen, label: "Blogs", className: "hidden md:inline-flex " },
  { href: "/contact", icon: PhoneCall, label: "Contact Us", className: "hidden md:inline-flex " },
]

export function NavBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status } = useSession()
  
  // Cast session user to ExtendedUser type
  const user = session?.user as ExtendedUser | undefined
  const isUserRole = user?.role === "user"

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMenuOpen])

  // Comprehensive user validation function
  const validateUserSession = async () => {
    // Skip validation if no user
    if (!user?.id && !user?.email) {
      return true
    }

    try {
      setIsCheckingStatus(true)
      setValidationError(null)
      
      let userData = null
      let endpoint = ''
      
      // Try multiple endpoints to find the user
      const endpoints = [
        `/users/${user.id}`,
        `/staff/${user.id}`,
        `/users/email/${user.email}`,
        `/staff/email/${user.email}`,
        '/users/current'
      ]
      
      for (const ep of endpoints) {
        try {
          endpoint = ep
          const response = await api.get(ep, { timeout: 5000 })
          
          if (response.data?.success && response.data?.data) {
            userData = response.data.data
            break
          } else if (response.data) {
            userData = response.data.data || response.data.user || response.data
            if (userData && (userData._id || userData.id)) {
              break
            }
          }
        } catch (err) {
          console.log(`Endpoint ${ep} failed, trying next...`)
          continue
        }
      }
      
      // Case 1: User not found in database - force logout
      if (!userData) {
        console.error('User not found in database - invalidating session')
        setValidationError('User account not found')
        await handleLogout(true, '?error=user_not_found')
        return false
      }
      
      // Case 2: User exists but status is not active - force logout
      if (userData.status && userData.status !== 'active') {
        console.log(`User account is ${userData.status}. Logging out...`)
        setValidationError(`Account is ${userData.status}`)
        await handleLogout(true, `?error=account_${userData.status}`)
        return false
      }
      
      // Case 3: User exists and is active - session is valid
      return true
      
    } catch (error: any) {
      console.error('Failed to validate user session:', error)
      
      // If it's a network error, don't logout immediately - might be temporary
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        console.log('Network timeout during validation - keeping session for now')
        return true
      }
      
      // For other errors, check if it's a 404 (user not found)
      if (error.response?.status === 404) {
        console.error('User not found (404) - invalidating session')
        setValidationError('User account not found')
        await handleLogout(true, '?error=user_not_found')
        return false
      }
      
      // For other server errors, keep session but log the error
      return true
    } finally {
      setIsCheckingStatus(false)
    }
  }

  // Initial session validation on mount and when session changes
  useEffect(() => {
    let validationTimeout: NodeJS.Timeout
    let isMounted = true

    const validateInitialSession = async () => {
      if (user && isMounted) {
        // Small delay to ensure session is fully loaded
        validationTimeout = setTimeout(async () => {
          if (isMounted) {
            await validateUserSession()
          }
        }, 500)
      }
    }

    validateInitialSession()

    return () => {
      isMounted = false
      if (validationTimeout) {
        clearTimeout(validationTimeout)
      }
    }
  }, [user?.id, user?.email])

  // Periodic session validation (every 60 seconds for staff roles, every 5 minutes for users)
  useEffect(() => {
    // Don't run periodic checks if no user
    if (!user) return

    // Set different intervals based on role
    const staffRoles = ['admin', 'kitchen', 'stock_manager', 'purchasing', 'delivery', 'waitress', 'fb', 'marketing', 'finance', 'pos']
    const isStaff = staffRoles.includes(user.role)
    const intervalTime = !isStaff ? 300000 : 60000 // 5 minutes for customers, 1 minute for staff

    const intervalId = setInterval(async () => {
      await validateUserSession()
    }, intervalTime)

    return () => clearInterval(intervalId)
  }, [user?.id, user?.email, user?.role])

  // Check on focus/visibility change (when user returns to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        validateUserSession()
      }
    }

    const handleFocus = () => {
      if (user) {
        validateUserSession()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [user])

  const NavLink = ({ href, icon: Icon, children, onClick }: NavLinkProps) => {
    const isActive = pathname === href || (href === "/" && pathname === "/home")
    return (
      <Link
        href={href}
        onClick={onClick}
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

  const handleLogout = async (isSilent: boolean = false, redirectPath: string = "/login") => {
    try {
      // Clear any stored data
      localStorage.removeItem("rememberedEmail")
      localStorage.removeItem("next-auth.session-token")
      localStorage.removeItem("next-auth.callback-url")
      localStorage.removeItem("next-auth.csrf-token")
      
      // Clear session storage
      sessionStorage.clear()
      
      // Clear any validation error
      setValidationError(null)
      
      // Close mobile menu if open
      setIsMenuOpen(false)
      
      // Sign out from NextAuth
      await signOut({ 
        redirect: !isSilent,
        redirect: isSilent ? false : true,
        callbackUrl: isSilent ? undefined : redirectPath
      })
      
      // If silent logout, manually redirect
      if (isSilent) {
        router.push(redirectPath)
      }
    } catch (error) {
      console.error('Logout error:', error)
      // Force redirect on error
      window.location.href = redirectPath
    }
  }

  const getDashboardLink = (role: Role): { path: string, label: string, icon: React.ComponentType<{ className?: string }> } => {
    const roleRoutes: Record<Role, { path: string, label: string, icon: React.ComponentType<{ className?: string }> }> = {
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
        label: "Marketing Dashboard", 
        icon: Megaphone 
      },
      finance: { 
        path: "/sales", 
        label: "Finance Dashboard", 
        icon: DollarSign 
      },
      stock_manager: { 
        path: "/stock", 
        label: "Stock Management", 
        icon: Package 
      },
      purchasing: { 
        path: "/purchase-request", 
        label: "Purchasing Dashboard", 
        icon: ShoppingBag 
      },
      delivery: { 
        path: "/delivery", 
        label: "Delivery Dashboard", 
        icon: Truck 
      },
      waitress: { 
        path: "/pos", 
        label: "Take Orders", 
        icon: Store 
      },
      customer: { 
        path: "/blogs", 
        label: "Blogs", 
        icon: BookOpen 
      },
      user: {
        path: "/",
        label: "Dashboard",
        icon: LayoutDashboard
      }
    }
    
    return roleRoutes[role] || { 
      path: "/", 
      label: "Dashboard", 
      icon: LayoutDashboard 
    }
  }

  // Function to handle login button click
  const handleLoginClick = () => {
    setIsMenuOpen(false)
    router.push("/login")
  }

  // Function to handle register button click
  const handleRegisterClick = () => {
    setIsMenuOpen(false)
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

    if (user) {
      // Show validation error if any
      if (validationError) {
        return (
          <div className="flex items-center gap-3">
            <div className="bg-red-50 text-red-600 px-4 py-2 rounded-md text-sm">
              {validationError}
            </div>
          </div>
        )
      }

      const userRole = user.role
      const { path: dashboardPath, label: dashboardLabel, icon: DashboardIcon } = getDashboardLink(userRole)
      const isCustomer = userRole.toLowerCase() === "customer"
      const displayName = user.name || user.email?.split('@')[0] || "User"

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
                  {user.name || user.email}
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
              
              {userRole === 'waitress' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/pos" className="flex items-center w-full">
                      <Store className="w-4 h-4 mr-2" />
                      Take Order
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/myorders" className="flex items-center w-full">
                      <ClipboardList className="w-4 h-4 mr-2" />
                      My Orders
                    </Link>
                  </DropdownMenuItem>
                </>
              )}

              {/* Change password if required */}
              {user.requiresPasswordChange && (
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
    <>
      <header className="sticky top-0 z-50 bg-purple-200/40 backdrop-blur-md supports-[backdrop-filter]:bg-purple-200/30 shadow-sm">
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
                    src="/man_logo.jpg" 
                    alt="Manyazewal Logo" 
                    width={80} 
                    height={80} 
                    className="w-auto h-10 md:h-12 transition-transform duration-300 group-hover:scale-105 rounded-xl border border-transparent group-hover:border-[#1a1942] shadow-sm group-hover:shadow-md" 
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
            </div>

            {/* Right side - User menu and mobile menu button */}
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
                  onClick={() => setIsMenuOpen(true)}
                  aria-label="Open menu"
                  className="relative text-[#1a1942] hover:bg-[#1a1942]/10"
                >
                  <Menu className="w-6 h-6" />
                </Button>
              </div>
            </div>
          </nav>
        </div>
      </header>

      {/* Mobile Side Menu - Overlay and Slide-in Panel */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 md:hidden"
              onClick={() => setIsMenuOpen(false)}
            />
            
            {/* Slide-in Panel from Right */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-white dark:bg-gray-900 shadow-2xl z-50 md:hidden overflow-y-auto"
            >
              {/* Header with close button */}
              <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Image 
                    src="/man_logo.jpg" 
                    alt="Logo" 
                    width={40} 
                    height={40} 
                    className="rounded-lg"
                  />
                  <span className="font-semibold text-[#1a1942] dark:text-purple-400">
                    Menu
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMenuOpen(false)}
                  className="hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Menu Content */}
              <div className="px-4 py-6 space-y-6">
                {/* Navigation Links */}
                <div className="space-y-3">
                  {navLinks.map((link) => (
                    <NavLink 
                      key={link.href} 
                      href={link.href} 
                      icon={link.icon}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {link.label}
                    </NavLink>
                  ))}
                </div>
                
                {/* Divider */}
                <div className="border-t border-gray-100 dark:border-gray-800"></div>
                
                {/* Auth Section */}
                <div className="space-y-3">
                  {!user ? (
                    <>
                      {/* Login Button */}
                      <Button 
                        variant="default" 
                        size="lg"
                        className="w-full bg-gradient-to-r from-[#1a1942] to-[#3a378f] hover:from-[#3a378f] hover:to-[#1a1942]"
                        onClick={handleLoginClick}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Login
                      </Button>
                      
                      {/* Register Button */}
                      <Button 
                        variant="outline" 
                        size="lg"
                        className="w-full border-[#1a1942] text-[#1a1942] hover:bg-[#1a1942] hover:text-white"
                        onClick={handleRegisterClick}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Register
                      </Button>
                    </>
                  ) : (
                    <>
                      {/* User Profile Card */}
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-[#1a1942] to-[#3a378f] rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                              {user.name || user.email}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                              {user.role.toLowerCase().replace(/_/g, ' ')}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Dashboard Link */}
                      <Button 
                        variant="outline" 
                        size="lg"
                        className="w-full border-[#1a1942] text-[#1a1942] hover:bg-[#1a1942] hover:text-white"
                        onClick={() => {
                          const { path } = getDashboardLink(user.role)
                          if (user.requiresPasswordChange) {
                            router.push("/change-password")
                          } else {
                            router.push(path)
                          }
                          setIsMenuOpen(false)
                        }}
                      >
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        {getDashboardLink(user.role).label}
                      </Button>

                      {/* Role-specific quick links in mobile menu */}
                      {user.role === 'purchasing' && (
                        <>
                          <Button 
                            variant="outline" 
                            size="lg"
                            className="w-full border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                            onClick={() => {
                              router.push("/purchase-request")
                              setIsMenuOpen(false)
                            }}
                          >
                            <ShoppingBag className="w-4 h-4 mr-2" />
                            Purchase Requests
                          </Button>
                          <Button 
                            variant="outline" 
                            size="lg"
                            className="w-full border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                            onClick={() => {
                              router.push("/suppliers")
                              setIsMenuOpen(false)
                            }}
                          >
                            <Package className="w-4 h-4 mr-2" />
                            Suppliers
                          </Button>
                        </>
                      )}

                      {user.role === 'delivery' && (
                        <>
                          <Button 
                            variant="outline" 
                            size="lg"
                            className="w-full border-teal-200 text-teal-600 hover:bg-teal-50"
                            onClick={() => {
                              router.push("/delivery/pending")
                              setIsMenuOpen(false)
                            }}
                          >
                            <Truck className="w-4 h-4 mr-2" />
                            Pending Deliveries
                          </Button>
                          <Button 
                            variant="outline" 
                            size="lg"
                            className="w-full border-teal-200 text-teal-600 hover:bg-teal-50"
                            onClick={() => {
                              router.push("/delivery/active")
                              setIsMenuOpen(false)
                            }}
                          >
                            <ClipboardList className="w-4 h-4 mr-2" />
                            Active Deliveries
                          </Button>
                        </>
                      )}

                      {user.role === 'waitress' && (
                        <>
                          <Button 
                            variant="outline" 
                            size="lg"
                            className="w-full border-pink-200 text-pink-600 hover:bg-pink-50"
                            onClick={() => {
                              router.push("/pos")
                              setIsMenuOpen(false)
                            }}
                          >
                            <Store className="w-4 h-4 mr-2" />
                            Take Order
                          </Button>
                          <Button 
                            variant="outline" 
                            size="lg"
                            className="w-full border-pink-200 text-pink-600 hover:bg-pink-50"
                            onClick={() => {
                              router.push("/myorders")
                              setIsMenuOpen(false)
                            }}
                          >
                            <ClipboardList className="w-4 h-4 mr-2" />
                            My Orders
                          </Button>
                        </>
                      )}

                      {/* Change password if required */}
                      {user.requiresPasswordChange && (
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
                      
                      {/* Logout Button */}
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
                    </>
                  )}
                </div>

                {/* Footer Info */}
                <div className="pt-4">
                  <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                    © 2024 Manyazewal Restaurant
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}