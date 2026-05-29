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
  BadgeCheck,
  Eye,
  EyeOff,
  AlertCircle
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  ]
};

// Password strength indicator function
const getPasswordStrength = (password: string) => {
  if (!password) return { score: 0, text: "No password", color: "bg-gray-200" };
  
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  
  const strength = [
    { text: "Very Weak", color: "bg-red-500" },
    { text: "Weak", color: "bg-orange-500" },
    { text: "Fair", color: "bg-yellow-500" },
    { text: "Good", color: "bg-blue-500" },
    { text: "Strong", color: "bg-green-500" }
  ];
  
  return strength[Math.min(score, 4)];
};

// Define the form schema
const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  employeeId: z.string().min(3, "Employee ID must be at least 3 characters"),
  role: z.enum(["admin", "kitchen", "stock_manager", "fb", "marketing", "finance", "pos"]),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
  status: z.enum(["active", "inactive"]).default("active"),
  requiresPasswordChange: z.boolean().default(true),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;

export function StaffRegistrationForm() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      employeeId: "",
      role: "pos",
      password: "",
      confirmPassword: "",
      status: "active",
      requiresPasswordChange: true,
    },
  });

  // Watch role changes to update permissions
  const selectedRole = form.watch("role");
  const password = form.watch("password");

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
    };
    const prefix = roleMap[role] || "EMP";
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${randomNum}`;
  };

  const handleAutoGenerate = () => {
    form.setValue("employeeId", generateEmployeeId());
  };

  const generateSecurePassword = () => {
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*";
    
    const allChars = lowercase + uppercase + numbers + symbols;
    let password = "";
    
    // Ensure at least one of each type
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill the rest with random characters
    for (let i = 4; i < 12; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    password = password.split('').sort(() => Math.random() - 0.5).join('');
    
    setGeneratedPassword(password);
    form.setValue("password", password);
    form.setValue("confirmPassword", password);
  };

  const copyToClipboard = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      toast({
        title: "Password copied!",
        description: "Password has been copied to clipboard.",
      });
    }
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const staffData = {
        name: values.name,
        email: values.email,
        phone: values.phone,
        employeeId: values.employeeId,
        role: values.role,
        password: values.password,
        status: values.status,
        requiresPasswordChange: values.requiresPasswordChange,
        permissions: rolePermissions[values.role] || [],
      };

      console.log("Sending staff data:", staffData);

      const response = await axios.post("/api/staff", staffData);
      
      if (response.data.success) {
        toast({
          title: "Staff Registered Successfully",
          description: (
            <div className="space-y-2">
              <p>{values.name} has been added to the system.</p>
              <Alert className="mt-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Important:</strong> User will be required to change their password on first login.
                </AlertDescription>
              </Alert>
            </div>
          ),
          variant: "default",
        });

        form.reset();
        setGeneratedPassword("");
        setOpen(false);
      }
    } catch (error: any) {
      console.error("Registration error:", error.response?.data);
      
      // Show detailed error message
      const errorMessage = error.response?.data?.message || "An error occurred while registering staff.";
      const errorDetails = error.response?.data?.error;
      
      toast({
        title: "Registration Failed",
        description: errorDetails ? `${errorMessage}\nDetails: ${errorDetails}` : errorMessage,
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
  };

  const passwordStrength = getPasswordStrength(password);

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

                <div className="space-y-3">
                  <FormLabel className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Password
                  </FormLabel>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input 
                                  type={showPassword ? "text" : "password"} 
                                  placeholder="Enter password" 
                                  {...field} 
                                  className="pr-10"
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={generateSecurePassword}
                      >
                        Generate
                      </Button>
                    </div>
                    
                    {/* Password Strength Indicator */}
                    {password && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Password strength:</span>
                          <span className="text-xs font-medium">{passwordStrength.text}</span>
                        </div>
                        <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${passwordStrength.color} transition-all duration-300`}
                            style={{ width: `${((passwordStrength.score + 1) / 5) * 100}%` }}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          <div className={`flex items-center gap-1 ${password.length >= 8 ? "text-green-600" : "text-gray-400"}`}>
                            {password.length >= 8 ? "✓" : "○"} At least 8 characters
                          </div>
                          <div className={`flex items-center gap-1 ${/[A-Z]/.test(password) ? "text-green-600" : "text-gray-400"}`}>
                            {/[A-Z]/.test(password) ? "✓" : "○"} Uppercase letter
                          </div>
                          <div className={`flex items-center gap-1 ${/[a-z]/.test(password) ? "text-green-600" : "text-gray-400"}`}>
                            {/[a-z]/.test(password) ? "✓" : "○"} Lowercase letter
                          </div>
                          <div className={`flex items-center gap-1 ${/[0-9]/.test(password) ? "text-green-600" : "text-gray-400"}`}>
                            {/[0-9]/.test(password) ? "✓" : "○"} Number
                          </div>
                          <div className={`flex items-center gap-1 ${/[^A-Za-z0-9]/.test(password) ? "text-green-600" : "text-gray-400"}`}>
                            {/[^A-Za-z0-9]/.test(password) ? "✓" : "○"} Special character
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Generated Password Display */}
                    {generatedPassword && (
                      <div className="p-2 bg-muted rounded-md">
                        <div className="flex items-center justify-between">
                          <div className="text-sm">
                            <span className="text-muted-foreground">Generated password: </span>
                            <span className="font-mono">{showPassword ? generatedPassword : "••••••••••••"}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => setShowPassword(!showPassword)}
                              title={showPassword ? "Hide password" : "Show password"}
                            >
                              {showPassword ? (
                                <EyeOff className="h-3 w-3" />
                              ) : (
                                <Eye className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={copyToClipboard}
                              title="Copy password"
                            >
                              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                              </svg>
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input 
                            type={showConfirmPassword ? "text" : "password"} 
                            placeholder="Confirm password" 
                            {...field} 
                            className="pr-10"
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              {/* Security Notice */}
              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-sm">
                  <strong>Security Notice:</strong> New users will be required to change their password on their first login for enhanced security.
                </AlertDescription>
              </Alert>

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
                  onClick={() => {
                    form.reset();
                    setGeneratedPassword("");
                    setOpen(false);
                  }}
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
