"use client"

import { useState, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Toaster } from "react-hot-toast"
import { useToast } from "@/hooks/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CalendarIcon,
  Edit2,
  Filter,
  LayoutGrid,
  LayoutList,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from "lucide-react"

// Types
interface Cost {
  _id: string
  title: string
  description: string
  amount: number
  category: string
  date: string
  tags: string[]
  recurring: boolean
  frequency: string
  notes: string
  priority: "Low" | "Medium" | "High"
  status: "Paid" | "Pending"
}

type CostFormData = Omit<Cost, "_id" | "date" | "tags"> & {
  date: Date
  tags: string
}

type SortConfig = {
  key: keyof Cost
  direction: "asc" | "desc"
}

// API Response Types
interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
}

// Zod schema for form validation
const costSchema = z.object({
  title: z.string().min(2, { message: "Title must be at least 2 characters." }),
  description: z.string().min(5, { message: "Description must be at least 5 characters." }),
  amount: z.number().positive({ message: "Amount must be positive." }),
  category: z.string().min(1, { message: "Category is required." }),
  date: z.date(),
  tags: z.string().transform((val) => val.split(",").map((tag) => tag.trim())),
  recurring: z.boolean().default(false),
  frequency: z.string().default("Monthly"),
  notes: z.string(),
  priority: z.enum(["Low", "Medium", "High"]),
  status: z.enum(["Paid", "Pending"]).default("Paid"),
})

// API Functions
const API_BASE_URL = "/api/expense"

const api = {
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    }

    console.log(`API ${options.method || "GET"} Request to: ${endpoint}`)
    if (options.body) {
      console.log("Request Payload:", JSON.parse(options.body as string))
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    const data = await response.json()
    console.log("API Response:", data)

    if (!response.ok) {
      throw new Error(data.message || "API request failed")
    }

    return data
  },

  getCosts: () => api.request<Cost[]>("/"),

  addCost: (cost: Omit<Cost, "_id">) =>
    api.request<Cost>("/", {
      method: "POST",
      body: JSON.stringify(cost),
    }),

  updateCost: (id: string, cost: Omit<Cost, "_id">) =>
    api.request<Cost>(`/${id}`, {
      method: "PUT",
      body: JSON.stringify(cost),
    }),

  deleteCost: (id: string) =>
    api.request<void>(`/${id}`, {
      method: "DELETE",
    }),
}

