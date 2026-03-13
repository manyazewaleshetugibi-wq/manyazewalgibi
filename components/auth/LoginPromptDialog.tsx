'use client'

import React, { memo } from 'react'
import { LogIn, AlertCircle } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface LoginPromptDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLogin: () => void
  message?: string
}

export const LoginPromptDialog = memo(({ 
  open, 
  onOpenChange,
  onLogin,
  message = 'Please login to continue'
}: LoginPromptDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-2xl">
          <LogIn className="h-6 w-6 text-primary" />
          Login Required
        </DialogTitle>
        <DialogDescription className="text-base pt-2">
          {message}
        </DialogDescription>
      </DialogHeader>
      
      <div className="py-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            You need to be logged in to:
            <ul className="list-disc ml-4 mt-2 space-y-1">
              <li>Add items to your cart</li>
              <li>Place orders</li>
              <li>Track your order history</li>
              <li>Save your delivery information</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
      
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={onLogin} className="bg-primary hover:bg-primary/90">
          <LogIn className="mr-2 h-4 w-4" />
          Login Now
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
))

LoginPromptDialog.displayName = 'LoginPromptDialog'