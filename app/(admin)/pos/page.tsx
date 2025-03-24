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

// Lazily load menu item component for better performance
const MenuItem = lazy(() => {
  return new Promise<{ default: React.ComponentType<any> }>((resolve) => {
    // Small artificial delay to avoid layout shifts
    setTimeout(() => {
      resolve({
        default: ({
          item,
          addToCart,
        }: {
          item: MenuItem
          addToCart: (item: MenuItem) => void
        }) => (
          <Card className="overflow-hidden transition-all hover:shadow-lg group h-full flex flex-col bg-background/50 backdrop-blur-sm border-primary/10 rounded-2xl hover:border-primary/30">
            <div className="aspect-video sm:aspect-square relative overflow-hidden rounded-t-2xl">
              <Image
                src={item.imageUrl || "/placeholder.svg"}
                alt={item.name}
                fill
                loading="lazy"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center p-3 sm:p-4">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    addToCart(item);
                  }}
                  className="bg-primary hover:bg-primary/90 text-white rounded-full px-3 sm:px-4 py-1 transform translate-y-10 group-hover:translate-y-0 transition-transform duration-300 text-xs sm:text-sm"
                >
                  <ShoppingCart className="mr-1.5 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  Add to Cart
                </Button>
              </div>
              <Badge variant="secondary" className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-black/60 text-white font-medium text-xs">
                ETB {item.price.toFixed(2)}
              </Badge>
              {item.tags?.includes('bestseller') && (
                <Badge className="absolute top-2 sm:top-3 left-2 sm:left-3 bg-primary/90 text-white text-xs">
                  Bestseller
                </Badge>
              )}
              <div 
                className="absolute inset-0 cursor-pointer active:bg-black/10 sm:active:bg-transparent transition-colors lg:hidden"
                onClick={() => addToCart(item)}
              />
            </div>
            <CardContent className="p-3 sm:p-5 flex-grow flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-sm sm:text-lg mb-0.5 sm:mb-1">{item.name}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 line-clamp-2">{item.description}</p>
              </div>
              <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
                    <span>{item.preparationTime} min</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Users className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
                    <span>{item.calories} kcal</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    addToCart(item);
                  }}
                  className="h-6 w-6 sm:h-8 sm:w-8 rounded-full hover:bg-primary/10 lg:flex hidden"
                >
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ),
      })
    }, 50) // Reduced delay for faster initial rendering
  })
})

