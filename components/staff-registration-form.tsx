"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import axios from "axios";
import { 
  UserPlus, 
  Mail, 
  User, 
  Phone, 
  Key, 
  CheckCircle, 
  XCircle,
  Shield,
  UserCheck,
  BadgeCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

// Define role-based permissions
const rolePermissions = {
  admin: [
    "manage_users",
    "view_dashboard",
    "manage_inventory",
    "view_stock",
    "manage_purchases",
    "view_reports",
    "manage_suppliers",
    "manage_orders",
    "view_orders",
    "update_order_status",
    "manage_kitchen",
    "view_menu",
    "manage_menu",
    "manage_finance",
    "view_finance",
    "manage_marketing",
    "view_marketing",
    "manage_settings"
  ],
  kitchen: [
    "view_orders",
    "update_order_status",
    "manage_kitchen",
    "view_menu",
    "view_inventory"
  ],
  stock_manager: [
    "manage_inventory",
    "view_stock",
    "manage_purchases",
    "view_reports",
    "manage_suppliers"
  ],
  fb: [
    "manage_menu",
    "view_menu",
    "manage_categories",
    "view_orders"
  ],
  marketing: [
    "manage_marketing",
    "view_marketing",
    "create_content",
    "manage_blog"
  ],
  finance: [
    "manage_finance",
    "view_finance",
    "view_reports",
    "manage_expenses"
  ],
  pos: [
    "manage_orders",
    "view_orders",
    "create_orders",
    "process_payments"
  ],
  waitress: [
    "view_orders",
    "create_orders",
    "update_order_status",
    "view_menu"
  ]
};

// Define the form schema
const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  employeeId: z.string().min(3, "Employee ID must be at least 3 characters"),
  role: z.enum(["admin", "kitchen", "stock_manager", "fb", "marketing", "finance", "pos", "waitress"]),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
  status: z.enum(["active", "inactive"]).default("active"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;

export function StaffRegistrationForm() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      employeeId: "",
      role: "waitress",
      password: "",
      confirmPassword: "",
      status: "active",
    },
  });

  // Watch role changes to update permissions
  const selectedRole = form.watch("role");

  useEffect(() => {
    if (selectedRole) {
      setPermissions(rolePermissions[selectedRole] || []);
    }
  }, [selectedRole]);

  const generateEmployeeId = () => {
    const role = form.getValues("role");
    const roleMap: Record<string, string> = {
      admin: "ADMIN",
      kitchen: "KITCHEN",
      stock_manager: "STOCK",
      fb: "FB",
      marketing: "MKT",
      finance: "FIN",
      pos: "POS",
      waitress: "WAIT",
    };
    const prefix = roleMap[role] || "EMP";
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${randomNum}`;
  };

  const handleAutoGenerate = () => {
    form.setValue("employeeId", generateEmployeeId());
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    form.setValue("password", password);
    form.setValue("confirmPassword", password);
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const staffData = {
        ...values,
        permissions: rolePermissions[values.role] || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Remove confirmPassword from the data
      const { confirmPassword, ...submitData } = staffData;

      const response = await axios.post("/api/staff", submitData);
      
      toast({
        title: "Staff Registered Successfully",
        description: `${values.name} has been added to the system.`,
        variant: "default",
      });

      form.reset();
      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.response?.data?.message || "An error occurred while registering staff.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleDescriptions = {
    admin: "Full system access and management",
    kitchen: "Kitchen operations and order management",
    stock_manager: "Inventory and stock management",
    fb: "Menu and food management",
    marketing: "Marketing and content creation",
    finance: "Financial management and reporting",
    pos: "Point of Sale operations",
    waitress: "Order taking and customer service",
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add New Staff
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Register New Staff Member
          </DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new staff member to the system.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-200px)] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Full Name
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Address
                      </FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone Number
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="+251123456789" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="employeeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <BadgeCheck className="h-4 w-4" />
                          Employee ID
                        </FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <Input placeholder="EMP001" {...field} />
                          </FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAutoGenerate}
                          >
                            Auto Generate
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Role
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(roleDescriptions).map(([role, description]) => (
                            <SelectItem key={role} value={role}>
                              <div className="flex flex-col">
                                <span className="font-medium capitalize">{role.replace('_', ' ')}</span>
                                <span className="text-xs text-muted-foreground">{description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4" />
                        Status
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-green-500" />
                              <span>Active</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="inactive">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-gray-500" />
                              <span>Inactive</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormLabel className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Password
                  </FormLabel>
                  <div className="flex gap-2">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input type="password" placeholder="Enter password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generatePassword}
                    >
                      Generate
                    </Button>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Confirm password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Permissions Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Role Permissions</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    <span className="capitalize">{selectedRole.replace('_', ' ')} Role</span>
                  </div>
                </div>
                
                <div className="rounded-lg border p-4 bg-muted/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <AnimatePresence>
                      {permissions.map((permission, index) => (
                        <motion.div
                          key={permission}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center gap-3 p-2 rounded-md bg-background border"
                        >
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">{permission.replace('_', ' ')}</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">
                    These permissions are automatically assigned based on the selected role.
                  </p>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                      Registering...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Register Staff
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}