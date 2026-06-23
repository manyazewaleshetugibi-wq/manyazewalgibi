"use client"

import { useState, useEffect, useRef } from "react"
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
  Phone,
  Mail,
  Facebook,
  Twitter,
  Instagram,
  MapPin,
  Clock,
  Play,
  Pause,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { FaTiktok } from "react-icons/fa"
import axios from "axios"

// Import the JSON data
import videoData from "./LOGO.json"

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

// Video frame type
interface VideoFrame {
  timestamp: number;
  width: number;
  height: number;
  pixels: number[];
  frameIndex: number;
}

// Video data type
interface VideoDataType {
  metadata: {
    fileName: string;
    fileSize: number;
    fileType: string;
    duration: number;
    width: number;
    height: number;
    frameRate: number;
    totalFrames: number;
    extractionQuality: string;
    extractionDate: string;
  };
  frames: VideoFrame[];
  summary: {
    totalFrames: number;
    avgFrameSize: number;
    durationSeconds: number;
  };
}

const navLinks = [
  { href: "/home", icon: Home, label: "Home" },
  { href: "/about", icon: Info, label: "About Us" },
  { href: "/", icon: UtensilsCrossed, label: "Menu" },
  { href: "/blogs", icon: BookOpen, label: "Blogs" },
  { href: "/contact", icon: PhoneCall, label: "Contact Us" },
]

// Social media links configuration
const socialLinks = [
  { 
    href: "https://www.facebook.com/share/1KKkkU45nA/", 
    icon: Facebook, 
    label: "Facebook",
    color: "hover:text-blue-600"
  },
  { 
    href: "https://instagram.com/manyazewal", 
    icon: Instagram, 
    label: "Instagram",
    color: "hover:text-pink-600"
  },
  { 
    href: "https://www.tiktok.com/@manyazewalgibi", 
    icon: FaTiktok, 
    label: "TikTok",
    color: "hover:text-black"
  },
]

