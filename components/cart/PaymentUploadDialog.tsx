// components/cart/PaymentUploadDialog.tsx - FULL SCREEN MERGED (Guest Info + Payment)

'use client'

import React, { memo, useRef, useState } from 'react'
import {
  CreditCard, Upload, X, Check, Loader2, Banknote, Receipt,
  ArrowLeft, User, Phone, Mail, UserPlus, ChevronRight
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { PaymentScreenshot } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'

interface GuestUserData {
  firstName: string
  lastName: string
  phone: string
  email: string
  isGuest: boolean
}

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
  // Guest info props
  isUserLoggedIn?: boolean
  onGuestOrder?: (guestData: GuestUserData) => void
  guestData?: GuestUserData | null
}

const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null || isNaN(value)) return '0.00'
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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
  isUserLoggedIn = false,
  onGuestOrder,
  guestData,
}: PaymentUploadDialogProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Guest info state (only used when not logged in)
  const [guestInfo, setGuestInfo] = useState<GuestUserData>(
    guestData ?? { firstName: '', lastName: '', phone: '', email: '', isGuest: true }
  )
  const [guestErrors, setGuestErrors] = useState<Partial<Record<keyof GuestUserData, string>>>({})

  const validateGuest = (): boolean => {
    const errors: Partial<Record<keyof GuestUserData, string>> = {}
    if (!guestInfo.firstName.trim()) errors.firstName = 'Required'
    if (!guestInfo.lastName.trim()) errors.lastName = 'Required'
    if (!guestInfo.phone.trim()) errors.phone = 'Required'
    else if (!/^[0-9+\-\s]{8,15}$/.test(guestInfo.phone)) errors.phone = 'Invalid (e.g. 0912345678)'
    if (guestInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestInfo.email)) errors.email = 'Invalid email'
    setGuestErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleConfirm = async () => {
    if (!isUserLoggedIn) {
      if (!validateGuest()) return
      onGuestOrder?.(guestInfo)
    }
    await onFinalizeOrder()
  }

  const canConfirm = paymentScreenshot.uploaded && !isPlacingOrder

  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="payment-fullscreen"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'tween', duration: 0.25 }}
          className="fixed inset-0 z-50 flex flex-col bg-gradient-to-br from-white to-purple-50/40"
          style={{ overscrollBehavior: 'contain' }}
        >
          {/* ── Header ── */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-purple-100 bg-white/90 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-full hover:bg-purple-50 text-purple-900 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </motion.button>
            <div className="flex items-center gap-2 flex-1">
              <div className="p-1.5 bg-gradient-to-br from-purple-800 to-purple-900 rounded-lg shadow">
                <CreditCard className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-sm bg-gradient-to-r from-purple-900 to-purple-700 bg-clip-text text-transparent">
                  Complete Your Order
                </h2>
                <p className="text-[10px] text-gray-500">
                  {!isUserLoggedIn ? 'Guest info & payment' : 'Payment verification'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-500">Total</p>
              <p className="text-sm font-bold text-purple-900">{formatCurrency(total)} Birr</p>
            </div>
          </div>

          {/* ── Scrollable Body ── */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-5 pb-32">

              {/* ── SECTION 1: Guest Info (only for non-logged-in users) ── */}
              {!isUserLoggedIn && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="bg-white border border-purple-200 rounded-2xl overflow-hidden shadow-sm"
                >
                  {/* Section header */}
                  <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-50 to-white border-b border-purple-100">
                    <div className="p-1.5 bg-purple-100 rounded-lg">
                      <UserPlus className="h-4 w-4 text-purple-900" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-purple-900">Guest Information</h3>
                      <p className="text-[10px] text-gray-500">Required to complete your order</p>
                    </div>
                    <Badge className="bg-red-100 text-red-700 border-0 text-[9px]">Required</Badge>
                  </div>

                  <div className="p-4 space-y-3">
                    {/* First + Last name row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium text-purple-900 flex items-center gap-1">
                          First Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={guestInfo.firstName}
                          onChange={e => {
                            setGuestInfo(p => ({ ...p, firstName: e.target.value }))
                            if (guestErrors.firstName) setGuestErrors(p => ({ ...p, firstName: undefined }))
                          }}
                          placeholder="John"
                          className={`h-10 text-[12px] rounded-xl border-2 focus:ring-2 focus:ring-purple-200 ${guestErrors.firstName ? 'border-red-400' : 'border-purple-200 focus:border-purple-600'}`}
                        />
                        {guestErrors.firstName && <p className="text-[9px] text-red-500">{guestErrors.firstName}</p>}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium text-purple-900 flex items-center gap-1">
                          Last Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={guestInfo.lastName}
                          onChange={e => {
                            setGuestInfo(p => ({ ...p, lastName: e.target.value }))
                            if (guestErrors.lastName) setGuestErrors(p => ({ ...p, lastName: undefined }))
                          }}
                          placeholder="Doe"
                          className={`h-10 text-[12px] rounded-xl border-2 focus:ring-2 focus:ring-purple-200 ${guestErrors.lastName ? 'border-red-400' : 'border-purple-200 focus:border-purple-600'}`}
                        />
                        {guestErrors.lastName && <p className="text-[9px] text-red-500">{guestErrors.lastName}</p>}
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium text-purple-900 flex items-center gap-1">
                        <Phone className="h-3 w-3" /> Phone Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={guestInfo.phone}
                        onChange={e => {
                          setGuestInfo(p => ({ ...p, phone: e.target.value }))
                          if (guestErrors.phone) setGuestErrors(p => ({ ...p, phone: undefined }))
                        }}
                        placeholder="0912345678"
                        className={`h-10 text-[12px] rounded-xl border-2 focus:ring-2 focus:ring-purple-200 ${guestErrors.phone ? 'border-red-400' : 'border-purple-200 focus:border-purple-600'}`}
                      />
                      {guestErrors.phone && <p className="text-[9px] text-red-500">{guestErrors.phone}</p>}
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium text-purple-900 flex items-center gap-1">
                        <Mail className="h-3 w-3" /> Email <span className="text-[9px] text-gray-400 font-normal">(optional)</span>
                      </Label>
                      <Input
                        value={guestInfo.email}
                        onChange={e => {
                          setGuestInfo(p => ({ ...p, email: e.target.value }))
                          if (guestErrors.email) setGuestErrors(p => ({ ...p, email: undefined }))
                        }}
                        placeholder="john@example.com"
                        className={`h-10 text-[12px] rounded-xl border-2 focus:ring-2 focus:ring-purple-200 ${guestErrors.email ? 'border-red-400' : 'border-purple-200 focus:border-purple-600'}`}
                      />
                      {guestErrors.email && <p className="text-[9px] text-red-500">{guestErrors.email}</p>}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── SECTION 2: Bank Transfer Details ── */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white border border-purple-200 rounded-2xl overflow-hidden shadow-sm"
              >
                <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-50 to-white border-b border-purple-100">
                  <div className="p-1.5 bg-purple-100 rounded-lg">
                    <Banknote className="h-4 w-4 text-purple-900" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-purple-900">Bank Transfer Details</h3>
                    <p className="text-[10px] text-gray-500">Transfer the exact amount below</p>
                  </div>
                  <Badge className="bg-purple-900 text-white border-0 text-[9px]">Required</Badge>
                </div>

                <div className="p-4 space-y-0">
                  {[
                    { label: 'Bank', value: 'Commercial Bank of Ethiopia' },
                    { label: 'Account No.', value: '1000000000000', mono: true },
                    { label: 'Account Name', value: 'Manyazewal Eshetu Gibi' },
                  ].map(({ label, value, mono }) => (
                    <div key={label} className="flex justify-between items-center py-2.5 border-b border-purple-50 last:border-0">
                      <span className="text-[11px] text-gray-500">{label}</span>
                      <span className={`text-[12px] font-semibold text-purple-900 ${mono ? 'font-mono' : ''}`}>{value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-3 mt-1 border-t-2 border-purple-100">
                    <span className="text-[12px] font-bold text-gray-700">Amount to Pay</span>
                    <div className="text-right">
                      <span className="text-xl font-bold text-purple-900">{formatCurrency(total)}</span>
                      <span className="text-[11px] text-gray-500 ml-1">Birr</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* ── SECTION 3: Upload Screenshot ── */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white border border-purple-200 rounded-2xl overflow-hidden shadow-sm"
              >
                <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-50 to-white border-b border-purple-100">
                  <div className="p-1.5 bg-purple-100 rounded-lg">
                    <Upload className="h-4 w-4 text-purple-900" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-purple-900">Payment Screenshot</h3>
                    <p className="text-[10px] text-gray-500">Upload proof of your transfer</p>
                  </div>
                  <Badge className={`border-0 text-[9px] ${paymentScreenshot.uploaded ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {paymentScreenshot.uploaded ? '✓ Uploaded' : 'Required'}
                  </Badge>
                </div>

                <div className="p-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onFileUpload}
                    className="hidden"
                    ref={fileInputRef}
                  />
                  <AnimatePresence mode="wait">
                    {paymentScreenshot.previewUrl ? (
                      <motion.div
                        key="preview"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="space-y-3"
                      >
                        <div className="relative w-full rounded-xl overflow-hidden border-2 border-purple-200 shadow-md" style={{ height: 200 }}>
                          <img
                            src={paymentScreenshot.previewUrl}
                            alt="Payment screenshot"
                            className="object-contain w-full h-full"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-purple-900/30 to-transparent" />
                          <div className="absolute bottom-2 right-2">
                            <Badge className="bg-green-600 text-white border-0 text-[9px]">
                              <Check className="h-2.5 w-2.5 mr-1" /> Uploaded
                            </Badge>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onRemoveScreenshot}
                          className="w-full rounded-xl border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-400 h-9 text-[11px]"
                          type="button"
                        >
                          <X className="mr-1.5 h-3.5 w-3.5" /> Remove & Re-upload
                        </Button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="upload-prompt"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                      >
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full border-2 border-dashed border-purple-200 rounded-xl p-6 flex flex-col items-center gap-3 hover:border-purple-500 hover:bg-purple-50/50 transition-all active:scale-[0.98]"
                        >
                          <div className="p-4 bg-purple-50 rounded-full">
                            <Upload className="h-8 w-8 text-purple-700" />
                          </div>
                          <div className="text-center">
                            <p className="text-[12px] font-semibold text-purple-900">Tap to upload screenshot</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">JPG, PNG — max 5 MB</p>
                          </div>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* ── SECTION 4: Transaction ID ── */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white border border-purple-200 rounded-2xl overflow-hidden shadow-sm"
              >
                <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-50 to-white border-b border-purple-100">
                  <div className="p-1.5 bg-purple-100 rounded-lg">
                    <Receipt className="h-4 w-4 text-purple-900" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-purple-900">Transaction Reference</h3>
                    <p className="text-[10px] text-gray-500">Speeds up verification</p>
                  </div>
                </div>
                <div className="p-4">
                  <Input
                    placeholder="Enter transaction ID (optional)"
                    value={transactionId}
                    onChange={e => onTransactionIdChange(e.target.value)}
                    className="h-11 text-[12px] rounded-xl border-2 border-purple-200 focus:border-purple-600 focus:ring-2 focus:ring-purple-200"
                  />
                </div>
              </motion.div>

              {/* ── SECTION 5: Order Summary ── */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-white border border-purple-200 rounded-2xl overflow-hidden shadow-sm"
              >
                <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-50 to-white border-b border-purple-100">
                  <div className="p-1.5 bg-purple-100 rounded-lg">
                    <Receipt className="h-4 w-4 text-purple-900" />
                  </div>
                  <h3 className="text-sm font-bold text-purple-900">Order Summary</h3>
                </div>
                <div className="p-4 space-y-0">
                  {[
                    { label: 'Subtotal (before tax)', value: formatCurrency(subtotal) },
                    { label: 'VAT 15%', value: formatCurrency(tax) },
                    ...(orderType === 'delivery' ? [{ label: 'Delivery Fee', value: formatCurrency(deliveryFee) }] : []),
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center py-2.5 border-b border-purple-50 last:border-0">
                      <span className="text-[11px] text-gray-500">{label}</span>
                      <span className="text-[12px] font-semibold text-purple-900">{value} Birr</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-3 mt-1 border-t-2 border-purple-100">
                    <span className="text-[13px] font-bold text-gray-800">Total (incl. tax)</span>
                    <div className="text-right">
                      <span className="text-xl font-bold bg-gradient-to-r from-purple-900 to-purple-700 bg-clip-text text-transparent">
                        {formatCurrency(total)}
                      </span>
                      <span className="text-[11px] text-gray-500 ml-1">Birr</span>
                    </div>
                  </div>
                </div>
              </motion.div>

            </div>
          </div>

          {/* ── Sticky Footer ── */}
          <div className="sticky bottom-0 border-t border-purple-100 bg-white/95 backdrop-blur-md shadow-lg px-4 py-3 space-y-2">
            {/* Screenshot required hint */}
            {!paymentScreenshot.uploaded && (
              <p className="text-[10px] text-center text-red-500 font-medium">
                ⚠ Upload a payment screenshot to continue
              </p>
            )}

            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleConfirm}
                disabled={!canConfirm}
                className="w-full h-12 text-[13px] font-bold bg-gradient-to-r from-purple-800 to-purple-900 hover:from-purple-900 hover:to-purple-950 text-white border-0 rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
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
                    Confirm Payment & Place Order
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
})

PaymentUploadDialog.displayName = 'PaymentUploadDialog'

export default PaymentUploadDialog
