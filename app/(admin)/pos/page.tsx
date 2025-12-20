"use client"

import { useState, useEffect, useCallback, useMemo, Suspense, lazy, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { toast } from "react-hot-toast"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  Search,
  ShoppingCart,
  Minus,
  Plus,
  X,
  Users,
  Utensils,
  Coffee,
  Pizza,
  SandwichIcon as Hamburger,
  IceCream,
  Clock,
  ChefHat,
  Sparkles,
  Loader2,
  Receipt,
  CreditCard,
  Check,
  Tag,
  MapPin,
  Phone,
  User as UserIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

interface MenuItem {
  _id: string
  name: string
  description: string
  price: number
  imageUrl: string
  categoryId: string
  preparationTime: number
  calories: number
  tags: string[]
}

interface Category {
  _id: string
  name: string
  type: string
  imageUrl: string
}

interface CartItem extends MenuItem {
  quantity: number
  specialInstructions?: string
}

interface Waiter {
  _id: string
  name: string
  shift: string
  avatar: string
}

// Custom debounce function implementation
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
};

const getCategoryIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case "food":
      return <Utensils className="h-5 w-5" />
    case "drink":
      return <Coffee className="h-5 w-5" />
    case "pizza":
      return <Pizza className="h-5 w-5" />
    case "burger":
      return <Hamburger className="h-5 w-5" />
    case "dessert":
      return <IceCream className="h-5 w-5" />
    default:
      return <Utensils className="h-5 w-5" />
  }
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}

// Lazily loaded components
const MenuItemComponent = lazy(() => {
  return new Promise<{ default: React.ComponentType<any> }>((resolve) => {
    setTimeout(() => {
      resolve({
        default: ({
          item,
          addToCart,
        }: {
          item: MenuItem
          addToCart: (item: MenuItem) => void
        }) => (
          <Card className="overflow-hidden h-full transition-all duration-300 hover:shadow-md hover:scale-[1.01] bg-background hover:bg-background/95 rounded-lg border-border/40 hover:border-primary/30 group">
            <div className="relative aspect-square sm:aspect-[4/3] overflow-hidden rounded-t-lg">
              <Image
                src={item.imageUrl || "/placeholder.svg"}
                alt={item.name}
                fill
                sizes="(max-width: 640px) 150px, (max-width: 1200px) 200px, 250px"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
              {/* Price badge */}
              <div className="absolute top-2 right-2 bg-black/75 text-white text-xs font-semibold px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                {new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(item.price)}
              </div>
              
              {/* Bestseller badge */}
              {item.tags?.includes('bestseller') && (
                <div className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-[9px] font-medium px-1.5 py-0.5 rounded-md backdrop-blur-sm flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5" />
                  Best
                </div>
              )}
              
              {/* Quick add overlay */}
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <Button
                  variant="default"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    const button = e.currentTarget;
                    
                    // Add ripple effect
                    button.classList.add("animate-pulse");
                    setTimeout(() => button.classList.remove("animate-pulse"), 300);
                    
                    // Add to cart with feedback
                    addToCart(item);
                  }}
                  className="rounded-full shadow-lg hover:shadow-primary/25 transition-all duration-300 transform hover:scale-105 bg-primary/90 backdrop-blur-sm"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add to cart
                </Button>
              </div>
            </div>
            
            <CardContent className="p-2 sm:p-3 flex flex-col gap-1 sm:gap-2 h-full">
              <div className="space-y-0.5 flex-grow">
                <h3 className="font-medium text-xs sm:text-sm line-clamp-1 group-hover:text-primary transition-colors">{item.name}</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1 sm:line-clamp-2">{item.description}</p>
              </div>

              <div className="flex items-center justify-between mt-auto pt-1">
                <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                  <Badge variant="outline" className="h-4 px-1 text-[8px] font-normal flex items-center gap-0.5">
                    <Clock className="h-2 w-2" />
                    {item.preparationTime}m
                  </Badge>
                  <Badge variant="outline" className="h-4 px-1 text-[8px] font-normal flex items-center gap-0.5">
                    <Utensils className="h-2 w-2" />
                    {item.calories}cal
                  </Badge>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    
                    // Add ripple effect
                    const circle = document.createElement("span");
                    const diameter = Math.max(e.currentTarget.clientWidth, e.currentTarget.clientHeight);
                    const radius = diameter / 2;
                    
                    circle.style.width = circle.style.height = `${diameter}px`;
                    circle.style.left = `${e.clientX - e.currentTarget.offsetLeft - radius}px`;
                    circle.style.top = `${e.clientY - e.currentTarget.offsetTop - radius}px`;
                    circle.classList.add("ripple");
                    
                    const ripple = e.currentTarget.getElementsByClassName("ripple")[0];
                    if (ripple) {
                      ripple.remove();
                    }
                    
                    e.currentTarget.appendChild(circle);
                    
                    // Add to cart
                    addToCart(item);
                  }}
                  className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-primary/10 hover:bg-primary/20 text-primary p-0 relative overflow-hidden transition-transform hover:scale-110"
                >
                  <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span className="sr-only">Add to cart</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ),
      })
    }, 50)
  })
})