export function NavBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0)
  const [isVideoDataLoaded, setIsVideoDataLoaded] = useState(false)
  const [videoFrameData, setVideoFrameData] = useState<VideoDataType | null>(null)
  const [isPlayingVideo, setIsPlayingVideo] = useState(false)
  const [frameImages, setFrameImages] = useState<string[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status } = useSession()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  
  // Cast session user to ExtendedUser type
  const user = session?.user as ExtendedUser | undefined

  // Load and process video data
  useEffect(() => {
    const loadVideoData = async () => {
      try {
        if (videoData && videoData.frames && videoData.frames.length > 0) {
          // Validate the data
          const typedData = videoData as VideoDataType;
          setVideoFrameData(typedData);
          setIsVideoDataLoaded(true);
          
          // Convert frames to image data URLs
          const images = await convertFramesToImages(typedData.frames);
          setFrameImages(images);
          
          console.log(`✅ Loaded ${typedData.frames.length} frames from video data`);
        } else {
          console.warn("⚠️ No video data found or empty frames");
        }
      } catch (error) {
        console.error("❌ Error loading video data:", error);
      }
    };

    loadVideoData();
  }, []);

  // Convert pixel data to image data URLs
  const convertFramesToImages = (frames: VideoFrame[]): Promise<string[]> => {
    return new Promise((resolve) => {
      const images: string[] = [];
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve([]);
        return;
      }

      frames.forEach((frame, index) => {
        try {
          canvas.width = frame.width;
          canvas.height = frame.height;
          
          const imageData = new ImageData(frame.width, frame.height);
          const data = imageData.data;
          
          // Copy pixel data
          const pixelCount = Math.min(frame.pixels.length, data.length);
          for (let i = 0; i < pixelCount; i++) {
            data[i] = frame.pixels[i];
          }
          
          ctx.putImageData(imageData, 0, 0);
          images.push(canvas.toDataURL('image/jpeg', 0.8));
        } catch (error) {
          console.error(`Error processing frame ${index}:`, error);
        }
      });
      
      resolve(images);
    });
  };

  // Animation loop for the logo
  useEffect(() => {
    if (isVideoDataLoaded && isPlayingVideo && frameImages.length > 0) {
      let frameIndex = 0;
      
      const animateLogo = () => {
        setCurrentImageIndex(frameIndex);
        frameIndex = (frameIndex + 1) % frameImages.length;
        
        animationFrameRef.current = requestAnimationFrame(animateLogo);
      };
      
      // Start animation
      animationFrameRef.current = requestAnimationFrame(animateLogo);
      
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [isVideoDataLoaded, isPlayingVideo, frameImages]);

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden'
      document.documentElement.classList.add('mobile-menu-open')
    } else {
      document.body.style.overflow = 'unset'
      document.documentElement.classList.remove('mobile-menu-open')
    }
    return () => {
      document.body.style.overflow = 'unset'
      document.documentElement.classList.remove('mobile-menu-open')
    }
  }, [isMenuOpen])

  // Render the current frame to canvas
  const renderCurrentFrame = () => {
    if (!canvasRef.current || !videoFrameData || frameImages.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const currentFrame = videoFrameData.frames[currentFrameIndex % videoFrameData.frames.length];
    if (!currentFrame) return;
    
    try {
      // Create ImageData from pixel data
      const imageData = new ImageData(currentFrame.width, currentFrame.height);
      const data = imageData.data;
      
      // Copy pixel data
      const pixelCount = Math.min(currentFrame.pixels.length, data.length);
      for (let i = 0; i < pixelCount; i++) {
        data[i] = currentFrame.pixels[i];
      }
      
      // Clear canvas and draw
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.putImageData(imageData, 0, 0);
    } catch (error) {
      console.error("Error rendering frame:", error);
    }
  };

  // Toggle video animation
  const toggleVideoAnimation = () => {
    if (!isVideoDataLoaded || frameImages.length === 0) {
      console.warn("No video data available to play");
      return;
    }
    
    setIsPlayingVideo(!isPlayingVideo);
    
    // If starting animation, reset to first frame
    if (!isPlayingVideo) {
      setCurrentImageIndex(0);
    }
  };

  // Comprehensive user validation function
  const validateUserSession = async () => {
    if (!user?.id && !user?.email) {
      return true
    }

    try {
      setIsCheckingStatus(true)
      setValidationError(null)
      
      let userData = null
      
      const endpoints = [
        `/users/${user.id}`,
        `/staff/${user.id}`,
        `/users/email/${user.email}`,
        `/staff/email/${user.email}`,
        '/users/current'
      ]
      
      for (const ep of endpoints) {
        try {
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
          continue
        }
      }
      
      if (!userData) {
        setValidationError('User account not found')
        await handleLogout(true, '?error=user_not_found')
        return false
      }
      
      if (userData.status && userData.status !== 'active') {
        setValidationError(`Account is ${userData.status}`)
        await handleLogout(true, `?error=account_${userData.status}`)
        return false
      }
      
      return true
      
    } catch (error: any) {
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        return true
      }
      if (error.response?.status === 404) {
        setValidationError('User account not found')
        await handleLogout(true, '?error=user_not_found')
        return false
      }
      return true
    } finally {
      setIsCheckingStatus(false)
    }
  }

  useEffect(() => {
    let validationTimeout: NodeJS.Timeout
    let isMounted = true

    const validateInitialSession = async () => {
      if (user && isMounted) {
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

  useEffect(() => {
    if (!user) return

    const staffRoles = ['admin', 'kitchen', 'stock_manager', 'purchasing', 'delivery', 'waitress', 'fb', 'marketing', 'finance', 'pos']
    const isStaff = staffRoles.includes(user.role)
    const intervalTime = !isStaff ? 300000 : 60000

    const intervalId = setInterval(async () => {
      await validateUserSession()
    }, intervalTime)

    return () => clearInterval(intervalId)
  }, [user?.id, user?.email, user?.role])

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

  // Helper function to check if a route is active
  const isRouteActive = (href: string) => {
    if (href === "/home") {
      return pathname === "/home" 
    }
    return pathname === href
  }

  const NavLink = ({ href, icon: Icon, children, onClick }: NavLinkProps) => {
    const isActive = isRouteActive(href)
    
    return (
      <Link
        href={href}
        onClick={onClick}
        className={`relative flex items-center text-base font-medium transition-colors duration-200 whitespace-nowrap ${
          isActive ? "text-purple-900" : "text-gray-600 hover:text-purple-900"
        }`}
      >
        <Icon className="w-5 h-5 mr-2 md:hidden" />
        <span>{children}</span>
        {isActive && (
          <motion.div
            className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-900"
            layoutId="underline"
            initial={false}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
      </Link>
    )
  }

  const handleLogout = async (isSilent: boolean = false, redirectPath: string = "/login") => {
    try {
      localStorage.removeItem("rememberedEmail")
      localStorage.removeItem("next-auth.session-token")
      localStorage.removeItem("next-auth.callback-url")
      localStorage.removeItem("next-auth.csrf-token")
      sessionStorage.clear()
      setValidationError(null)
      setIsMenuOpen(false)
      
      await signOut({ 
        redirect: !isSilent,
        callbackUrl: isSilent ? undefined : redirectPath
      })
      
      if (isSilent) {
        router.push(redirectPath)
      }
    } catch (error) {
      window.location.href = redirectPath
    }
  }

  const getDashboardLink = (role: Role): { path: string, label: string, icon: React.ComponentType<{ className?: string }> } => {
    const roleRoutes: Record<Role, { path: string, label: string, icon: React.ComponentType<{ className?: string }> }> = {
      admin: { path: "/dashboard", label: "Admin Dashboard", icon: LayoutDashboard },
      pos: { path: "/pos", label: "Point of Sale", icon: ShoppingCart },
      kitchen: { path: "/orders", label: "Kitchen Orders", icon: ChefHat },
      fb: { path: "/items", label: "Food & Beverage", icon: UtensilsCrossed },
      "f&b": { path: "/items", label: "Food & Beverage", icon: UtensilsCrossed },
      marketing: { path: "/blog", label: "Marketing Dashboard", icon: Megaphone },
      finance: { path: "/sales", label: "Finance Dashboard", icon: DollarSign },
      stock_manager: { path: "/stock", label: "Stock Management", icon: Package },
      purchasing: { path: "/purchase-request", label: "Purchasing Dashboard", icon: ShoppingBag },
      delivery: { path: "/delivery", label: "Delivery Dashboard", icon: Truck },
      waitress: { path: "/pos", label: "Take Orders", icon: Store },
      customer: { path: "/blogs", label: "Blogs", icon: BookOpen },
      user: { path: "/", label: "Dashboard", icon: LayoutDashboard }
    }
    
    return roleRoutes[role] || { path: "/", label: "Dashboard", icon: LayoutDashboard }
  }

  const handleLoginClick = () => {
    setIsMenuOpen(false)
    router.push("/login")
  }

  const handleRegisterClick = () => {
    setIsMenuOpen(false)
    router.push("/Register")
  }

  // Component to render animated logo
  const AnimatedLogo = () => {
    // If video data is loaded and we have images, show the animated version
    if (isVideoDataLoaded && frameImages.length > 0) {
      const currentImage = frameImages[currentImageIndex % frameImages.length];
      
      return (
        <div className="relative">
          <img 
            src={currentImage}
            alt="Manyazewal Animated Logo"
            className="w-auto h-10 md:h-12 rounded-xl border border-transparent group-hover:border-purple-900 shadow-sm group-hover:shadow-md transition-all duration-300 object-contain"
            style={{ 
              width: 'auto',
              maxWidth: '80px',
              height: '40px',
              objectFit: 'contain'
            }}
          />
          
          {/* Play indicator */}
          {isPlayingVideo && (
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse border-2 border-white" />
          )}
          
          {/* Frame counter badge */}
          <div className="absolute -top-1 -right-1 bg-purple-600 text-white text-[8px] px-1.5 py-0.5 rounded-full">
            {videoFrameData?.metadata?.totalFrames || 0}f
          </div>
        </div>
      );
    }

    // Fallback to static image
    return (
      <Image 
        src="/man_logo.jpg" 
        alt="Manyazewal Logo" 
        width={80} 
        height={80} 
        className="w-auto h-10 md:h-12 transition-transform duration-300 group-hover:scale-105 rounded-xl border border-transparent group-hover:border-purple-900 shadow-sm group-hover:shadow-md" 
      />
    );
  };

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
                className="relative group hover:bg-purple-100 transition-colors px-4"
              >
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <User className="w-5 h-5 text-purple-900" />
                    <motion.div
                      className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-white"
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    />
                  </div>
                  <span className="hidden md:inline font-medium text-purple-900">
                    {displayName}
                  </span>
                  <ArrowRight className="w-4 h-4 text-purple-900/60 hidden md:inline" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.name || user.email}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {userRole.toLowerCase().replace(/_/g, ' ')}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={dashboardPath} className="flex items-center w-full cursor-pointer">
                  <DashboardIcon className="w-4 h-4 mr-2 text-purple-900" />
                  <span className="font-medium">{dashboardLabel}</span>
                </Link>
              </DropdownMenuItem>
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

    return (
      <div className="flex items-center gap-3">
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
            className="relative overflow-hidden group bg-purple-200/20 backdrop-blur-sm text-purple-700 border-purple-300 hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-all duration-300 px-6"
          >
            <span className="font-medium tracking-wide">Register</span>
          </Button>
        </motion.div>
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
            className="relative overflow-hidden group bg-purple-600 text-white border border-purple-400 hover:bg-transparent hover:text-purple-700 hover:border-purple-600 shadow-lg hover:shadow-md transition-all duration-300 px-6"
          >
            <span className="font-semibold tracking-wide relative z-10">Login</span>
          </Button>
        </motion.div>
      </div>
    )
  }

  // Video controls for the logo
  const VideoLogoControls = () => {
    if (!isVideoDataLoaded || frameImages.length === 0) return null;
    
    return (
      <div className="absolute -bottom-2 -right-2 flex items-center gap-1 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-lg px-1.5 py-0.5 backdrop-blur-sm border border-gray-200 dark:border-gray-700">
        <button
          onClick={toggleVideoAnimation}
          className="p-0.5 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
          aria-label={isPlayingVideo ? "Pause animation" : "Play animation"}
        >
          {isPlayingVideo ? (
            <Pause className="w-3 h-3 text-purple-700 dark:text-purple-300" />
          ) : (
            <Play className="w-3 h-3 text-purple-700 dark:text-purple-300" />
          )}
        </button>
        <span className="text-[8px] text-gray-500 dark:text-gray-400 font-mono">
          {currentImageIndex + 1}/{frameImages.length}
        </span>
      </div>
    );
  };

  return (
    <>
      {/* Sub Header - Modern Mobile-Friendly Layout */}
      <div className="bg-gradient-to-r from-purple-900 to-purple-800 text-white border-b border-purple-700/50">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          {/* Desktop Layout */}
          <div className="hidden md:flex items-center justify-between py-2">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-purple-300" />
                <a href="tel:+251911234567" className="hover:text-purple-200 transition-colors">+251 911 234 567</a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-purple-300" />
                <a href="mailto:info@manyazewal.com" className="hover:text-purple-200 transition-colors">info@manyazewal.com</a>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-purple-300" />
                <span>Bole, Addis Ababa, Ethiopia</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-300" />
                <span>Open: 9:00 AM - 10:00 PM</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-purple-300 text-xs">Follow us:</span>
              <div className="flex items-center gap-2">
                {socialLinks.map((social) => (
                  <motion.a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-300 ${social.color}`}
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label={social.label}
                  >
                    <social.icon className="w-4 h-4" />
                  </motion.a>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile Layout - Social Icons Left, Auth Text Right */}
          <div className="flex md:hidden items-center justify-between py-2">
            {/* Left Section - Social Icons */}
            <div className="flex items-center gap-2">
              {socialLinks.map((social) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-300 ${social.color}`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label={social.label}
                >
                  <social.icon className="w-3.5 h-3.5" />
                </motion.a>
              ))}
            </div>

            {/* Right Section - Login/Register Text Links */}
            <div className="flex items-center gap-3">
              {!user ? (
                <>
                  <button
                    onClick={handleRegisterClick}
                    className="text-xs font-medium text-white/90 hover:text-white transition-colors"
                  >
                    Register
                  </button>
                  <span className="text-white/30 text-xs">|</span>
                  <button
                    onClick={handleLoginClick}
                    className="text-xs font-semibold text-white hover:text-purple-200 transition-colors"
                  >
                    Login
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-white" />
                    <motion.div
                      className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full border border-purple-900"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    />
                  </div>
                  <span className="text-xs font-medium text-white/90 truncate max-w-[100px]">
                    {user.name || user.email?.split('@')[0]}
                  </span>
                  <button
                    onClick={() => handleLogout(false)}
                    className="text-xs text-white/70 hover:text-white transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-50 bg-purple-200/40 backdrop-blur-md supports-[backdrop-filter]:bg-purple-200/30 shadow-sm">
        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between h-16 md:h-20">
            <div className="flex items-center flex-1">
              <Link href="/" className="flex items-center group relative">
                <motion.div 
                  whileHover={{ scale: 1.05 }} 
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  className="relative"
                >
                  <AnimatedLogo />
                  
                  {/* Video controls overlay */}
                  {isVideoDataLoaded && frameImages.length > 0 && (
                    <VideoLogoControls />
                  )}
                </motion.div>
              </Link>
            </div>
            <div className="hidden md:flex md:items-center md:justify-center md:flex-1 md:gap-4 lg:gap-8">
              {navLinks.map((link) => (
                <NavLink key={link.href} href={link.href} icon={link.icon}>
                  {link.label}
                </NavLink>
              ))}
            </div>
            <div className="flex items-center justify-end flex-1 gap-4">
              <div className="hidden md:flex items-center">
                {renderUserMenu()}
              </div>
              <div className="md:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMenuOpen(true)}
                  aria-label="Open menu"
                  className="relative text-purple-900 hover:bg-purple-100"
                >
                  <Menu className="w-6 h-6" />
                </Button>
              </div>
            </div>
          </nav>
        </div>
      </header>

      {/* Mobile Side Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100]"
              onClick={() => setIsMenuOpen(false)}
              style={{ top: 0, left: 0, right: 0, bottom: 0 }}
            />
            
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 350 }}
              className="fixed top-0 right-0 bottom-0 w-[75%] max-w-sm bg-white dark:bg-gray-900 shadow-2xl z-[101] overflow-hidden"
              style={{ top: 0, right: 0, bottom: 0 }}
            >
              <div className="flex flex-col h-full">
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </button>

                <div className="flex-1 px-4 py-4 space-y-3 overflow-y-auto">
                  {/* Navigation Links */}
                  <div className="space-y-0.5">
                    {navLinks.map((link) => {
                      const isActive = isRouteActive(link.href)
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setIsMenuOpen(false)}
                          className={`block py-2 text-sm font-medium transition-all duration-200 rounded-md ${
                            isActive
                              ? "text-purple-900 bg-purple-50 border-l-4 border-purple-900 pl-3 -ml-0.5" 
                              : "text-gray-700 hover:text-purple-900 hover:bg-purple-50/50 pl-3"
                          }`}
                        >
                          {link.label}
                        </Link>
                      )
                    })}
                  </div>
                  
                  <div className="border-t border-gray-100 dark:border-gray-800 my-1"></div>
                  
                  {/* Auth Section */}
                  <div className="space-y-2">
                    {!user ? (
                      <div className="flex gap-2 pt-1">
                        <Button 
                          variant="default" 
                          size="sm"
                          className="flex-1 bg-purple-600 text-white text-xs py-1.5 h-auto rounded-md"
                          onClick={handleLoginClick}
                        >
                          Login
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1 border-purple-300 text-purple-700 text-xs py-1.5 h-auto rounded-md"
                          onClick={handleRegisterClick}
                        >
                          Register
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-md px-2 py-1.5">
                          <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                            {user.name || user.email}
                          </p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 capitalize">
                            {user.role.toLowerCase().replace(/_/g, ' ')}
                          </p>
                        </div>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full text-xs py-1.5 h-auto rounded-md justify-start"
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
                          <LayoutDashboard className="w-3 h-3 mr-1.5" />
                          {getDashboardLink(user.role).label}
                        </Button>

                        {user.role === 'purchasing' && (
                          <div className="flex gap-1.5">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex-1 text-[10px] py-1 h-auto rounded-md justify-center"
                              onClick={() => {
                                router.push("/purchase-request")
                                setIsMenuOpen(false)
                              }}
                            >
                              <ShoppingBag className="w-2.5 h-2.5 mr-1" />
                              Requests
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex-1 text-[10px] py-1 h-auto rounded-md justify-center"
                              onClick={() => {
                                router.push("/suppliers")
                                setIsMenuOpen(false)
                              }}
                            >
                              <Package className="w-2.5 h-2.5 mr-1" />
                              Suppliers
                            </Button>
                          </div>
                        )}

                        {user.role === 'delivery' && (
                          <div className="flex gap-1.5">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex-1 text-[10px] py-1 h-auto rounded-md justify-center"
                              onClick={() => {
                                router.push("/delivery/pending")
                                setIsMenuOpen(false)
                              }}
                            >
                              <Truck className="w-2.5 h-2.5 mr-1" />
                              Pending
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex-1 text-[10px] py-1 h-auto rounded-md justify-center"
                              onClick={() => {
                                router.push("/delivery/active")
                                setIsMenuOpen(false)
                              }}
                            >
                              <ClipboardList className="w-2.5 h-2.5 mr-1" />
                              Active
                            </Button>
                          </div>
                        )}

                        {user.role === 'waitress' && (
                          <div className="flex gap-1.5">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex-1 text-[10px] py-1 h-auto rounded-md justify-center"
                              onClick={() => {
                                router.push("/pos")
                                setIsMenuOpen(false)
                              }}
                            >
                              <Store className="w-2.5 h-2.5 mr-1" />
                              Order
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex-1 text-[10px] py-1 h-auto rounded-md justify-center"
                              onClick={() => {
                                router.push("/myorders")
                                setIsMenuOpen(false)
                              }}
                            >
                              <ClipboardList className="w-2.5 h-2.5 mr-1" />
                              My Orders
                            </Button>
                          </div>
                        )}

                        {user.requiresPasswordChange && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="w-full border-amber-200 text-amber-600 text-xs py-1.5 h-auto rounded-md justify-start"
                            onClick={() => {
                              router.push("/change-password")
                              setIsMenuOpen(false)
                            }}
                          >
                            <AlertCircle className="w-3 h-3 mr-1.5" />
                            Change Password
                          </Button>
                        )}
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="w-full border-red-200 text-red-600 text-xs py-1.5 h-auto rounded-md justify-start hover:bg-red-50"
                          onClick={() => {
                            handleLogout(false)
                            setIsMenuOpen(false)
                          }}
                        >
                          <LogOut className="w-3 h-3 mr-1.5" />
                          Logout
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Video Data Info */}
                  {isVideoDataLoaded && videoFrameData && (
                    <div className="space-y-1.5 pt-1 border-t border-gray-100 dark:border-gray-800">
                      <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">Video Data</p>
                      <div className="grid grid-cols-2 gap-1">
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded px-1.5 py-1">
                          <p className="text-[8px] text-gray-500 dark:text-gray-400">Frames</p>
                          <p className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                            {videoFrameData.metadata.totalFrames}
                          </p>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded px-1.5 py-1">
                          <p className="text-[8px] text-gray-500 dark:text-gray-400">Duration</p>
                          <p className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                            {Math.round(videoFrameData.metadata.duration)}s
                          </p>
                        </div>
                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded px-1.5 py-1 col-span-2">
                          <p className="text-[8px] text-gray-500 dark:text-gray-400">Quality</p>
                          <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 capitalize">
                            {videoFrameData.metadata.extractionQuality}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Contact Info */}
                  <div className="space-y-1.5 pt-1 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">Contact</p>
                    <div className="space-y-1">
                      <a href="tel:+251911234567" className="flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-purple-600 transition-colors">
                        <Phone className="w-2.5 h-2.5" />
                        +251 911 234 567
                      </a>
                      <a href="mailto:info@manyazewal.com" className="flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-purple-600 transition-colors">
                        <Mail className="w-2.5 h-2.5" />
                        info@manyazewal.com
                      </a>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                        <MapPin className="w-2.5 h-2.5" />
                        Bole, Addis Ababa
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                        <Clock className="w-2.5 h-2.5" />
                        9AM - 10PM
                      </div>
                    </div>
                  </div>

                  {/* Social Media */}
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">Follow</p>
                    <div className="flex gap-2">
                      {socialLinks.map((social) => (
                        <motion.a
                          key={social.label}
                          href={social.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`p-1.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-all duration-200 ${social.color}`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          aria-label={social.label}
                        >
                          <social.icon className="w-3 h-3" />
                        </motion.a>
                      ))}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="pt-1 pb-1">
                    <p className="text-[8px] text-center text-gray-400">© 2024 Manyazewal Restaurant</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}