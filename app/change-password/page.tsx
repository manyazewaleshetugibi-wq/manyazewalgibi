"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut, getSession } from "next-auth/react";
import { motion } from "framer-motion";
import { 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  XCircle,
  ArrowLeft,
  Shield,
  AlertCircle,
  RefreshCw
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { redirectByRole } from "@/lib/utils";

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

export default function ChangePasswordPage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const { toast } = useToast();
  
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isRefreshingSession, setIsRefreshingSession] = useState(false);
  
  // Check if user needs to change password
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session?.user) {
      toast({
        title: "Access Denied",
        description: "Please login first.",
        variant: "destructive",
      });
      router.push("/login");
      return;
    }
    
    const user = session.user as SessionUser;
    if (!user.requiresPasswordChange) {
      toast({
        title: "Access Denied",
        description: "Password change is not required for your account.",
        variant: "destructive",
      });
      redirectByRole(user.role, router, false);
    }
  }, [session, status, router, toast]);
  
  // Check password strength
  useEffect(() => {
    if (!newPassword) {
      setPasswordStrength(0);
      return;
    }
    
    let strength = 0;
    if (newPassword.length >= 8) strength++;
    if (/[A-Z]/.test(newPassword)) strength++;
    if (/[a-z]/.test(newPassword)) strength++;
    if (/[0-9]/.test(newPassword)) strength++;
    if (/[^A-Za-z0-9]/.test(newPassword)) strength++;
    
    setPasswordStrength(strength);
  }, [newPassword]);
  
  const getStrengthColor = (strength: number) => {
    if (strength === 0) return "bg-gray-200";
    if (strength <= 1) return "bg-red-500";
    if (strength <= 2) return "bg-orange-500";
    if (strength <= 3) return "bg-yellow-500";
    if (strength <= 4) return "bg-blue-500";
    return "bg-green-500";
  };
  
  const getStrengthText = (strength: number) => {
    if (strength === 0) return "No password";
    if (strength <= 1) return "Very Weak";
    if (strength <= 2) return "Weak";
    if (strength <= 3) return "Fair";
    if (strength <= 4) return "Good";
    return "Strong";
  };
  
  // Function to force session refresh
  const forceSessionRefresh = async () => {
    setIsRefreshingSession(true);
    try {
      console.log("🔄 Forcing session refresh...");
      
      // Method 1: Use NextAuth's update function
      await update({
        requiresPasswordChange: false
      });
      
      // Method 2: Call session endpoint with no-cache headers
      await fetch('/api/auth/session', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        credentials: 'include'
      });
      
      // Method 3: Small delay and get fresh session
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newSession = await getSession();
      console.log("🔄 New session after refresh:", newSession?.user);
      
      if (newSession?.user) {
        const user = newSession.user as SessionUser;
        console.log("✅ Session refreshed successfully, requiresPasswordChange:", user.requiresPasswordChange);
        
        if (!user.requiresPasswordChange) {
          // Redirect based on role
          toast({
            title: "Success!",
            description: "Session updated successfully. Redirecting...",
            variant: "default",
          });
          redirectByRole(user.role, router, user.requiresPasswordChange);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error("❌ Session refresh error:", error);
      return false;
    } finally {
      setIsRefreshingSession(false);
    }
  };
  
  // Check for password change completion cookie
  useEffect(() => {
    const checkPasswordChangeCookie = () => {
      const cookies = document.cookie.split(';');
      const passwordChanged = cookies.some(cookie => 
        cookie.trim().startsWith('password-change-complete=')
      );
      const forceRefresh = cookies.some(cookie =>
        cookie.trim().startsWith('force-session-refresh=')
      );
      
      return passwordChanged || forceRefresh;
    };
    
    if (checkPasswordChangeCookie()) {
      // Clear the cookies
      document.cookie = 'password-change-complete=; max-age=0; path=/';
      document.cookie = 'force-session-refresh=; max-age=0; path=/';
      
      // Force session refresh
      if (session?.user) {
        setTimeout(() => {
          forceSessionRefresh();
        }, 500);
      }
    }
  }, [session]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Validations
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }
    
    // Check password complexity
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/.test(newPassword);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      setError("Password must contain uppercase, lowercase, number, and special character");
      return;
    }
    
    if (currentPassword === newPassword) {
      setError("New password must be different from current password");
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch("/api/auth/change-password-first", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Success!",
          description: data.message || "Password changed successfully. Updating your session...",
          variant: "default",
        });
        
        // Try multiple methods to refresh session
        console.log("🔄 Attempting to refresh session after password change...");
        
        // Method 1: Use NextAuth's update function
        await update({
          requiresPasswordChange: false
        });
        
        // Method 2: Add a small delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Method 3: Get fresh session
        const newSession = await getSession();
        
        if (newSession?.user) {
          const user = newSession.user as SessionUser;
          console.log("✅ Fresh session obtained, requiresPasswordChange:", user.requiresPasswordChange);
          
          if (!user.requiresPasswordChange) {
            // Redirect based on role
            toast({
              title: "Redirecting...",
              description: "Your session has been updated successfully.",
              variant: "default",
            });
            redirectByRole(user.role, router, user.requiresPasswordChange);
          } else {
            // If session still shows requiresPasswordChange, try force refresh
            console.log("🔄 Session still shows requiresPasswordChange=true, forcing refresh...");
            await forceSessionRefresh();
          }
        } else {
          // If no session, try force refresh
          console.log("🔄 No session found, forcing refresh...");
          await forceSessionRefresh();
        }
      } else {
        setError(data.message || "Failed to change password");
      }
    } catch (err) {
      console.error("❌ Password change error:", err);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };
  
  const handleManualRefresh = async () => {
    setIsRefreshingSession(true);
    const success = await forceSessionRefresh();
    
    if (!success) {
      toast({
        title: "Session Refresh Failed",
        description: "Please try logging out and logging back in.",
        variant: "destructive",
      });
    }
  };
  
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  const user = session?.user as SessionUser;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Shield className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">
                Change Your Password
              </CardTitle>
              <CardDescription className="text-center">
                For security reasons, you must change your password before accessing the system.
              </CardDescription>
              
              {/* Session Refresh Status */}
              {isRefreshingSession && (
                <Alert className="mt-4 bg-blue-50 border-blue-200">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <AlertDescription>
                    Refreshing your session after password change...
                  </AlertDescription>
                </Alert>
              )}
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* User Info */}
                {user && (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">Account: {user.email}</p>
                    <p className="text-xs text-muted-foreground">Role: {user.role}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Status: {user.requiresPasswordChange ? "Password Change Required" : "Active"}
                    </p>
                  </div>
                )}
                
                {/* Current Password */}
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="pr-10"
                      disabled={loading || isRefreshingSession}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      disabled={loading || isRefreshingSession}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="pr-10"
                      disabled={loading || isRefreshingSession}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      disabled={loading || isRefreshingSession}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {newPassword && (
                    <div className="space-y-2 mt-2">
                      <div className="flex justify-between text-sm">
                        <span>Password strength:</span>
                        <span className="font-medium">{getStrengthText(passwordStrength)}</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getStrengthColor(passwordStrength)} transition-all duration-300`}
                          style={{ width: `${(passwordStrength / 5) * 100}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-xs text-gray-600">
                        <div className={`flex items-center gap-1 ${newPassword.length >= 8 ? "text-green-600" : ""}`}>
                          {newPassword.length >= 8 ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          At least 8 characters
                        </div>
                        <div className={`flex items-center gap-1 ${/[A-Z]/.test(newPassword) ? "text-green-600" : ""}`}>
                          {/[A-Z]/.test(newPassword) ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          Uppercase letter
                        </div>
                        <div className={`flex items-center gap-1 ${/[a-z]/.test(newPassword) ? "text-green-600" : ""}`}>
                          {/[a-z]/.test(newPassword) ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          Lowercase letter
                        </div>
                        <div className={`flex items-center gap-1 ${/\d/.test(newPassword) ? "text-green-600" : ""}`}>
                          {/\d/.test(newPassword) ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          Number
                        </div>
                        <div className={`flex items-center gap-1 ${/[^A-Za-z0-9]/.test(newPassword) ? "text-green-600" : ""}`}>
                          {/[^A-Za-z0-9]/.test(newPassword) ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          Special character
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="pr-10"
                      disabled={loading || isRefreshingSession}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={loading || isRefreshingSession}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                {/* Error Message */}
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                {/* Security Tips */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  <p className="font-semibold mb-1">Security Tips:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Use a unique password not used elsewhere</li>
                    <li>Include a mix of characters for better security</li>
                    <li>Consider using a password manager</li>
                    <li>Never share your password with anyone</li>
                  </ul>
                </div>
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || isRefreshingSession}
                >
                  {loading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                      Changing Password...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Change Password
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-3">
              <div className="text-center text-sm text-gray-600">
                <p>After changing your password, your session will be automatically refreshed.</p>
                <p className="mt-1 text-xs">If you encounter issues, try the manual refresh button below.</p>
              </div>
              
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleManualRefresh}
                disabled={loading || isRefreshingSession}
              >
                {isRefreshingSession ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                    Refreshing Session...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Manual Session Refresh
                  </>
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleLogout}
                disabled={loading || isRefreshingSession}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Login
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
        
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Having trouble? Contact your system administrator.</p>
        </div>
      </div>
    </div>
  );
}
