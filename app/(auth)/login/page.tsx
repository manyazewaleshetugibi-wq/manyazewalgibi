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
          <Loader2 className="h-8 w-8 animate-spin text-purple-900" />
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

        // Get updated session, with retries to avoid a race where the
        // freshly-set session cookie isn't yet visible to getSession()
        let session: Awaited<ReturnType<typeof getSession>> = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          session = await getSession();
          if (session?.user) break;
          await new Promise(resolve => setTimeout(resolve, 400));
        }

        if (session?.user) {
          const user = session.user as SessionUser;
          // Redirect based on role and password change requirement
          redirectByRole(
            user.role,
            router,
            user.requiresPasswordChange ?? false
          );
        } else {
          // fallback: honor the callbackUrl (e.g. /dashboard) if we couldn't
          // read the session yet — the protected-route gate will still apply
          router.replace(callbackUrl);
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
      className="flex min-h-screen items-center justify-center p-4 md:bg-gradient-to-b md:from-background md:to-purple-50 dark:md:to-purple-950/20"
    >
      <div className={cn(
        "flex flex-col gap-6 w-full max-w-[900px]",
        "md:max-w-[900px]"
      )}>
        {/* On mobile: No card background, full width form. On desktop: Card with shadow and border */}
        <div className={cn(
          "overflow-hidden w-full",
          // Desktop styles
          "md:border-2 md:border-purple-200 dark:md:border-purple-900 md:shadow-lg md:hover:shadow-purple-100 dark:md:hover:shadow-purple-900/20 md:transition-shadow md:duration-300 md:rounded-lg",
          // Mobile styles: clean, no background, no border, no shadow
          "bg-transparent md:bg-card"
        )}>
          <div className={cn(
            "grid w-full",
            "md:grid-cols-2",
            "grid-cols-1"
          )}>
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
                      src="/man_logo.jpg"
                      alt="Logo"
                      className="w-30 h-15"
                    />
                  </motion.div>
                  <h1 className="text-2xl font-bold tracking-tight text-purple-900 dark:text-purple-400">Welcome back</h1>
                  <p className="text-muted-foreground">Login to your account</p>
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-2">
                  <Label htmlFor="email" className="text-purple-900 dark:text-purple-400 font-medium">Email</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="m@example.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={cn(
                        "pr-10 border-2 focus:border-purple-900 focus:ring-purple-900 transition-all duration-300",
                        errors.email ? "border-destructive focus:ring-destructive" : "border-purple-200 dark:border-purple-800"
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
                  <Label htmlFor="password" className="text-purple-900 dark:text-purple-400 font-medium">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleInputChange}
                      className={cn(
                        "pr-10 border-2 focus:border-purple-900 focus:ring-purple-900 transition-all duration-300",
                        errors.password ? "border-destructive focus:ring-destructive" : "border-purple-200 dark:border-purple-800"
                      )}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-900 transition-colors"
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
                    className="border-2 border-purple-300 data-[state=checked]:bg-purple-900 data-[state=checked]:border-purple-900"
                  />
                  <label
                    htmlFor="remember"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-purple-800 dark:text-purple-300"
                  >
                    Remember me
                  </label>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Button
                    type="submit"
                    className="w-full relative overflow-hidden bg-purple-900 hover:bg-purple-800 text-white transition-all duration-300 hover:shadow-lg hover:shadow-purple-900/25"
                    disabled={isLoading || isBlocked}
                  >
                    <AnimatePresence mode="wait">
                      {isLoading ? (
                        <motion.div
                          key="loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 flex items-center justify-center bg-purple-800"
                        >
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
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

                <motion.div variants={itemVariants} className="text-center text-sm space-y-2">
                  <p className="text-gray-600 dark:text-gray-400">
                    Don't have an account?{" "}
                    <a 
                      className="text-purple-900 dark:text-purple-400 font-semibold hover:text-purple-700 dark:hover:text-purple-300 hover:underline decoration-2 underline-offset-2 transition-all duration-300 hover:text-lg inline-block" 
                      href="/register"
                    >
                      Register
                    </a>
                  </p>
                  <motion.a
                    href="/"
                    className="text-purple-600 dark:text-purple-400 underline-offset-4 hover:text-purple-900 dark:hover:text-purple-300 hover:underline decoration-2 transition-all duration-300 inline-block"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                   Go Home
                  </motion.a>
                </motion.div>
              </div>
            </motion.form>

            {/* Desktop only: right side image panel - hidden on mobile */}
            <div className="relative hidden md:block overflow-hidden bg-gradient-to-br from-purple-900 to-purple-700 rounded-r-lg">
              <motion.div
                initial={{ scale: 1.1, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0"
              >
                <img
                  src="/stock1.jpg"
                  alt="Authentication"
                  className="absolute inset-0 h-full w-full object-cover transition-all duration-700 hover:scale-110 mix-blend-overlay opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-purple-900/90 via-purple-900/50 to-transparent" />
                
                {/* Decorative Elements */}
                <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                  <motion.h3 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-2xl font-bold mb-2"
                  >
                    Welcome Back!
                  </motion.h3>
                  <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="text-purple-100"
                  >
                    Sign in to access your account and continue your journey with us.
                  </motion.p>
                </div>
              </motion.div>
            </div>
          </div>

          {/* like */}
        </div>

        
      </div>
    </motion.div>
  );
}