const MenuItemFallback = () => (
  <div className="overflow-hidden h-full rounded-lg border border-border/40 bg-background/60">
    <div className="relative aspect-square sm:aspect-[4/3] bg-muted/40 animate-pulse rounded-t-lg"></div>
    <div className="p-2 sm:p-3 space-y-1 sm:space-y-2">
      <div className="h-3 bg-muted/40 animate-pulse rounded-md w-3/4"></div>
      <div className="h-2 bg-muted/40 animate-pulse rounded-md w-full"></div>
      <div className="pt-1 flex items-center justify-between">
        <div className="h-3 bg-muted/40 animate-pulse rounded-md w-1/3"></div>
        <div className="h-5 w-5 bg-muted/40 animate-pulse rounded-full"></div>
      </div>
    </div>
  </div>
)

export default function OrderPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [waiters, setWaiters] = useState<Waiter[]>([])
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedWaiter, setSelectedWaiter] = useState("")
  const [tableNumber, setTableNumber] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [orderNumber, setOrderNumber] = useState(`ORD-${Date.now()}`)
  const [numberOfGuests, setNumberOfGuests] = useState(1)
  const [specialRequirements, setSpecialRequirements] = useState("")
  const [applyDiscount, setApplyDiscount] = useState(false)
  const [insufficientStockItem, setInsufficientStockItem] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [orderProgress, setOrderProgress] = useState(0)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [activeView, setActiveView] = useState<'grid' | 'list'>('grid')
  const [activeTab, setActiveTab] = useState<'menu' | 'intable' | 'delivery' | 'pos'>('menu')
  const [orders, setOrders] = useState<any[]>([])

  // Use debounce hook for search
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Detect tablet/mobile devices
  useEffect(() => {
    const checkDevice = () => {
      setIsTablet(window.innerWidth < 1024);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Add global styles for ripple effect and animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .ripple {
        position: absolute;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
      }
      
      @keyframes ripple {
        to {
          transform: scale(2);
          opacity: 0;
        }
      }
      
      .scale-in {
        animation: scaleIn 0.2s ease forwards;
      }
      
      @keyframes scaleIn {
        from {
          transform: scale(0.9);
          opacity: 0;
        }
        to {
          transform: scale(1);
          opacity: 1;
        }
      }
      
      .pop {
        animation: pop 0.3s ease forwards;
      }
      
      @keyframes pop {
        0% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.1);
        }
        100% {
          transform: scale(1);
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemsRes, categoriesRes, waitersRes] = await Promise.all([
          fetch("/api/items"),
          fetch("/api/item-category"),
          fetch("/api/waitress"),
        ])

        const itemsData = await itemsRes.json()
        const categoriesData = await categoriesRes.json()
        const waitersData = await waitersRes.json()

        setItems(itemsData.items || [])
        setCategories(categoriesData.data || [])
        setWaiters(waitersData || [])
      } catch (error) {
        console.error("Error fetching data:", error)
        toast.error("Failed to load menu data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Fetch orders for the dashboard view
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch("/api/order?autoProcess=false");
        const data = await res.json();
        if (data.success) {
          setOrders(data.orders || []);
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
      }
    };
    fetchOrders();
    // Set up polling for real-time updates
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  // Use memoized filtered items for better performance
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory = selectedCategory === "all" || item.categoryId === selectedCategory
      const matchesSearch = item.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [items, selectedCategory, debouncedSearchQuery])

  // Filter orders based on active tab
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (activeTab === 'delivery') {
        return order.delivery === true;
      } else if (activeTab === 'intable') {
        return order.inTable === true;
      } else {
        // POS orders: neither delivery nor inTable (or explicitly false)
        return !order.delivery && !order.inTable;
      }
    });
  }, [orders, activeTab]);

  const addToCart = useCallback((item: MenuItem) => {
    // Check for insufficient stock (simulated check)
    const insufficientStock = Math.random() < 0.1; // 10% chance of insufficient stock for demo
    
    if (insufficientStock) {
      toast.error(`Sorry, ${item.name} is out of stock!`, {
        icon: "❌",
        style: {
          borderRadius: "10px",
          background: "#333",
          color: "#fff",
          border: "1px solid rgba(220, 38, 38, 0.2)",
        },
        duration: 3000,
      });
      
      setInsufficientStockItem(item.name);
      return;
    }
    
    // Add item to cart with animation
    setCart((prev) => {
      const existing = prev.find((i) => i._id === item._id)
      if (existing) {
        return prev.map((i) => (i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i))
      }
      return [...prev, { ...item, quantity: 1 }]
    })
    
    // Open cart on small screens
    if (isTablet) {
      setIsCartOpen(true);
    }
    
    // Show success toast
    toast.success(`Added ${item.name} to cart`, {
      icon: "🛒",
      style: {
        borderRadius: "10px",
        background: "#333",
        color: "#fff",
        border: "1px solid rgba(34, 197, 94, 0.2)",
      },
      duration: 2000,
    })
  }, [isTablet])

  const removeFromCart = useCallback((itemId: string) => {
    setCart((prev) => prev.filter((item) => item._id !== itemId))
    toast.success("Item removed from cart", {
      icon: "🗑️",
      style: {
        borderRadius: "10px",
        background: "#333",
        color: "#fff",
      },
    })
  }, [])

  const updateQuantity = useCallback(
    (itemId: string, newQuantity: number) => {
      if (newQuantity < 1) {
        removeFromCart(itemId)
        return
      }
      setCart((prev) => prev.map((item) => (item._id === itemId ? { ...item, quantity: newQuantity } : item)))
    },
    [removeFromCart],
  )

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const tax = subtotal * 0.15
  const discount = applyDiscount ? subtotal * 0.1 : 0
  const total = subtotal + tax - discount

  const handlePlaceOrder = async () => {
    if (!selectedWaiter || !tableNumber || cart.length === 0) {
      toast.error("Please fill in all required fields")
      return
    }

    const orderData = {
      orderNumber,
      tableNumber,
      waiterId: selectedWaiter,
      customerId: "walk-in",
      numberOfGuests,
      items: cart.map(item => ({
        itemId: item._id,
        quantity: item.quantity,
        specialInstructions: item.specialInstructions || "",
        status: "PENDING",
      })),
      status: "PENDING",
      discount: discount,
      paymentMethod: "CARD",
      specialRequirements,
      isActive: true,
    }

    const orderToast = toast.loading("Placing your order...")

    try {
      const response = await fetch("/api/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      })

      const responseData = await response.json()

      if (response.ok) {
        toast.success("Order placed successfully!", { id: orderToast })
        setCart([])
        setOrderNumber(`ORD-${Date.now()}`)
        // Refresh orders list
        fetch("/api/order?autoProcess=false").then(res => res.json()).then(data => { if(data.success) setOrders(data.orders || []) });
        router.refresh()

        let progress = 0
        const interval = setInterval(() => { // This logic seems to be for UI feedback and is fine.
          progress += 10
          setOrderProgress(progress)
          if (progress >= 100) {
            clearInterval(interval)
            toast.success("Your order is ready!")
          }
        }, 1000)
      } else {
        const errorMessage = responseData.message || "An unknown error occurred";
        if (errorMessage.includes("Insufficient stock")) {
          const itemName = responseData.itemName || "the selected item";
          setInsufficientStockItem(itemName);
          toast.error(`Insufficient stock for ${itemName}`, { id: orderToast });
        } else {
          throw new Error(errorMessage);
        }
      }
    } catch (error) {
      console.error("Error placing order:", error)
      toast.error("Failed to place order", { id: orderToast })
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-background/80">
        <motion.div
          className="text-center space-y-4 w-full max-w-xs sm:max-w-sm px-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" style={{ animationDuration: '2s' }}></div>
            <div className="relative flex items-center justify-center w-full h-full bg-background rounded-full border-2 border-primary/40">
              <ChefHat className="h-10 w-10 text-primary" />
            </div>

          </div>
          <h2 className="text-xl sm:text-2xl font-semibold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Preparing your gourmet experience...
          </h2>
          <Progress value={33} className="w-full mx-auto h-2" />
          <p className="text-sm text-muted-foreground">Loading menu items and categories</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background/95 overflow-hidden max-w-full">
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden max-w-full">
        {/* Header */}
        <header className="border-b bg-background/80 backdrop-blur-sm p-2 sm:p-3 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.back()}
                className="rounded-full shrink-0 h-8 w-8"
            >
                <ArrowLeft className="w-4 h-4" />
                <span className="sr-only">Go back</span>
            </Button>
              
            <div>
                <h1 className="text-base sm:text-lg font-bold">POS System</h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Create and manage orders</p>
            </div>
          </div>
            
            {/* Tab Switcher */}
            <div className="flex bg-muted/50 p-1 rounded-lg order-4 w-full sm:w-auto justify-center sm:justify-start mt-2 sm:mt-0">
              <Button
                variant={activeTab === 'menu' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('menu')}
                className="text-xs h-7 px-3"
              >
                Menu
              </Button>
              <Button
                variant={activeTab === 'intable' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('intable')}
                className="text-xs h-7 px-3"
              >
                In Table
              </Button>
              <Button
                variant={activeTab === 'delivery' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('delivery')}
                className="text-xs h-7 px-3"
              >
                Delivery
              </Button>
              <Button
                variant={activeTab === 'pos' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('pos')}
                className="text-xs h-7 px-3"
              >
                POS
              </Button>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap order-3 sm:order-2 w-full sm:w-auto mt-2 sm:mt-0">
              <Select value={tableNumber} onValueChange={setTableNumber}>
                <SelectTrigger className="w-[70px] sm:w-[85px] lg:w-[100px] bg-background/70 text-xs h-8">
                  <SelectValue placeholder="Table #" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 20 }, (_, i) => (
                    <SelectItem key={i} value={`T${i + 1}`}>Table {i + 1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
            <Select value={selectedWaiter} onValueChange={setSelectedWaiter}>
                <SelectTrigger className="w-[calc(100%-80px-8px)] sm:w-[130px] lg:w-[150px] bg-background/70 text-xs h-8">
                  <SelectValue placeholder="Select Server" />
              </SelectTrigger>
              <SelectContent>
                {waiters.map((waiter) => (
                  <SelectItem key={waiter._id} value={waiter._id}>
                    <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                        <AvatarImage src={waiter.avatar} alt={waiter.name} />
                        <AvatarFallback>{getInitials(waiter.name)}</AvatarFallback>
                      </Avatar>
                        <span className="truncate text-xs">{waiter.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
            
            <div className="flex items-center gap-2 order-2 sm:order-3">
              <div className="hidden md:flex items-center mr-1">
                <Button 
                  variant={activeView === 'grid' ? 'default' : 'outline'} 
                  size="icon" 
                  className="h-7 w-7 rounded-l-md rounded-r-none"
                  onClick={() => setActiveView('grid')}
                >
                  <div className="grid grid-cols-2 gap-0.5">
                    <div className="w-1 h-1 rounded-sm bg-current"></div>
                    <div className="w-1 h-1 rounded-sm bg-current"></div>
                    <div className="w-1 h-1 rounded-sm bg-current"></div>
                    <div className="w-1 h-1 rounded-sm bg-current"></div>
            </div>
                </Button>
                <Button 
                  variant={activeView === 'list' ? 'default' : 'outline'} 
                  size="icon" 
                  className="h-7 w-7 rounded-l-none rounded-r-md"
                  onClick={() => setActiveView('list')}
                >
                  <div className="flex flex-col items-center justify-center gap-0.5 w-full">
                    <div className="w-3 h-1 rounded-sm bg-current"></div>
                    <div className="w-3 h-1 rounded-sm bg-current"></div>
                    <div className="w-3 h-1 rounded-sm bg-current"></div>
                  </div>
                </Button>
              </div>
              
              <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
                <SheetTrigger asChild>
                  <Button variant="default" size="icon" className="relative shrink-0 h-8 w-8">
                    <ShoppingCart className="h-4 w-4" />
                    {cart.length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[9px] rounded-full h-4 w-4 flex items-center justify-center">
                        {cart.length}
                      </span>
                    )}
                    <span className="sr-only">Open cart</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full border-l">
                  <CartPanel 
                    cart={cart}
                    updateQuantity={updateQuantity}
                    removeFromCart={removeFromCart}
                    subtotal={subtotal}
                    tax={tax}
                    discount={discount}
                    total={total}
                    applyDiscount={applyDiscount}
                    setApplyDiscount={setApplyDiscount}
                    numberOfGuests={numberOfGuests}
                    setNumberOfGuests={setNumberOfGuests}
                    specialRequirements={specialRequirements}
                    setSpecialRequirements={setSpecialRequirements}
                    orderNumber={orderNumber}
                    handlePlaceOrder={handlePlaceOrder}
                    closeCart={() => setIsCartOpen(false)}
                  />
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>
        
        {/* Search & Categories */}
        {activeTab === 'menu' && (
        <div className="border-b bg-background/60 p-2 sm:p-3">
          <div className="max-w-6xl mx-auto space-y-2 sm:space-y-3 w-full">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
                placeholder="Search menu items..." 
              value={searchQuery}
              onChange={handleSearchChange}
                className="pl-8 bg-background pr-3 border-input h-8 text-xs sm:text-sm"
            />
          </div>
            
            <div className="flex w-full overflow-x-auto pb-1 hide-scrollbar">
              <div className="flex space-x-1.5 pb-1 w-max">
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('all')}
                  className="rounded-full shrink-0 h-7 text-xs"
                >
                  All
                </Button>
                
                {categories.map((category) => (
                  <Button
                    key={category._id}
                    variant={selectedCategory === category._id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(category._id)}
                    className="rounded-full whitespace-nowrap shrink-0 h-7 text-xs"
                  >
                    <span className="flex items-center gap-1 text-xs">
                      {getCategoryIcon(category.type)}
                      <span className="truncate max-w-[80px] sm:max-w-none">{category.name}</span>
                    </span>
                  </Button>
                ))}
          </div>
            </div>
          </div>
        </div>
        )}
        
        {/* Menu Items */}
        <div className="flex-1 p-2 sm:p-3 overflow-auto">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'menu' ? (
              <>
            {filteredItems.length > 0 ? (
              <div className={
                activeView === 'grid'
                  ? "grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 pb-16 md:pb-4"
                  : "flex flex-col gap-1.5 sm:gap-2 pb-16 md:pb-4"
              }>
                <AnimatePresence mode="popLayout">
                  {filteredItems.map((item, index) => (
                <motion.div
                  key={item._id}
                  layout
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      variants={fadeInUp}
                      transition={{ duration: 0.25, delay: index * 0.02 }}
                    >
                      {activeView === 'grid' ? (
                  <Suspense fallback={<MenuItemFallback />}>
                          <MenuItemComponent item={item} addToCart={addToCart} />
                  </Suspense>
                      ) : (
                        <ListViewItem item={item} addToCart={addToCart} />
                      )}
                    </motion.div>
                  ))}
          </AnimatePresence>
        </div>
            ) : (
      <motion.div
                className="flex flex-col items-center justify-center h-[50vh] text-center p-4"
                variants={fadeInUp}
                initial="initial"
                animate="animate"
              >
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Search className="h-6 w-6 text-muted-foreground" />
          </div>
                <h3 className="text-lg font-medium mb-1">No items found</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  We couldn't find any menu items matching your search criteria. 
                  Try adjusting your search or selecting a different category.
                </p>
                
                {searchQuery && (
                    <Button
                      variant="outline"
                    className="mt-3"
                    onClick={() => setSearchQuery('')}
                    >
                    Clear Search
                    </Button>
                )}
              </motion.div>
            )}
              </>
            ) : (
              /* Order List View for Delivery and InTable */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => (
                    <Card key={order._id} className="overflow-hidden border-l-4 border-l-primary">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-sm">{order.orderNumber}</h3>
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <Badge variant={order.status === 'COMPLETED' ? 'default' : 'secondary'} className="text-[10px]">
                            {order.status}
                          </Badge>
                        </div>

                        <Separator />

                        {/* Delivery Specific Info */}
                        {activeTab === 'delivery' && order.deliveryInfo && (
                          <div className="space-y-2 text-xs bg-muted/30 p-2 rounded-md">
                            <div className="flex items-center gap-2">
                              <UserIcon className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium">{order.deliveryInfo.fullName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span>{order.deliveryInfo.phoneNumber}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
                              <span className="line-clamp-2">{order.deliveryInfo.address}, {order.deliveryInfo.city}</span>
                            </div>
                            {order.paymentScreenshotUrl && (
                              <div className="mt-2">
                                <p className="text-[10px] text-muted-foreground mb-1">Payment Proof:</p>
                                <div className="relative h-20 w-full rounded-md overflow-hidden border">
                                  <Image 
                                    src={order.paymentScreenshotUrl} 
                                    alt="Payment" 
                                    fill 
                                    className="object-cover"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Table Specific Info */}
                        {activeTab === 'intable' && (
                          <div className="flex justify-between text-xs bg-muted/30 p-2 rounded-md">
                            <div>
                              <span className="text-muted-foreground">Table:</span>
                              <span className="font-bold ml-1">{order.tableNumber}</span>
                            </div>
                            {order.waiter && (
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">Server:</span>
                                <span>{order.waiter.name}</span>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-2">
                          <span className="text-xs font-medium">Total Amount</span>
                          <span className="text-sm font-bold text-primary">
                            {new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(order.finalAmount || order.totalAmount)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <div className="bg-muted/50 p-4 rounded-full mb-3">
                      <Receipt className="h-8 w-8" />
                    </div>
                    <p>No {activeTab === 'intable' ? 'table' : activeTab === 'delivery' ? 'delivery' : 'POS'} orders found</p>
                  </div>
                )}
              </div>
            )}
            </div>
            </div>
      </main>

      {/* Insufficient Stock Dialog - FIXED */}
      <Dialog open={!!insufficientStockItem} onOpenChange={() => setInsufficientStockItem(null)}>
        <DialogContent className="sm:max-w-md border-primary/10 bg-background/95 backdrop-blur-md rounded-2xl max-w-[90%] p-4 sm:p-6">
          <DialogHeader className="text-left">
            <DialogTitle>Insufficient Stock</DialogTitle>
            <DialogDescription>
              We're sorry, but there is not enough stock for the requested item.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <div className="bg-destructive/10 rounded-full p-2">
              <X className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="font-medium">{insufficientStockItem}</p>
              <p className="text-sm text-muted-foreground">
                Please adjust your order or check back later.
              </p>
            </div>
          </div>
          
          <DialogFooter className="sm:justify-end">
            <Button 
              onClick={() => setInsufficientStockItem(null)}
              className="w-full sm:w-auto rounded-xl text-sm"
              variant="default"
            >
              <Check className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> 
              Understood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Progress */}
      {orderProgress > 0 && orderProgress < 100 && (
        <motion.div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 lg:bottom-5 lg:left-5 lg:translate-x-0 bg-background/95 backdrop-blur-sm p-3 sm:p-4 rounded-xl shadow-lg border border-primary/20 z-30 w-[90%] max-w-xs"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-xs sm:text-base flex items-center gap-1.5 sm:gap-2">
              <div className="bg-primary/20 rounded-full p-1.5">
                <ChefHat className="h-3 w-3 sm:h-4 sm:w-4 text-primary animate-pulse" />
              </div>
              Preparing Your Order
            </h3>
            <Badge className="bg-primary/20 text-primary border-none px-2 text-xs">
              {orderProgress}%
            </Badge>
          </div>
          <Progress value={orderProgress} className="w-full mx-auto h-2 sm:h-2.5 bg-primary/10" />
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 sm:mt-2 text-center">Your culinary experience is being crafted</p>
        </motion.div>
      )}

      {/* Global styles */}
      <style jsx global>{`
        /* Hide scrollbar but allow scrolling */
        .hide-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
        
        .hide-scrollbar::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }
        
        /* Prevent horizontal overflow */
        html, body {
          max-width: 100vw;
          overflow-x: hidden;
          margin: 0;
          padding: 0;
        }
        
        /* Add responsive grid breakpoint */
        @media (min-width: 480px) and (max-width: 639px) {
          .xs\\:grid-cols-3 {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
        
        /* Improve touch interactions */
        @media (max-width: 767px) {
          button, a, [role="button"] {
            cursor: default;
            -webkit-tap-highlight-color: transparent;
          }
          
          input, select {
            font-size: 16px; /* Prevents iOS zoom */
          }
        }
      `}</style>
    </div>
  )
}

// List View Item Component
function ListViewItem({ item, addToCart }: { item: MenuItem; addToCart: (item: MenuItem) => void }) {
  return (
    <div className="flex border border-border/40 rounded-lg overflow-hidden hover:border-primary/30 transition-all bg-background hover:bg-background/95 hover:shadow-sm group">
      <div className="relative h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0 overflow-hidden">
        <Image
          src={item.imageUrl || "/placeholder.svg"}
          alt={item.name}
          fill
          sizes="(max-width: 640px) 56px, 64px"
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        {item.tags?.includes('bestseller') && (
          <div className="absolute top-0.5 left-0.5 bg-primary/90 text-primary-foreground text-[7px] font-medium px-1 py-0.5 rounded flex items-center gap-0.5">
            <Sparkles className="h-2 w-2" />
            Best
          </div>
        )}
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      </div>
      
      <div className="flex-1 p-1.5 sm:p-2 flex flex-col">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium text-xs line-clamp-1 group-hover:text-primary transition-colors">{item.name}</h3>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{item.description}</p>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs font-medium text-primary">
              {new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(item.price)}
            </span>
            <div className="flex gap-1 mt-0.5 text-[8px]">
              <Badge variant="outline" className="h-3.5 px-1 text-[7px] font-normal flex items-center gap-0.5">
                <Clock className="h-1.5 w-1.5" />
                {item.preparationTime}m
              </Badge>
              <Badge variant="outline" className="h-3.5 px-1 text-[7px] font-normal flex items-center gap-0.5">
                <Utensils className="h-1.5 w-1.5" />
                {item.calories}cal
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="mt-auto pt-0.5 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              // Add ripple effect
              const circle = document.createElement("span");
              const diameter = Math.max(e.currentTarget.clientWidth, e.currentTarget.clientHeight);
              const radius = diameter / 2;
              
              circle.style.width = circle.style.height = `${diameter}px`;
              circle.style.left = `${e.clientX - e.currentTarget.offsetLeft - radius}px`;
              circle.style.top = `${e.clientY - e.currentTarget.offsetTop - radius}px`;
              circle.classList.add("ripple");
              
              const ripple = e.currentTarget.getElementsByClassName("ripple")[0];
              if (ripple) {
                ripple.remove();
              }
              
              e.currentTarget.appendChild(circle);
              
              // Add to cart
              addToCart(item);
            }}
            className="h-6 w-6 rounded-full bg-primary/10 hover:bg-primary/20 text-primary p-0 relative overflow-hidden transition-transform hover:scale-110"
          >
            <Plus className="h-3 w-3" />
            <span className="sr-only">Add to cart</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

// Cart Panel Component
function CartPanel({
  cart,
  updateQuantity,
  removeFromCart,
  subtotal,
  tax,
  discount,
  total,
  applyDiscount,
  setApplyDiscount,
  numberOfGuests,
  setNumberOfGuests,
  specialRequirements,
  setSpecialRequirements,
  orderNumber,
  handlePlaceOrder,
  closeCart
}: {
  cart: CartItem[]
  updateQuantity: (itemId: string, quantity: number) => void
  removeFromCart: (itemId: string) => void
  subtotal: number
  tax: number
  discount: number
  total: number
  applyDiscount: boolean
  setApplyDiscount: (value: boolean) => void
  numberOfGuests: number
  setNumberOfGuests: (value: number) => void
  specialRequirements: string
  setSpecialRequirements: (value: string) => void
  orderNumber: string
  handlePlaceOrder: () => void
  closeCart: () => void
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <ShoppingCart className="h-4 w-4" />
          Current Order
          <Badge variant="outline" className="ml-1">
            {cart.length} {cart.length === 1 ? 'item' : 'items'}
          </Badge>
        </h3>
        <Button variant="ghost" size="icon" onClick={closeCart} className="h-8 w-8 rounded-full">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Button>
      </div>

      {cart.length > 0 ? (
        <>
          <ScrollArea className="flex-1 p-3">
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item._id} className="flex border rounded-lg overflow-hidden bg-background/50">
                  <div className="relative h-14 w-14 flex-shrink-0">
                    <Image
                      src={item.imageUrl || "/placeholder.svg"}
                      alt={item.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>
                  
                  <div className="flex-1 p-2 flex flex-col">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-xs">{item.name}</h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(item.price)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromCart(item._id)}
                        className="h-6 w-6 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Remove</span>
                      </Button>
                    </div>
                    
                    <div className="mt-auto pt-1 flex justify-between items-center">
                      <div className="flex items-center border rounded-md">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => updateQuantity(item._id, item.quantity - 1)}
                          className="h-6 w-6 rounded-none rounded-l-md p-0"
                        >
                          <Minus className="h-3 w-3" />
                          <span className="sr-only">Decrease</span>
                        </Button>
                        <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => updateQuantity(item._id, item.quantity + 1)}
                          className="h-6 w-6 rounded-none rounded-r-md p-0"
                        >
                          <Plus className="h-3 w-3" />
                          <span className="sr-only">Increase</span>
                        </Button>
                      </div>
                      
                      <span className="text-xs font-medium">
                        {new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          <div className="border-t p-3 space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Tax (15%)</span>
                <span>{new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(tax)}</span>
              </div>
              {discount > 0 && (
                <div className="flex items-center justify-between text-xs text-primary">
                  <span>Discount (10%)</span>
                  <span>-{new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(discount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between font-semibold">
                <span>Total</span>
                <span>{new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(total)}</span>
              </div>
            </div>
            
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="apply-discount" className="text-xs">Apply 10% Discount</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">
                        <p>Apply a 10% discount to this order</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Switch
                  id="apply-discount"
                  checked={applyDiscount}
                  onCheckedChange={setApplyDiscount}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Label htmlFor="guests" className="text-xs whitespace-nowrap">Guests:</Label>
                <Select value={numberOfGuests.toString()} onValueChange={(v) => setNumberOfGuests(parseInt(v))}>
                  <SelectTrigger id="guests" className="h-8 text-xs flex-1">
                    <SelectValue placeholder="Number of guests" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => (
                      <SelectItem key={i} value={(i + 1).toString()}>
                        {i + 1} {i === 0 ? 'guest' : 'guests'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="special-requirements" className="text-xs">Special Requirements</Label>
                <Textarea
                  id="special-requirements"
                  placeholder="Add any special requirements or notes..."
                  className="min-h-[60px] text-xs"
                  value={specialRequirements}
                  onChange={(e) => setSpecialRequirements(e.target.value)}
                />
              </div>
              
              <div className="pt-1">
                <p className="text-xs text-muted-foreground mb-1.5">Order #: <span className="font-mono">{orderNumber}</span></p>
                <Button 
                  onClick={handlePlaceOrder} 
                  className="w-full rounded-lg h-10"
                  disabled={cart.length === 0}
                >
                  <Receipt className="mr-2 h-4 w-4" />
                  Place Order
                </Button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <ShoppingCart className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">Your cart is empty</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-4">
            Add some delicious items from the menu to get started with your order.
          </p>
          <Button variant="outline" onClick={closeCart} className="rounded-lg">
            Browse Menu
          </Button>
        </div>
      )}
    </div>
  )
}