// CostForm Component with loading state
const CostForm = ({
  defaultValues,
  onSubmit,
  mode = "create",
  onClose,
  loading = false,
}: {
  defaultValues?: Partial<CostFormData>
  onSubmit: (data: CostFormData) => Promise<void>
  mode?: "create" | "edit"
  onClose: () => void
  loading?: boolean
}) => {
  const form = useForm<CostFormData>({
    resolver: zodResolver(costSchema),
    defaultValues: {
      title: "",
      description: "",
      amount: 0,
      category: "",
      date: new Date(),
      tags: "",
      recurring: false,
      frequency: "Monthly",
      notes: "",
      priority: "Medium",
      status: "Paid",
      ...defaultValues,
    },
  })

  const handleSubmit = async (data: CostFormData) => {
    await onSubmit(data)
    onClose()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter cost title" {...field} disabled={loading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Enter cost description" {...field} disabled={loading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    {...field}
                    onChange={(e) => field.onChange(Number.parseFloat(e.target.value))}
                    disabled={loading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {/* Restaurant-Related Categories */}
                    <SelectItem value="Food and Beverage Supplies">Food and Beverage Supplies</SelectItem>
                    <SelectItem value="Kitchen Equipment Maintenance">Kitchen Equipment Maintenance</SelectItem>
                    <SelectItem value="Dining Area Furniture and Fixtures">
                      Dining Area Furniture and Fixtures
                    </SelectItem>
                    <SelectItem value="Utility Costs">Utility Costs</SelectItem>
                    <SelectItem value="Chef and Kitchen Staff Salaries">Chef and Kitchen Staff Salaries</SelectItem>
                    <SelectItem value="Service Staff Salaries">Service Staff Salaries</SelectItem>
                    <SelectItem value="Point-of-Sale System Maintenance">Point-of-Sale System Maintenance</SelectItem>
                    <SelectItem value="Packaging and Takeaway Supplies">Packaging and Takeaway Supplies</SelectItem>
                    <SelectItem value="Health and Hygiene Supplies">Health and Hygiene Supplies</SelectItem>
                    <SelectItem value="Licensing and Permits">Licensing and Permits</SelectItem>
                    <SelectItem value="Waste Management">Waste Management</SelectItem>
                    <SelectItem value="Menu Design and Printing">Menu Design and Printing</SelectItem>
                    <SelectItem value="Restaurant Décor and Renovation">Restaurant Décor and Renovation</SelectItem>
                    <SelectItem value="Pest Control Services">Pest Control Services</SelectItem>
                    <SelectItem value="Delivery Partner Fees">Delivery Partner Fees</SelectItem>
                    <SelectItem value="Seasonal Decorations">Seasonal Decorations</SelectItem>
                    <SelectItem value="Restaurant Management Software">Restaurant Management Software</SelectItem>
                    <SelectItem value="Special Events and Promotions">Special Events and Promotions</SelectItem>
                    <SelectItem value="Uniforms and Laundry">Uniforms and Laundry</SelectItem>
                    <SelectItem value="Tableware Replacement">Tableware Replacement</SelectItem>
                    <SelectItem value="Cooking Fuel">Cooking Fuel</SelectItem>
                    <SelectItem value="Music and Entertainment">Music and Entertainment</SelectItem>
                    <SelectItem value="Outdoor Seating Maintenance">Outdoor Seating Maintenance</SelectItem>
                    <SelectItem value="Drive-Thru Maintenance">Drive-Thru Maintenance</SelectItem>
                    <SelectItem value="Customer Loyalty Programs">Customer Loyalty Programs</SelectItem>
                    <SelectItem value="Employee Meals">Employee Meals</SelectItem>
                    <SelectItem value="Health and Safety Inspections">Health and Safety Inspections</SelectItem>
                    <SelectItem value="POS Hardware Upgrades">POS Hardware Upgrades</SelectItem>
                    <SelectItem value="Alcohol License Fees">Alcohol License Fees</SelectItem>
                    <SelectItem value="Vendor Contract Fees">Vendor Contract Fees</SelectItem>
                    <SelectItem value="Branded Merchandise">Branded Merchandise</SelectItem>
                    <SelectItem value="Recipe Development Costs">Recipe Development Costs</SelectItem>
                    <SelectItem value="Catering Equipment">Catering Equipment</SelectItem>
                    <SelectItem value="Private Dining Room Costs">Private Dining Room Costs</SelectItem>
                    <SelectItem value="Beverage Dispenser Maintenance">Beverage Dispenser Maintenance</SelectItem>
                    <SelectItem value="Food Photography">Food Photography</SelectItem>
                    <SelectItem value="Third-Party Delivery App Costs">Third-Party Delivery App Costs</SelectItem>
                    <SelectItem value="Wi-Fi for Customers">Wi-Fi for Customers</SelectItem>
                    <SelectItem value="Signage Installation and Maintenance">
                      Signage Installation and Maintenance
                    </SelectItem>
                    <SelectItem value="Food Waste Disposal Services">Food Waste Disposal Services</SelectItem>
                    <SelectItem value="Glassware Replacement">Glassware Replacement</SelectItem>
                    <SelectItem value="Dishwasher Maintenance">Dishwasher Maintenance</SelectItem>
                    <SelectItem value="Event Hosting Supplies">Event Hosting Supplies</SelectItem>
                    <SelectItem value="Kitchen Deep Cleaning">Kitchen Deep Cleaning</SelectItem>

                    {/* General Categories */}
                    <SelectItem value="Rent and Lease">Rent and Lease</SelectItem>
                    <SelectItem value="Insurance">Insurance</SelectItem>
                    <SelectItem value="Marketing and Advertising">Marketing and Advertising</SelectItem>
                    <SelectItem value="Research and Development">Research and Development</SelectItem>
                    <SelectItem value="Technology and Software Subscriptions">
                      Technology and Software Subscriptions
                    </SelectItem>
                    <SelectItem value="Employee Training and Development">Employee Training and Development</SelectItem>
                    <SelectItem value="Office Supplies">Office Supplies</SelectItem>
                    <SelectItem value="Professional Services">Professional Services</SelectItem>
                    <SelectItem value="Transportation and Logistics">Transportation and Logistics</SelectItem>
                    <SelectItem value="Telecommunication and Internet">Telecommunication and Internet</SelectItem>
                    <SelectItem value="Taxes and Regulatory Compliance">Taxes and Regulatory Compliance</SelectItem>
                    <SelectItem value="Depreciation Costs">Depreciation Costs</SelectItem>
                    <SelectItem value="Security Services">Security Services</SelectItem>
                    <SelectItem value="Miscellaneous Operational Expenses">
                      Miscellaneous Operational Expenses
                    </SelectItem>
                    <SelectItem value="Employee Benefits">Employee Benefits</SelectItem>
                    <SelectItem value="Bank Fees and Charges">Bank Fees and Charges</SelectItem>
                    <SelectItem value="Corporate Social Responsibility">Corporate Social Responsibility</SelectItem>
                    <SelectItem value="Printing and Stationery">Printing and Stationery</SelectItem>
                    <SelectItem value="Travel and Accommodation">Travel and Accommodation</SelectItem>
                    <SelectItem value="Subscription Fees">Subscription Fees</SelectItem>
                    <SelectItem value="Office Furniture and Fixtures">Office Furniture and Fixtures</SelectItem>
                    <SelectItem value="Recruitment Costs">Recruitment Costs</SelectItem>
                    <SelectItem value="Warehouse and Storage">Warehouse and Storage</SelectItem>
                    <SelectItem value="Vehicle Maintenance">Vehicle Maintenance</SelectItem>
                    <SelectItem value="Cleaning Services">Cleaning Services</SelectItem>
                    <SelectItem value="Disaster Recovery and Contingency">Disaster Recovery and Contingency</SelectItem>
                    <SelectItem value="Public Relations">Public Relations</SelectItem>
                    <SelectItem value="Legal Fees">Legal Fees</SelectItem>
                    <SelectItem value="Investor Relations">Investor Relations</SelectItem>
                    <SelectItem value="Business Licenses and Registrations">
                      Business Licenses and Registrations
                    </SelectItem>
                    <SelectItem value="Employee Relocation Costs">Employee Relocation Costs</SelectItem>
                    <SelectItem value="Customer Feedback Surveys">Customer Feedback Surveys</SelectItem>
                    <SelectItem value="Conference and Event Fees">Conference and Event Fees</SelectItem>
                    <SelectItem value="Social Media Management">Social Media Management</SelectItem>
                    <SelectItem value="IT Support and Maintenance">IT Support and Maintenance</SelectItem>
                    <SelectItem value="Cloud Storage Costs">Cloud Storage Costs</SelectItem>
                    <SelectItem value="Software Development">Software Development</SelectItem>
                    <SelectItem value="Market Research">Market Research</SelectItem>
                    <SelectItem value="Competitor Analysis">Competitor Analysis</SelectItem>
                    <SelectItem value="Employee Onboarding Costs">Employee Onboarding Costs</SelectItem>
                    <SelectItem value="Training Materials">Training Materials</SelectItem>
                    <SelectItem value="Equipment Rentals">Equipment Rentals</SelectItem>
                    <SelectItem value="Workplace Safety Equipment">Workplace Safety Equipment</SelectItem>
                    <SelectItem value="HR Tools and Resources">HR Tools and Resources</SelectItem>
                    <SelectItem value="Volunteer and Community Initiatives">
                      Volunteer and Community Initiatives
                    </SelectItem>
                    <SelectItem value="Environmental Compliance Costs">Environmental Compliance Costs</SelectItem>
                    <SelectItem value="Utility Backup Systems">Utility Backup Systems</SelectItem>
                    <SelectItem value="Outsourcing Costs">Outsourcing Costs</SelectItem>
                    <SelectItem value="Custom Branding Materials">Custom Branding Materials</SelectItem>
                    <SelectItem value="Board Meeting Expenses">Board Meeting Expenses</SelectItem>
                    <SelectItem value="Charitable Donations">Charitable Donations</SelectItem>
                    <SelectItem value="Custom Website Maintenance">Custom Website Maintenance</SelectItem>
                    <SelectItem value="Others">Others</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                        disabled={loading}
                      >
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <FormControl>
                <Input placeholder="Enter tags, separated by commas" {...field} disabled={loading} />
              </FormControl>
              <FormDescription>Enter tags separated by commas (e.g., "office, rent, monthly")</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="recurring"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={loading} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Recurring Cost</FormLabel>
                  <FormDescription>This cost repeats on a regular basis</FormDescription>
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="frequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Frequency</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Daily">Daily</SelectItem>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea placeholder="Additional notes" {...field} disabled={loading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
              {mode === "create" ? "Adding..." : "Updating..."}
            </>
          ) : (
            mode === "create" ? "Add Cost" : "Update Cost"
          )}
        </Button>
      </form>
    </Form>
  )
}

// CostCard Component
const CostCard = ({
  cost,
  onUpdate,
  onDelete,
  isUpdating,
}: {
  cost: Cost
  onUpdate: (id: string, data: CostFormData) => void
  onDelete: (id: string) => void
  isUpdating: boolean
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle>{cost.title}</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" disabled={isUpdating}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <Dialog>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Edit2 className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Cost</DialogTitle>
                    <DialogDescription>Make changes to this cost</DialogDescription>
                  </DialogHeader>
                  <CostForm
                    mode="edit"
                    defaultValues={{
                      ...cost,
                      date: new Date(cost.date),
                      tags: cost.tags.join(", "),
                    }}
                    onSubmit={async (data) => onUpdate(cost._id, data)}
                    onClose={() => {}}
                    loading={isUpdating}
                  />
                </DialogContent>
              </Dialog>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the cost and remove it from our
                      servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDelete(cost._id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Amount</p>
            <p className="text-2xl font-bold">ETB-{cost.amount.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Category</p>
            <Badge variant="secondary">{cost.category}</Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Date</p>
            <p>{format(new Date(cost.date), "PP")}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant={cost.status === "Paid" ? "default" : cost.status === "Pending" ? "secondary" : "outline"}>
              {cost.status.charAt(0).toUpperCase() + cost.status.slice(1)}
            </Badge>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm text-muted-foreground mb-2">Tags</p>
          <div className="flex flex-wrap gap-2">
            {cost.tags.map((tag, index) => (
              <Badge key={index} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
        {cost.recurring && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground mb-2">Frequency</p>
            <Badge variant="secondary">{cost.frequency}</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// CostTable Component
const CostTable = ({
  costs,
  sortConfig,
  onSort,
  onUpdate,
  onDelete,
  updatingId,
}: {
  costs: Cost[]
  sortConfig: SortConfig
  onSort: (key: keyof Cost) => void
  onUpdate: (id: string, data: CostFormData) => void
  onDelete: (id: string) => void
  updatingId: string | null
}) => {
  return (
    <div className="relative overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead onClick={() => onSort("title")} className="cursor-pointer">
              Title{" "}
              {sortConfig.key === "title" &&
                (sortConfig.direction === "asc" ? (
                  <ArrowUpIcon className="ml-1 inline h-4 w-4" />
                ) : (
                  <ArrowDownIcon className="ml-1 inline h-4 w-4" />
                ))}
            </TableHead>
            <TableHead onClick={() => onSort("amount")} className="cursor-pointer">
              Amount{" "}
              {sortConfig.key === "amount" &&
                (sortConfig.direction === "asc" ? (
                  <ArrowUpIcon className="ml-1 inline h-4 w-4" />
                ) : (
                  <ArrowDownIcon className="ml-1 inline h-4 w-4" />
                ))}
            </TableHead>
            <TableHead onClick={() => onSort("category")} className="cursor-pointer">
              Category{" "}
              {sortConfig.key === "category" &&
                (sortConfig.direction === "asc" ? (
                  <ArrowUpIcon className="ml-1 inline h-4 w-4" />
                ) : (
                  <ArrowDownIcon className="ml-1 inline h-4 w-4" />
                ))}
            </TableHead>
            <TableHead onClick={() => onSort("date")} className="cursor-pointer">
              Date{" "}
              {sortConfig.key === "date" &&
                (sortConfig.direction === "asc" ? (
                  <ArrowUpIcon className="ml-1 inline h-4 w-4" />
                ) : (
                  <ArrowDownIcon className="ml-1 inline h-4 w-4" />
                ))}
            </TableHead>
            <TableHead onClick={() => onSort("status")} className="cursor-pointer">
              Status{" "}
              {sortConfig.key === "status" &&
                (sortConfig.direction === "asc" ? (
                  <ArrowUpIcon className="ml-1 inline h-4 w-4" />
                ) : (
                  <ArrowDownIcon className="ml-1 inline h-4 w-4" />
                ))}
            </TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {costs.map((cost) => (
            <TableRow key={cost._id}>
              <TableCell>
                <div>
                  <p className="font-medium">{cost.title}</p>
                </div>
              </TableCell>
              <TableCell>
                <div className="font-medium">
                  ETB-{cost.amount.toFixed(2)}
                  {cost.recurring && (
                    <Badge variant="outline" className="ml-2">
                      {cost.frequency}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{cost.category}</Badge>
              </TableCell>
              <TableCell>{format(new Date(cost.date), "PP")}</TableCell>
              <TableCell>
                <Badge
                  variant={cost.status === "Paid" ? "default" : cost.status === "Pending" ? "secondary" : "outline"}
                >
                  {cost.status.charAt(0).toUpperCase() + cost.status.slice(1)}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={updatingId === cost._id}>
                      {updatingId === cost._id ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      ) : (
                        <MoreHorizontal className="h-4 w-4" />
                      )}
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <Dialog>
                      <DialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <Edit2 className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[650px] bg-white p-6 rounded-lg shadow-lg z-50">
                        <DialogHeader>
                          <DialogTitle>Edit Cost</DialogTitle>
                          <DialogDescription>Make changes to this cost</DialogDescription>
                        </DialogHeader>
                        <CostForm
                          mode="edit"
                          defaultValues={{
                            ...cost,
                            date: new Date(cost.date),
                            tags: cost.tags.join(", "),
                          }}
                          onSubmit={async (data) => onUpdate(cost._id, data)}
                          onClose={() => {}}
                          loading={updatingId === cost._id}
                        />
                      </DialogContent>
                    </Dialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the cost and remove it from our
                            servers.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onDelete(cost._id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

// Main CostManagementPage Component
export default function CostManagementPage() {
  const [costs, setCosts] = useState<Cost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"table" | "grid">("table")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<Cost["status"] | null>(null)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "date", direction: "desc" })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchCosts()
  }, [])

  const fetchCosts = async () => {
    console.log("Fetching costs...")
    setIsLoading(true)
    try {
      const response = await api.getCosts()
      if (response.success) {
        console.log("Costs fetched successfully:", response.data)
        setCosts(response.data || [])
      }
    } catch (error) {
      console.error("Error fetching costs:", error)
      setError(error instanceof Error ? error.message : "An unknown error occurred")
      toast({
        title: "Error",
        description: "Failed to fetch costs. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddCost = async (formData: CostFormData) => {
    console.log("Adding cost:", formData)
    setIsAdding(true)
    try {
      const costData = {
        ...formData,
        date: formData.date.toISOString(),
        tags: typeof formData.tags === "string" ? formData.tags.split(",").map((tag) => tag.trim()) : formData.tags,
      }

      const response = await api.addCost(costData)
      if (response.success) {
        console.log("Cost added successfully:", response.data)
        setCosts((prevCosts) => [...prevCosts, response.data!])
        toast({
          title: "Success",
          description: "Cost added successfully!"
        })
        setIsDialogOpen(false)
      }
    } catch (error) {
      console.error("Error adding cost:", error)
      toast({
        title: "Error",
        description: "Failed to add cost. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsAdding(false)
    }
  }

  const handleUpdateCost = async (id: string, formData: CostFormData) => {
    console.log("Updating cost:", id, formData)
    setIsUpdating(id)
    try {
      const costData = {
        ...formData,
        date: formData.date.toISOString(),
        tags: typeof formData.tags === "string" ? formData.tags.split(",").map((tag) => tag.trim()) : formData.tags,
      }

      const response = await api.updateCost(id, costData)
      if (response.success) {
        console.log("Cost updated successfully:", response.data)
        setCosts((prevCosts) => prevCosts.map((cost) => (cost._id === id ? response.data! : cost)))
        toast({
          title: "Success",
          description: "Cost updated successfully!",
        })
      }
    } catch (error) {
      console.error("Error updating cost:", error)
      toast({
        title: "Error", 
        description: "Failed to update cost. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(null)
    }
  }

  const handleDeleteCost = async (id: string) => {
    console.log("Deleting cost:", id)
    try {
      const response = await api.deleteCost(id)
      if (response.success) {
        console.log("Cost deleted successfully")
        setCosts((prevCosts) => prevCosts.filter((cost) => cost._id !== id))
        toast({
          title: "Success",
          description: "Cost deleted successfully!"
        })
      }
    } catch (error) {
      console.error("Error deleting cost:", error)
      toast({
        title: "Error",
        description: "Failed to delete cost. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleSort = (key: keyof Cost) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }))
  }
  
  const filteredAndSortedCosts = useMemo(() => {
    return [...costs]
      .filter(
        (cost) =>
          cost &&
          cost.title &&
          cost.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
          (!filterCategory || cost.category === filterCategory) &&
          (!filterStatus || cost.status === filterStatus),
      )
      .sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === "asc" ? -1 : 1
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === "asc" ? 1 : -1
        return 0
      })
  }, [costs, searchTerm, filterCategory, filterStatus, sortConfig])

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-6">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Expenses Management</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDialogOpen(true)} disabled={isAdding}>
                {isAdding ? (
                  <>
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" /> Add New Cost
                  </>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[650px] bg-white p-6 rounded-lg shadow-lg z-50">
              <DialogHeader>
                <DialogTitle>Add New Cost</DialogTitle>
                <DialogDescription>Fill in the details below to add a new cost.</DialogDescription>
              </DialogHeader>
              <CostForm onSubmit={handleAddCost} onClose={() => setIsDialogOpen(false)} loading={isAdding} />
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle>Costs Overview</CardTitle>
                <CardDescription>Manage and track all your costs in one place.</CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search costs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-[200px]"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[200px]">
                    <DropdownMenuLabel>Filter Costs</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setFilterCategory(null)}>All Categories</DropdownMenuItem>
                    {[
                      "Operational",
                      "Marketing",
                      "Research and Development",
                      "Human Resources",
                      "Other",
                      "Food and Beverage Supplies",
                      "Kitchen Equipment Maintenance",
                      "Dining Area Furniture and Fixtures",
                      "Utility Costs",
                      "Chef and Kitchen Staff Salaries",
                      "Service Staff Salaries",
                      "Point-of-Sale System Maintenance",
                      "Packaging and Takeaway Supplies",
                      "Health and Hygiene Supplies",
                      "Licensing and Permits",
                      "Waste Management",
                      "Menu Design and Printing",
                      "Restaurant Décor and Renovation",
                      "Pest Control Services",
                      "Delivery Partner Fees",
                      "Seasonal Decorations",
                      "Restaurant Management Software",
                      "Special Events and Promotions",
                      "Uniforms and Laundry",
                      "Tableware Replacement",
                      "Cooking Fuel",
                      "Music and Entertainment",
                      "Outdoor Seating Maintenance",
                      "Drive-Thru Maintenance",
                      "Customer Loyalty Programs",
                      "Employee Meals",
                      "Health and Safety Inspections",
                      "POS Hardware Upgrades",
                      "Alcohol License Fees",
                      "Vendor Contract Fees",
                      "Branded Merchandise",
                      "Recipe Development Costs",
                      "Catering Equipment",
                      "Private Dining Room Costs",
                      "Beverage Dispenser Maintenance",
                      "Food Photography",
                      "Third-Party Delivery App Costs",
                      "Wi-Fi for Customers",
                      "Signage Installation and Maintenance",
                      "Food Waste Disposal Services",
                      "Glassware Replacement",
                      "Dishwasher Maintenance",
                      "Event Hosting Supplies",
                      "Kitchen Deep Cleaning",
                      "Rent and Lease",
                      "Insurance",
                      "Marketing and Advertising",
                      "Technology and Software Subscriptions",
                      "Employee Training and Development",
                      "Office Supplies",
                      "Professional Services",
                      "Transportation and Logistics",
                      "Telecommunication and Internet",
                      "Taxes and Regulatory Compliance",
                      "Depreciation Costs",
                      "Security Services",
                      "Miscellaneous Operational Expenses",
                      "Employee Benefits",
                      "Bank Fees and Charges",
                      "Corporate Social Responsibility",
                      "Printing and Stationery",
                      "Travel and Accommodation",
                      "Subscription Fees",
                      "Office Furniture and Fixtures",
                      "Recruitment Costs",
                      "Warehouse and Storage",
                      "Vehicle Maintenance",
                      "Cleaning Services",
                      "Disaster Recovery and Contingency",
                      "Public Relations",
                      "Legal Fees",
                      "Investor Relations",
                      "Business Licenses and Registrations",
                      "Employee Relocation Costs",
                      "Customer Feedback Surveys",
                      "Conference and Event Fees",
                      "Social Media Management",
                      "IT Support and Maintenance",
                      "Cloud Storage Costs",
                      "Software Development",
                      "Market Research",
                      "Competitor Analysis",
                      "Employee Onboarding Costs",
                      "Training Materials",
                      "Equipment Rentals",
                      "Workplace Safety Equipment",
                      "HR Tools and Resources",
                      "Volunteer and Community Initiatives",
                      "Environmental Compliance Costs",
                      "Utility Backup Systems",
                      "Outsourcing Costs",
                      "Custom Branding Materials",
                      "Board Meeting Expenses",
                      "Charitable Donations",
                      "Custom Website Maintenance",
                    ].map((category) => (
                      <DropdownMenuItem key={category} onClick={() => setFilterCategory(category)}>
                        {category}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setFilterStatus(null)}>All Statuses</DropdownMenuItem>
                    {["Paid", "Pending"].map((status) => (
                      <DropdownMenuItem key={status} onClick={() => setFilterStatus(status as Cost["status"])}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setViewMode(viewMode === "table" ? "grid" : "table")}
                >
                  {viewMode === "table" ? <LayoutGrid className="h-4 w-4" /> : <LayoutList className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, index) => (
                  <Skeleton key={index} className="h-20 w-full" />
                ))}
              </div>
            ) : filteredAndSortedCosts.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center">
                <p className="text-muted-foreground">No costs found.</p>
              </div>
            ) : viewMode === "table" ? (
              <CostTable
                costs={filteredAndSortedCosts}
                sortConfig={sortConfig}
                onSort={handleSort}
                onUpdate={handleUpdateCost}
                onDelete={handleDeleteCost}
                updatingId={isUpdating}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredAndSortedCosts.map((cost) => (
                  <CostCard 
                    key={cost._id} 
                    cost={cost} 
                    onUpdate={handleUpdateCost} 
                    onDelete={handleDeleteCost}
                    isUpdating={isUpdating === cost._id}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Toaster position="top-right" />
    </div>
  )
}