// Fallback for lazy loaded components
const MenuItemFallback = () => (
  <Card className="overflow-hidden h-full flex flex-col animate-pulse rounded-2xl">
    <div className="aspect-video sm:aspect-square bg-muted/60 rounded-t-2xl"></div>
    <CardContent className="p-3 sm:p-5 flex-grow space-y-2 sm:space-y-3">
      <div className="h-4 sm:h-5 bg-muted/60 rounded-md w-3/4"></div>
      <div className="h-2.5 sm:h-3 bg-muted/60 rounded-md w-full"></div>
      <div className="h-2.5 sm:h-3 bg-muted/60 rounded-md w-5/6"></div>
      <div className="flex items-center justify-between mt-auto">
        <div className="h-2.5 sm:h-3 bg-muted/60 rounded-full w-20 sm:w-24"></div>
      </div>
    </CardContent>
  </Card>
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

  // Use memoized filtered items for better performance
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory = selectedCategory === "all" || item.categoryId === selectedCategory
      const matchesSearch = item.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [items, selectedCategory, debouncedSearchQuery])

  const addToCart = useCallback((item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i._id === item._id)
      if (existing) {
        return prev.map((i) => (i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i))
      }
      return [...prev, { ...item, quantity: 1 }]
    })
    setIsCartOpen(true)
    toast.success(`Added ${item.name} to cart`, {
      icon: "🛒",
      style: {
        borderRadius: "10px",
        background: "#333",
        color: "#fff",
      },
    })
  }, [])

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
      items: cart.map((item) => ({
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
        router.refresh()

        let progress = 0
        const interval = setInterval(() => {
          progress += 10
          setOrderProgress(progress)
          if (progress >= 100) {
            clearInterval(interval)
            toast.success("Your order is ready!")
          }
        }, 1000)
      } else {
        if (responseData.message?.includes("Insufficient stock")) {
          setInsufficientStockItem(responseData.message.split(":")[1].trim())
          toast.error(`Insufficient stock for ${responseData.message.split(":")[1].trim()}`, { id: orderToast })
        } else {
          throw new Error(responseData.message || "Failed to place order")
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
    <div className="flex flex-col lg:flex-row h-screen bg-gradient-to-br from-background/95 via-background/98 to-background font-sans overflow-hidden touch-pan-y">
      {/* Main Content */}
      <div className="flex-1 h-[calc(100vh-70px)] sm:h-[calc(100vh-90px)] lg:h-screen overflow-auto pb-16 sm:pb-20 lg:pb-6 p-3 sm:p-4 lg:p-6 xl:p-8 w-full lg:w-[calc(100%-350px)] xl:w-[calc(100%-400px)]">
        <motion.div
          className="mb-5 lg:mb-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 lg:gap-4"
          {...fadeInUp}
        >
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.back()}
              className="rounded-full border-primary/20 hover:bg-primary/10 h-9 w-9 sm:h-12 sm:w-12"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/70 bg-clip-text text-transparent">
                Gourmet POS
              </h1>
              <p className="text-muted-foreground mt-0.5 sm:mt-1 text-xs sm:text-base flex items-center gap-1 sm:gap-2">
                <Tag className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Crafting perfect dining moments
              </p>
            </div>
          </div>
          <div className="flex flex-row items-center gap-2 w-full lg:w-auto mt-3 lg:mt-0">
            <Select value={selectedWaiter} onValueChange={setSelectedWaiter}>
              <SelectTrigger className="w-full sm:w-[180px] md:w-[200px] bg-background/50 backdrop-blur-sm border-primary/20 rounded-full h-9 text-sm">
                <SelectValue placeholder="Select Waiter" />
              </SelectTrigger>
              <SelectContent>
                {waiters.map((waiter) => (
                  <SelectItem key={waiter._id} value={waiter._id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5 sm:h-6 sm:w-6">
                        <AvatarImage src={waiter.avatar} alt={waiter.name} />
                        <AvatarFallback>{getInitials(waiter.name)}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs sm:text-sm">{waiter.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tableNumber} onValueChange={setTableNumber}>
              <SelectTrigger className="w-full sm:w-[120px] md:w-[140px] bg-background/50 backdrop-blur-sm border-primary/20 rounded-full h-9 text-sm">
                <SelectValue placeholder="Table" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 20 }, (_, i) => (
                  <SelectItem key={i} value={`T${i + 1}`}>
                    Table {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Search and Categories */}
        <motion.div className="mb-5 lg:mb-8 space-y-3 lg:space-y-4" {...fadeInUp} transition={{ delay: 0.1 }}>
          <div className="relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-primary">
              <Search className="h-full w-full" />
            </div>
            <Input
              placeholder="Search dishes..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-8 sm:pl-10 py-4 sm:py-6 text-sm sm:text-base bg-background/50 backdrop-blur-sm border-primary/20 focus:border-primary rounded-full"
            />
          </div>
          <div className="overflow-x-auto pb-1 no-scrollbar">
            <Tabs defaultValue="all" onValueChange={setSelectedCategory} className="w-max min-w-full">
              <TabsList className="bg-background/60 backdrop-blur-sm p-0.5 rounded-full">
                <TabsTrigger 
                  value="all" 
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm px-2.5 sm:px-4 py-1 sm:py-2 rounded-full transition-all"
                >
                  All
                </TabsTrigger>
                {categories.map((category) => (
                  <TabsTrigger
                    key={category._id}
                    value={category._id}
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm px-2.5 sm:px-4 py-1 sm:py-2 rounded-full transition-all"
                  >
                    <span className="flex items-center gap-1 sm:gap-2">
                      {getCategoryIcon(category.type)}
                      {category.name}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </motion.div>

        {/* Menu Items Grid */}
        <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
          <AnimatePresence mode="popLayout">
            {filteredItems.length > 0 ? (
              filteredItems.map((item, index) => (
                <motion.div
                  key={item._id}
                  {...fadeInUp}
                  transition={{ 
                    delay: index * 0.02,
                    duration: 0.25
                  }}
                  layout
                  className="h-full"
                >
                  <Suspense fallback={<MenuItemFallback />}>
                    <MenuItem item={item} addToCart={addToCart} />
                  </Suspense>
                </motion.div>
              ))
            ) : (
              <motion.div 
                className="col-span-full flex flex-col items-center justify-center py-8 sm:py-12 lg:py-20"
                {...fadeInUp}
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-full bg-primary/10 mb-4">
                  <Search className="h-8 w-8 sm:h-10 sm:w-10 text-primary/70" />
                </div>
                <h3 className="text-lg sm:text-xl font-medium mb-2">No items found</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md px-4">
                  We couldn't find any items matching your search criteria. Try adjusting your search or category filter.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Cart Sidebar */}
      <motion.div
        className={`fixed lg:relative top-0 right-0 h-full w-full sm:w-[350px] lg:w-[320px] xl:w-[350px] 2xl:w-[400px] bg-background/95 backdrop-blur-md shadow-xl lg:shadow-none z-50 border-l border-primary/20 flex flex-col`}
        initial={{ x: "100%" }}
        animate={{ x: isCartOpen ? 0 : "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 250 }}
      >
        <div className="safe-area-inset-top p-4 sm:p-6 border-b border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-2xl font-bold flex items-center gap-1.5 sm:gap-2">
              <Receipt className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Order Summary</span>
            </h2>
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden rounded-full border-primary/20 h-8 w-8 sm:h-9 sm:w-9"
              onClick={() => setIsCartOpen(false)}
              aria-label="Close cart"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </Button>
          </div>
          <div className="bg-primary/10 px-3 py-2 rounded-lg text-xs sm:text-sm text-primary/80 flex items-center gap-2 mb-3 sm:mb-4">
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Order No: <span className="font-semibold">{orderNumber}</span></span>
          </div>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center gap-3 bg-background/80 p-3 rounded-lg">
              <div className="bg-primary/10 rounded-full p-1.5 sm:p-2">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
              </div>
              <div className="flex flex-1 items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  value={numberOfGuests}
                  onChange={(e) => setNumberOfGuests(Number(e.target.value))}
                  className="w-14 sm:w-16 h-7 sm:h-8 rounded-md text-sm"
                />
                <Label htmlFor="numberOfGuests" className="text-xs sm:text-sm font-medium">Guests</Label>
              </div>
            </div>
            <div className="bg-background/80 p-3 rounded-lg">
              <Label htmlFor="specialRequirements" className="text-xs sm:text-sm font-medium mb-1.5 sm:mb-2 flex items-center gap-1.5">
                <Tag className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
                Special Requirements
              </Label>
              <Textarea
                id="specialRequirements"
                value={specialRequirements}
                onChange={(e) => setSpecialRequirements(e.target.value)}
                className="mt-1 sm:mt-2 text-xs sm:text-sm resize-none h-12 sm:h-16 border-primary/20 focus:border-primary"
                placeholder="Any special requests or dietary requirements?"
              />
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 p-3 sm:p-6">
          <AnimatePresence>
            {cart.length > 0 ? (
              cart.map((item) => (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3 bg-background/80 hover:bg-primary/5 transition-colors p-2 sm:p-3 rounded-xl group border border-transparent hover:border-primary/10"
                >
                  <div className="relative h-12 w-12 sm:h-16 sm:w-16 rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={item.imageUrl || "/placeholder.svg"}
                      alt={item.name}
                      fill
                      sizes="(max-width: 640px) 48px, 64px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-xs sm:text-base truncate">{item.name}</h3>
                    <p className="text-xs text-primary font-semibold">ETB {item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6 sm:h-8 sm:w-8 rounded-full border-primary/20"
                      onClick={() => updateQuantity(item._id, item.quantity - 1)}
                    >
                      <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <span className="w-4 sm:w-6 text-center text-xs sm:text-base font-medium">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6 sm:h-8 sm:w-8 rounded-full border-primary/20"
                      onClick={() => updateQuantity(item._id, item.quantity + 1)}
                    >
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 sm:h-8 sm:w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeFromCart(item._id)}
                    >
                      <X className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                    </Button>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-40 text-center"
              >
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3 sm:mb-4">
                  <ShoppingCart className="h-6 w-6 sm:h-7 sm:w-7 text-primary/70" />
                </div>
                <h3 className="text-base sm:text-lg font-medium mb-1">Your cart is empty</h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-[250px]">
                  Add some delicious items from the menu to get started.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </ScrollArea>

        <div className="p-3 sm:p-6 border-t border-primary/20 bg-gradient-to-r from-transparent to-primary/5 safe-area-inset-bottom">
          <div className="bg-background/60 backdrop-blur-sm rounded-xl p-3 sm:p-4 mb-3 sm:mb-5 space-y-2 sm:space-y-3">
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>ETB {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-muted-foreground">Tax (15%)</span>
              <span>ETB {tax.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Switch
                  id="apply-discount"
                  checked={applyDiscount}
                  onCheckedChange={setApplyDiscount}
                  className="scale-75 sm:scale-90 data-[state=checked]:bg-primary"
                />
                <Label htmlFor="apply-discount" className="text-xs sm:text-sm">Apply Discount (10%)</Label>
              </div>
              <span className="text-xs sm:text-sm font-medium text-primary">ETB {discount.toFixed(2)}</span>
            </div>
            <Separator className="my-2 sm:my-3" />
            <div className="flex justify-between text-sm sm:text-base font-semibold">
              <span>Total</span>
              <span className="text-base sm:text-lg text-primary">ETB {total.toFixed(2)}</span>
            </div>
          </div>
          <Button
            className="w-full py-4 sm:py-6 text-sm sm:text-lg bg-primary hover:bg-primary/90 transition-colors rounded-xl group"
            onClick={handlePlaceOrder}
            disabled={cart.length === 0}
          >
            <span className="flex items-center">
              <CreditCard className="mr-2 h-4 w-4 sm:h-5 sm:w-5 transition-transform group-hover:rotate-6" />
              Place Order
            </span>
          </Button>
        </div>
      </motion.div>

      {/* Mobile Cart Toggle */}
      <Button
        className="fixed bottom-4 right-4 lg:hidden z-40 rounded-full shadow-lg h-12 w-12 sm:h-14 sm:w-14 p-0 bg-primary hover:bg-primary/90 transition-colors"
        onClick={() => setIsCartOpen(true)}
        aria-label="Open cart"
        style={{
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation'
        }}
      >
        <div className="relative">
          <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6" />
          {cart.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-white text-primary text-xs font-bold rounded-full flex items-center justify-center h-4 w-4 sm:h-5 sm:w-5">
              {cart.length}
            </span>
          )}
        </div>
      </Button>

      {/* Insufficient Stock Dialog */}
      <Dialog open={!!insufficientStockItem} onOpenChange={() => setInsufficientStockItem(null)}>
        <DialogContent className="sm:max-w-md border-primary/10 bg-background/95 backdrop-blur-md rounded-2xl max-w-[90%] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-xl font-semibold flex items-center gap-2">
              <div className="bg-destructive/10 rounded-full p-1.5">
                <X className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
              </div>
              Insufficient Stock
            </DialogTitle>
            <DialogDescription className="pt-2 sm:pt-3 text-xs sm:text-base">
              We're sorry, but there is insufficient stock for the item:
              <Badge variant="outline" className="ml-2 font-medium text-foreground border-primary/20 px-2 py-1 text-xs">
                {insufficientStockItem}
              </Badge>
              <p className="mt-2">Please adjust your order or check back later.</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button 
              onClick={() => setInsufficientStockItem(null)}
              className="w-full sm:w-auto rounded-xl text-sm"
              variant="default"
            >
              <Check className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Understood
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

      {/* Add extra responsive features */}
      <style jsx global>{`
        @media (max-width: 640px) {
          body {
            overscroll-behavior: contain;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
            user-select: none;
          }
          
          /* Enable text selection only in inputs and textareas */
          input, textarea {
            user-select: text;
          }
          
          .xs\\:grid-cols-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          
          input, textarea, select, button {
            font-size: 16px; /* Prevents iOS zoom on focus */
          }
          
          /* Add "active" indicator for touch devices */
          button:active, .active-touch {
            opacity: 0.8;
            transform: scale(0.98);
          }
        }

        /* Add smooth scrolling */
        html {
          scroll-behavior: smooth;
        }
        
        /* Momentum scrolling on iOS */
        .overflow-auto, .overflow-y-auto, .overflow-x-auto {
          -webkit-overflow-scrolling: touch;
        }

        /* Improve animations */
        .animate-pulse {
          animation-duration: 2s;
        }
        
        /* Hide scrollbar but allow scrolling */
        .no-scrollbar {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }
        
        .no-scrollbar::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }
        
        /* Safe area insets for notched devices */
        .safe-area-inset-top {
          padding-top: env(safe-area-inset-top, 0px);
        }
        
        .safe-area-inset-bottom {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
        
        /* Prevent long-press context menu on mobile */
        @media (max-width: 1024px) {
          img, button, a, [role="button"] {
            -webkit-touch-callout: none;
          }
        }
      `}</style>
    </div>
  )
}