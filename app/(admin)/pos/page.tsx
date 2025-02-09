"use client"

import { useState, useEffect, useCallback } from "react"
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

  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === "all" || item.categoryId === selectedCategory
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

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
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
        <motion.div
          className="text-center space-y-4"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <ChefHat className="h-16 w-16 mx-auto text-primary animate-bounce" />
          <h2 className="text-2xl font-semibold">Preparing your gourmet experience...</h2>
          <Progress value={33} className="w-[60vw] mx-auto" />
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gradient-to-br from-background to-background/95 font-sans">
      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 lg:p-8 w-full lg:w-[calc(100%-400px)]">
        <motion.div
          className="mb-8 flex flex-col lg:flex-row items-start lg:items-center justify-between"
          {...fadeInUp}
        >
          <div className="flex items-center gap-4 mb-4 lg:mb-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="hover:bg-primary/10"
              aria-label="Go back"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Gourmet Order Experience
              </h1>
              <p className="text-muted-foreground mt-1">Crafting your perfect dining experience</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
            <Select value={selectedWaiter} onValueChange={setSelectedWaiter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Select Waiter" />
              </SelectTrigger>
              <SelectContent>
                {waiters.map((waiter) => (
                  <SelectItem key={waiter._id} value={waiter._id}>
                    <div className="flex items-center gap-2">
                      <Avatar>
                        <AvatarImage src={waiter.avatar} alt={waiter.name} />
                        <AvatarFallback>{getInitials(waiter.name)}</AvatarFallback>
                      </Avatar>
                      {waiter.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tableNumber} onValueChange={setTableNumber}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Table No." />
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
        <motion.div className="mb-8 space-y-4" {...fadeInUp} transition={{ delay: 0.1 }}>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Discover your next favorite dish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 py-6 text-lg bg-background/50 backdrop-blur-sm border-primary/20 focus:border-primary"
            />
          </div>
          <ScrollArea className="w-full">
            <Tabs defaultValue="all" onValueChange={setSelectedCategory} className="w-max">
              <TabsList className="bg-background/50 backdrop-blur-sm">
                <TabsTrigger value="all" className="data-[state=active]:bg-primary/20">
                  All
                </TabsTrigger>
                {categories.map((category) => (
                  <TabsTrigger
                    key={category._id}
                    value={category._id}
                    className="data-[state=active]:bg-primary/20"
                  >
                    <span className="flex items-center gap-2">
                      {getCategoryIcon(category.type)}
                      {category.name}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </motion.div>

        {/* Menu Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredItems.map((item, index) => (
              <motion.div
                key={item._id}
                {...fadeInUp}
                transition={{ delay: index * 0.05 }}
                layout
              >
                <Card className="overflow-hidden transition-all hover:shadow-lg group h-full flex flex-col bg-background/50 backdrop-blur-sm border-primary/20">
                  <div className="aspect-square relative overflow-hidden">
                    <Image
                      src={item.imageUrl || "/placeholder.svg"}
                      alt={item.name}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        onClick={() => addToCart(item)}
                        className="bg-white text-black hover:bg-gray-200 transform translate-y-4 group-hover:translate-y-0 transition-transform"
                      >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Add to Cart
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-4 flex-grow">
                    <h3 className="font-semibold text-lg mb-1">{item.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{item.description}</p>
                    <div className="flex items-center justify-between mt-auto">
                      <Badge variant="secondary" className="text-lg font-semibold bg-primary/10">
                        ETB {item.price.toFixed(2)}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Clock className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Preparation Time: {item.preparationTime} mins</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Users className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Calories: {item.calories} kcal</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </CardContent>
                  
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Cart Sidebar */}
      <motion.div
        className={`fixed lg:relative top-0 right-0 h-full w-full lg:w-[400px] bg-background/95 backdrop-blur-md transform transition-transform duration-300 ease-in-out ${
          isCartOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        } z-50 border-l border-primary/20`}
        initial={{ x: "100%" }}
        animate={{ x: isCartOpen ? 0 : "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 120 }}
      >
        <div className="p-6 border-b border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Order Summary</h2>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsCartOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          <p className="text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Order No: {orderNumber}
          </p>
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <Input
                type="number"
                min="1"
                value={numberOfGuests}
                onChange={(e) => setNumberOfGuests(Number(e.target.value))}
                className="w-20"
              />
              <Label htmlFor="numberOfGuests">Guests</Label>
            </div>
            <div>
              <Label htmlFor="specialRequirements" className="block text-sm font-medium mb-1">
                Special Requirements
              </Label>
              <Textarea
                id="specialRequirements"
                value={specialRequirements}
                onChange={(e) => setSpecialRequirements(e.target.value)}
                className="mt-1"
                placeholder="Any special requests or dietary requirements?"
              />
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 p-6">
          <AnimatePresence>
            {cart.map((item) => (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-4 mb-4 bg-primary/5 p-3 rounded-lg group"
              >
                <div className="relative h-16 w-16 rounded-md overflow-hidden">
                  <Image
                    src={item.imageUrl || "/placeholder.svg"}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{item.name}</h3>
                  <p className="text-sm text-muted-foreground">ETB {item.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity(item._id, item.quantity - 1)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity(item._id, item.quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeFromCart(item._id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </ScrollArea>

        <div className="p-6 border-t border-primary/20">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>ETB {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (15%)</span>
              <span>ETB {tax.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="apply-discount"
                  checked={applyDiscount}
                  onCheckedChange={setApplyDiscount}
                />
                <Label htmlFor="apply-discount">Apply Discount (10%)</Label>
              </div>
              <span>ETB {discount.toFixed(2)}</span>
            </div>
            <Separator className="my-4" />
            <div className="flex justify-between text-lg font-semibold">
              <span>Total</span>
              <span>ETB {total.toFixed(2)}</span>
            </div>
          </div>
          <Button
            className="w-full py-6 text-lg bg-primary hover:bg-primary/90"
            size="lg"
            onClick={handlePlaceOrder}
            disabled={cart.length === 0}
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            Place Order
          </Button>
        </div>
      </motion.div>

      {/* Mobile Cart Toggle */}
      <Button
        className="fixed bottom-4 right-4 lg:hidden z-50 rounded-full shadow-lg"
        size="lg"
        onClick={() => setIsCartOpen(true)}
      >
        <ShoppingCart className="h-6 w-6 mr-2" />
        <span className="font-semibold">{cart.length}</span>
      </Button>

      {/* Insufficient Stock Dialog */}
      <Dialog open={!!insufficientStockItem} onOpenChange={() => setInsufficientStockItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insufficient Stock</DialogTitle>
            <DialogDescription>
              We're sorry, but there is insufficient stock for the item: {insufficientStockItem}. Please
              adjust your order or check back later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setInsufficientStockItem(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Progress */}
      {orderProgress > 0 && orderProgress < 100 && (
        <motion.div
          className="fixed bottom-4 right-4 bg-background/95 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-primary/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
        >
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <ChefHat className="h-5 w-5 animate-bounce" />
            Preparing Your Order
          </h3>
          <Progress value={orderProgress} className="w-[200px]" />
        </motion.div>
      )}
    </div>
  )
}