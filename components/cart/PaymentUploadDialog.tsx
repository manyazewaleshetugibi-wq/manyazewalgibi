// components/cart/PaymentUploadDialog.tsx - COMPLETE FIXED VERSION

'use client'

import React, { memo, useRef } from 'react'
import { CreditCard, Upload, X, Check, AlertCircle, Loader2, Banknote, Receipt } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { PaymentScreenshot } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'

interface PaymentUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  paymentScreenshot: PaymentScreenshot
  onRemoveScreenshot: () => void
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  transactionId: string
  onTransactionIdChange: (value: string) => void
  subtotal: number
  tax: number
  orderType: string
  deliveryFee: number
  total: number
  onFinalizeOrder: () => Promise<void>
  isPlacingOrder: boolean
}

const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0'
  }
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

export const PaymentUploadDialog = memo(({
  open,
  onOpenChange,
  paymentScreenshot,
  onRemoveScreenshot,
  onFileUpload,
  transactionId,
  onTransactionIdChange,
  subtotal = 0,
  tax = 0,
  orderType = '',
  deliveryFee = 0,
  total = 0,
  onFinalizeOrder,
  isPlacingOrder = false,
}: PaymentUploadDialogProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileInputClick = () => {
    fileInputRef.current?.click()
  }

  const formattedSubtotal = formatCurrency(subtotal)
  const formattedTax = formatCurrency(tax)
  const formattedDeliveryFee = formatCurrency(deliveryFee)
  const formattedTotal = formatCurrency(total)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0 bg-gradient-to-br from-white to-purple-50/30 border-0 shadow-2xl rounded-2xl">
        {/* REQUIRED: DialogTitle for accessibility - hidden visually but accessible to screen readers */}
        <DialogTitle className="sr-only">
          Payment Verification
        </DialogTitle>
        
        <DialogDescription className="sr-only">
          Please upload a screenshot of your payment confirmation to verify your order
        </DialogDescription>

        {/* Decorative header gradient */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-purple-900/20 to-transparent rounded-t-2xl" />
        
        <div className="relative">
          {/* Visual Header */}
          <div className="p-6 pb-0">
            <div className="flex items-center gap-3 text-2xl font-bold">
              <div className="p-3 bg-gradient-to-br from-purple-800 to-purple-900 rounded-xl shadow-lg">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <span className="bg-gradient-to-r from-purple-900 to-purple-700 bg-clip-text text-transparent">
                Payment Verification
              </span>
            </div>
            <p className="text-gray-600 pl-2 mt-1 text-sm">
              Please upload a screenshot of your payment confirmation
            </p>
          </div>
          
          <div className="p-6 space-y-5">
            {/* Bank Details */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-purple-50 to-white border-2 border-purple-200 rounded-xl p-5 shadow-lg"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Banknote className="h-5 w-5 text-purple-900" />
                </div>
                <h3 className="font-bold text-purple-900">Bank Transfer Details</h3>
                <Badge className="ml-auto bg-purple-900 text-white border-0">Required</Badge>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-purple-100">
                  <span className="text-gray-600">Bank:</span>
                  <span className="font-semibold text-purple-900">Commercial Bank of Ethiopia</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-purple-100">
                  <span className="text-gray-600">Account Number:</span>
                  <span className="font-semibold text-purple-900 font-mono">1000000000000</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-purple-100">
                  <span className="text-gray-600">Account Name:</span>
                  <span className="font-semibold text-purple-900">Manyazewal Eshetu Gibi</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 font-medium">Amount to Pay:</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-purple-900">{formattedTotal}</span>
                    <span className="text-sm text-gray-500 ml-1">ETB</span>
                  </div>
                </div>
              </div>
            </motion.div>
            
            {/* Upload Section */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2 text-purple-900">
                <div className="p-1 bg-purple-100 rounded-md">
                  <Upload className="h-3 w-3 text-purple-900" />
                </div>
                Upload Payment Screenshot <span className="text-red-500">*</span>
              </Label>
              
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="border-2 border-dashed border-purple-200 rounded-xl p-5 text-center hover:border-purple-900 transition-all bg-white/50 backdrop-blur-sm"
              >
                <AnimatePresence mode="wait">
                  {paymentScreenshot.previewUrl ? (
                    <motion.div
                      key="preview"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-4"
                    >
                      <div className="relative w-full h-48 mx-auto rounded-xl overflow-hidden border-2 border-purple-200 shadow-lg group">
                        <div className="absolute inset-0 bg-gradient-to-t from-purple-900/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10" />
                        <img
                          src={paymentScreenshot.previewUrl}
                          alt="Payment screenshot"
                          className="object-contain w-full h-full"
                        />
                      </div>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={onRemoveScreenshot}
                          className="mt-2 rounded-full px-6"
                          type="button"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Remove Image
                        </Button>
                      </motion.div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="upload"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-4"
                    >
                      <div className="p-4 bg-purple-50 rounded-full w-20 h-20 mx-auto flex items-center justify-center">
                        <Upload className="h-10 w-10 text-purple-900" />
                      </div>
                      <div className="text-sm text-gray-600">
                        Click to browse or drag and drop
                      </div>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={onFileUpload}
                        className="hidden"
                        id="payment-screenshot"
                        ref={fileInputRef}
                      />
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant="outline"
                          onClick={handleFileInputClick}
                          type="button"
                          className="rounded-full px-8 border-2 border-purple-200 hover:border-purple-900 hover:bg-purple-50"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Choose File
                        </Button>
                      </motion.div>
                      <p className="text-xs text-gray-500">
                        Supported: JPG, PNG (Max 5MB)
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
            
            {/* Transaction ID */}
            <div className="space-y-2">
              <Label htmlFor="transaction-id" className="text-sm font-medium text-purple-900 flex items-center gap-2">
                <div className="p-1 bg-purple-100 rounded-md">
                  <Receipt className="h-3 w-3 text-purple-900" />
                </div>
                Transaction ID / Reference Number
              </Label>
              <Input
                id="transaction-id"
                placeholder="Enter transaction ID if available"
                value={transactionId}
                onChange={(e) => onTransactionIdChange(e.target.value)}
                className="border-2 border-purple-200 focus:border-purple-900 focus:ring-2 focus:ring-purple-200 rounded-xl h-12"
              />
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <span className="w-1 h-1 bg-purple-500 rounded-full" />
                This helps us verify your payment faster
              </p>
            </div>
            
            {/* Order Summary */}
            <motion.div 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-purple-50 to-white border-2 border-purple-200 rounded-xl p-5 shadow-lg"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Receipt className="h-5 w-5 text-purple-900" />
                </div>
                <h3 className="font-bold text-purple-900">Order Summary</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-purple-100">
                  <span className="text-gray-600">Original Price (before tax):</span>
                  <span className="font-semibold text-purple-900">{formattedSubtotal} ETB</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-purple-100">
                  <span className="text-gray-600">Tax (15%):</span>
                  <span className="font-semibold text-purple-900">{formattedTax} ETB</span>
                </div>
                {orderType === 'delivery' && (
                  <div className="flex justify-between items-center py-2 border-b border-purple-100">
                    <span className="text-gray-600">Delivery Fee:</span>
                    <span className="font-semibold text-purple-900">{formattedDeliveryFee} ETB</span>
                  </div>
                )}
                
                <Separator className="my-2 bg-gradient-to-r from-transparent via-purple-200 to-transparent" />
                
                <div className="flex justify-between items-center pt-2">
                  <span className="text-base font-bold text-gray-800">Total (including tax):</span>
                  <div className="text-right">
                    <span className="text-2xl font-bold bg-gradient-to-r from-purple-900 to-purple-700 bg-clip-text text-transparent">
                      {formattedTotal}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">ETB</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Error Alert */}
            <AnimatePresence>
              {!paymentScreenshot.uploaded && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Alert variant="destructive" className="py-3 rounded-xl border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-700 font-medium">
                      Please upload a payment screenshot to continue
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <DialogFooter className="p-6 pt-0 gap-3">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1"
            >
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)} 
                disabled={isPlacingOrder}
                type="button"
                className="w-full rounded-xl border-2 border-purple-200 hover:border-purple-900 hover:bg-purple-50 h-12"
              >
                Cancel
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1"
            >
              <Button
                onClick={onFinalizeOrder}
                disabled={!paymentScreenshot.uploaded || isPlacingOrder}
                className="w-full rounded-xl bg-gradient-to-r from-purple-800 to-purple-900 hover:from-purple-900 hover:to-purple-950 text-white border-0 shadow-lg h-12"
                type="button"
              >
                {isPlacingOrder ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Confirm Payment
                  </>
                )}
              </Button>
            </motion.div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
})

PaymentUploadDialog.displayName = 'PaymentUploadDialog'

export default PaymentUploadDialog