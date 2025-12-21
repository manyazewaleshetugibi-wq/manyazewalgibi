"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn, getSession, useSession } from "next-auth/react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import toast from "react-hot-toast";
import { useTheme } from "next-themes";
import { redirectByRole } from "@/lib/utils";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Define the session user type
interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  employeeId?: string;
  permissions: string[];
  requiresPasswordChange: boolean;
  image?: string;
}

export default function LoginPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <LoginPage />
    </Suspense>
  );
}

function LoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const { theme } = useTheme();
  const { data: session, status } = useSession();

  useEffect(() => {
    // Check if already authenticated
    const checkAuth = async () => {
      if (status === "loading") return;
      
      if (session?.user) {
        const user = session.user as SessionUser;
        redirectByRole(
          user.role, 
          router, 
          user.requiresPasswordChange
        );
      }
    };

    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setFormData(prev => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }

    checkAuth();
  }, [session, status, router]);

  const validateForm = () => {
    try {
      loginSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: { [key: string]: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isBlocked) {
      toast.error("Too many login attempts. Please try again later.");
      return;
    }

    if (!validateForm()) {
      toast.error("Please fix the form errors");
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.password,
        callbackUrl: callbackUrl,
      });

      if (result?.error) {
        setLoginAttempts(prev => {
          const newAttempts = prev + 1;
          if (newAttempts >= 5) {
            setIsBlocked(true);
            setTimeout(() => {
              setIsBlocked(false);
              setLoginAttempts(0);
            }, 300000); // 5 minutes
          }
          return newAttempts;
        });

        toast.error(result.error, {
          icon: '❌',
          style: {
            borderRadius: '10px',
            background: theme === 'dark' ? '#333' : '#fff',
            color: theme === 'dark' ? '#fff' : '#333',
          },
        });
      } else {
        if (rememberMe) {
          localStorage.setItem("rememberedEmail", formData.email);
        } else {
          localStorage.removeItem("rememberedEmail");
        }

        toast.success("Welcome back!", {
          icon: '🎉',
          style: {
            borderRadius: '10px',
            background: theme === 'dark' ? '#333' : '#fff',
            color: theme === 'dark' ? '#fff' : '#333',
          },
        });

        // Wait a moment for the session to be updated
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Get updated session
        const session = await getSession();
        
        if (session?.user) {
          const user = session.user as SessionUser;
          // Redirect based on role and password change requirement
          redirectByRole(
            user.role, 
            router, 
            user.requiresPasswordChange
          );
        }
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        when: "beforeChildren",
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { type: "spring", stiffness: 100 },
    },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={formVariants}
      className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20"
    >
      <div className={cn("flex flex-col gap-6 w-full max-w-[900px]")}>
        <Card className="overflow-hidden border-2 shadow-lg">
          <CardContent className="grid p-0 md:grid-cols-2">
            <motion.form 
              variants={itemVariants} 
              onSubmit={handleSubmit} 
              className="p-6 md:p-8 space-y-6"
            >
              <div className="flex flex-col gap-6">
                <motion.div 
                  variants={itemVariants} 
                  className="flex flex-col items-center text-center space-y-2"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="w-16 h-16 flex items-center justify-center mb-4"
                  >
                    <img
                      src="/man_logo.png"
                      alt="Logo"
                      className="w-30 h-15"
                    />
                  </motion.div>
                  <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
                  <p className="text-muted-foreground">Login to your account</p>
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="m@example.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={cn(
                        "pr-10",
                        errors.email ? "border-destructive focus:ring-destructive" : ""
                      )}
                      required
                    />
                    <AnimatePresence>
                      {errors.email && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                        >
                          <AlertCircle className="h-5 w-5 text-destructive" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  {errors.email && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-destructive mt-1"
                    >
                      {errors.email}
                    </motion.p>
                  )}
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleInputChange}
                      className={cn(
                        "pr-10",
                        errors.password ? "border-destructive focus:ring-destructive" : ""
                      )}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-sm text-destructive mt-1"
                    >
                      {errors.password}
                    </motion.p>
                  )}
                </motion.div>

                <motion.div variants={itemVariants} className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  />
                  <label
                    htmlFor="remember"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Remember me
                  </label>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Button
                    type="submit"
                    className="w-full relative overflow-hidden"
                    disabled={isLoading || isBlocked}
                  >
                    <AnimatePresence mode="wait">
                      {isLoading ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 flex items-center justify-center bg-primary"
                        >
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                    <span className={cn(isLoading ? "opacity-0" : "opacity-100")}>
                      Login
                    </span>
                </Button>
                </motion.div>

                {isBlocked && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-destructive text-center"
                  >
                    Too many login attempts. Please try again in 5 minutes.
                  </motion.div>
                )}

                <motion.div variants={itemVariants} className="text-center text-sm">
                
                  <motion.a
                    href="/"
                    className="text-primary underline-offset-4 hover:underline decoration-non"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                   Go Home
                  </motion.a>
                </motion.div>
              </div>
            </motion.form>

            <div className="relative hidden md:block overflow-hidden">
              <motion.div
                initial={{ scale: 1.1, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0"
              >
                <img
                  src="/stock1.jpg"
                  alt="Authentication"
                  className="absolute inset-0 h-full w-full object-cover transition-all duration-500 hover:scale-105 dark:brightness-[0.2] dark:grayscale"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-background/20" />
              </motion.div>
            </div>
          </CardContent>
        </Card>

        <motion.div
          variants={itemVariants}
          className="text-center text-xs text-muted-foreground [&_a]:underline hover:[&_a]:text-primary"
        >
          By clicking continue, you agree to our{" "}
          <motion.a
            href="#"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Terms of Service
          </motion.a>{" "}
          and{" "}
          <motion.a
            href="#"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Privacy Policy
          </motion.a>
          .
        </motion.div>
      </div>
    </motion.div>
  );
}