"use client"

import { useState } from "react"
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

type Role = "KITCHEN" | "FB" | "MARKETING" | "ADMIN" | "CUSTOMER" | "FINANCE" | "STOCK_MANAGER"

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
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status } = useSession()

  const NavLink = ({ href, icon: Icon, children }: NavLinkProps) => {
    const isActive = pathname === href || (href === "/" && pathname === "/home")
    return (
      <Link
        href={href}
        className={`relative flex items-center text-base font-medium transition-colors duration-200 ${
          isActive ? "text-[#1a1942]" : "text-gray-600 hover:text-[#1a1942]"
        }`}
      >
        <Icon className="w-5 h-5 mr-2 md:mr-0 md:w-0 md:h-0" />
        <span className="md:inline">{children}</span>
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

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push("/")
  }

  const getDashboardLink = (role: Role) => {
    const dashboardRoutes: Record<Role, string> = {
      KITCHEN: "/dashboard",
      FB: "/dashboard",
      MARKETING: "/dashboard",
      ADMIN: "/dashboard",
      CUSTOMER: "/dashboard",
      FINANCE: "/dashboard",
      STOCK_MANAGER: "/dashboard",
    }
    return dashboardRoutes[role] || "/"
  }

  const renderUserMenu = () => {
    if (status === "loading") return null

    if (session?.user) {
      const userRole = session.user.role as Role
      const isCustomer = userRole === "CUSTOMER"

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <User className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isCustomer && (
              <>
                <DropdownMenuItem>
                  <Link href="/profile" className="flex items-center w-full">
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/orders" className="flex items-center w-full">
                    <ClipboardList className="w-4 h-4 mr-2" />
                    Order History
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {!isCustomer && (
              <DropdownMenuItem>
                <Link href={getDashboardLink(userRole)} className="flex items-center w-full">
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Go to {userRole} Dashboard
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }

    return (
      <>
        <Link href="/login">
          <Button variant="ghost" size="sm" className="hidden md:inline-flex mr-2">
            <LogIn className="w-4 h-4 mr-2" />
            Login
          </Button>
        </Link>
        <Link href="/register">
          <Button variant="default" size="sm" className="hidden md:inline-flex">
            <UserPlus className="w-4 h-4 mr-2" />
            Register
          </Button>
        </Link>
      </>
    )
  }

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between h-16 md:h-20">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Image src="/man_logo.png" alt="Manyazewal Logo" width={80} height={80} className="w-auto h-10 md:h-12" />
            </Link>
          </div>

          <div className="hidden md:flex md:items-center md:justify-center md:gap-8">
            {navLinks.map((link) => (
              <NavLink key={link.href} href={link.href} icon={link.icon}>
                {link.label}
              </NavLink>
            ))}
          </div>

          <div className="flex items-center">
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="Toggle menu"
                className="text-[#1a1942]"
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

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="md:hidden bg-white border-t border-gray-100"
          >
            <div className="px-4 py-4 space-y-4">
              {navLinks.map((link) => (
                <NavLink key={link.href} href={link.href} icon={link.icon}>
                  {link.label}
                </NavLink>
              ))}
             
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

