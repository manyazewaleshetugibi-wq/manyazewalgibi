'use client'

import React, { memo, useRef, useState, useCallback } from 'react'
import {
  CreditCard, Upload, X, Check, Loader2, Banknote, Receipt,
  ArrowLeft, User, Phone, Mail, UserPlus, Copy, CheckCircle2,
  ShieldCheck, CircleDot
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { PaymentScreenshot } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'

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

  const [guestInfo, setGuestInfo] = useState<GuestUserData>(
    guestData ?? { firstName: '', lastName: '', phone: '', email: '', isGuest: true }
  )
  const [guestErrors, setGuestErrors] = useState<Partial<Record<keyof GuestUserData, string>>>({})
  const [copiedField, setCopiedField] = useState<string | null>(null)

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

  const copyToClipboard = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      toast.success('Copied!', { duration: 1500 })
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }, [])

  const steps = !isUserLoggedIn
    ? ['Bank Transfer', 'Upload Proof', 'Confirm']
    : ['Bank Transfer', 'Upload Proof', 'Confirm']

  const currentStep = paymentScreenshot.uploaded ? 2 : 1
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
          transition={{ type: 'tween', duration: 0.3 }}
          className="fixed inset-0 z-50 flex flex-col bg-gray-50"
          style={{ overscrollBehavior: 'contain' }}
        >
          {/* ── Header ── */}
          <div className="bg-white border-b border-gray-100">
            <div className="flex items-center gap-3 px-4 py-3">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => onOpenChange(false)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-700 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </motion.button>
              <div className="flex-1">
                <h2 className="font-bold text-base text-gray-900">Payment</h2>
                <p className="text-[11px] text-gray-500">
                  Transfer {formatCurrency(total)} Birr and upload proof
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">{formatCurrency(total)}</p>
                <p className="text-[10px] text-gray-500">Birr</p>
              </div>
            </div>

            {/* Step indicators */}
            <div className="px-4 pb-3">
              <div className="flex items-center gap-0">
                {steps.map((step, i) => {
                  const stepNum = i + 1
                  const isActive = stepNum === currentStep
                  const isDone = stepNum < currentStep || (stepNum === 2 && paymentScreenshot.uploaded)
                  return (
                    <React.Fragment key={step}>
                      <div className="flex items-center gap-1.5 flex-1">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 transition-colors ${
                          isDone ? 'bg-green-500 text-white' : isActive ? 'bg-purple-900 text-white' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {isDone ? <Check className="h-3 w-3" /> : stepNum}
                        </div>
                        <span className={`text-[10px] font-medium hidden sm:block ${
                          isActive ? 'text-purple-900' : isDone ? 'text-green-600' : 'text-gray-400'
                        }`}>{step}</span>
                      </div>
                      {i < steps.length - 1 && (
                        <div className={`h-[2px] flex-1 mx-1 rounded-full transition-colors ${
                          isDone ? 'bg-green-400' : 'bg-gray-200'
                        }`} />
                      )}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── Scrollable Body ── */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4 pb-32 max-w-lg mx-auto">

              {/* Guest Info */}
              {!isUserLoggedIn && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
                >
                  <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100">
                    <div className="p-1.5 bg-gray-100 rounded-lg">
                      <UserPlus className="h-4 w-4 text-gray-700" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-900">Your Details</h3>
                      <p className="text-[10px] text-gray-500">Required for delivery</p>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium text-gray-600">First Name *</Label>
                        <Input
                          value={guestInfo.firstName}
                          onChange={e => {
                            setGuestInfo(p => ({ ...p, firstName: e.target.value }))
                            if (guestErrors.firstName) setGuestErrors(p => ({ ...p, firstName: undefined }))
                          }}
                          placeholder="John"
                          className={`h-10 text-[13px] rounded-lg ${guestErrors.firstName ? 'border-red-400 focus:border-red-500' : ''}`}
                        />
                        {guestErrors.firstName && <p className="text-[10px] text-red-500">{guestErrors.firstName}</p>}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] font-medium text-gray-600">Last Name *</Label>
                        <Input
                          value={guestInfo.lastName}
                          onChange={e => {
                            setGuestInfo(p => ({ ...p, lastName: e.target.value }))
                            if (guestErrors.lastName) setGuestErrors(p => ({ ...p, lastName: undefined }))
                          }}
                          placeholder="Doe"
                          className={`h-10 text-[13px] rounded-lg ${guestErrors.lastName ? 'border-red-400 focus:border-red-500' : ''}`}
                        />
                        {guestErrors.lastName && <p className="text-[10px] text-red-500">{guestErrors.lastName}</p>}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
                        <Phone className="h-3 w-3" /> Phone *
                      </Label>
                      <Input
                        value={guestInfo.phone}
                        onChange={e => {
                          setGuestInfo(p => ({ ...p, phone: e.target.value }))
                          if (guestErrors.phone) setGuestErrors(p => ({ ...p, phone: undefined }))
                        }}
                        placeholder="0912345678"
                        className={`h-10 text-[13px] rounded-lg ${guestErrors.phone ? 'border-red-400 focus:border-red-500' : ''}`}
                      />
                      {guestErrors.phone && <p className="text-[10px] text-red-500">{guestErrors.phone}</p>}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium text-gray-600 flex items-center gap-1">
                        <Mail className="h-3 w-3" /> Email <span className="text-gray-400 font-normal">(optional)</span>
                      </Label>
                      <Input
                        value={guestInfo.email}
                        onChange={e => {
                          setGuestInfo(p => ({ ...p, email: e.target.value }))
                          if (guestErrors.email) setGuestErrors(p => ({ ...p, email: undefined }))
                        }}
                        placeholder="john@example.com"
                        className={`h-10 text-[13px] rounded-lg ${guestErrors.email ? 'border-red-400 focus:border-red-500' : ''}`}
                      />
                      {guestErrors.email && <p className="text-[10px] text-red-500">{guestErrors.email}</p>}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Bank Transfer Details */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
              >
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100">
                  <div className="p-1.5 bg-blue-50 rounded-lg">
                    <Banknote className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">Transfer To</h3>
                    <p className="text-[10px] text-gray-500">Send the exact amount</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] border-blue-200 text-blue-700 bg-blue-50">
                    Step 1
                  </Badge>
                </div>

                <div className="p-4">
                  {/* Amount highlight */}
                  <div className="mb-4 p-4 bg-gradient-to-br from-purple-900 to-purple-800 rounded-xl text-center shadow-md">
                    <p className="text-[10px] text-purple-200 uppercase tracking-wider mb-1">Amount to Pay</p>
                    <p className="text-3xl font-bold text-white">{formatCurrency(total)}</p>
                    <p className="text-[11px] text-purple-300">Birr</p>
                  </div>

                  {/* Account details */}
                  <div className="space-y-0 bg-gray-50 rounded-xl overflow-hidden">
                    {[
                      { label: 'Bank', value: 'Commercial Bank of Ethiopia' },
                      { label: 'Account No.', value: '1000000000000', mono: true, copyable: true },
                      { label: 'Account Name', value: 'Manyazewal Eshetu Gibi' },
                    ].map(({ label, value, mono, copyable }) => (
                      <div key={label} className="flex justify-between items-center px-4 py-3 border-b border-gray-100 last:border-0">
                        <span className="text-[12px] text-gray-500">{label}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[13px] font-semibold text-gray-900 ${mono ? 'font-mono tracking-wide' : ''}`}>
                            {value}
                          </span>
                          {copyable && (
                            <motion.button
                              whileTap={{ scale: 0.85 }}
                              onClick={() => copyToClipboard(value, 'account')}
                              className="p-1 rounded-md hover:bg-gray-200 transition-colors"
                            >
                              {copiedField === 'account' ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4 text-gray-400" />
                              )}
                            </motion.button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 mt-3 text-[10px] text-gray-500">
                    <ShieldCheck className="h-3.5 w-3.5 text-gray-400" />
                    <span>Payment is verified within 5 minutes</span>
                  </div>
                </div>
              </motion.div>

              {/* Upload Screenshot */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
              >
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100">
                  <div className="p-1.5 bg-amber-50 rounded-lg">
                    <Upload className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">Upload Proof</h3>
                    <p className="text-[10px] text-gray-500">Screenshot of your transfer</p>
                  </div>
                  <Badge variant="outline" className={`text-[9px] ${
                    paymentScreenshot.uploaded
                      ? 'border-green-200 text-green-700 bg-green-50'
                      : 'border-amber-200 text-amber-700 bg-amber-50'
                  }`}>
                    {paymentScreenshot.uploaded ? 'Uploaded' : 'Required'}
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
                        <div className="relative w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: 220 }}>
                          <img
                            src={paymentScreenshot.previewUrl}
                            alt="Payment screenshot"
                            className="object-contain w-full h-full bg-gray-50"
                          />
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-green-600 text-white border-0 text-[10px] shadow-sm">
                              <Check className="h-2.5 w-2.5 mr-1" /> Uploaded
                            </Badge>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={onRemoveScreenshot}
                          className="w-full py-2.5 text-[12px] font-medium text-red-600 bg-red-50 rounded-xl border border-red-100 hover:bg-red-100 transition-colors"
                        >
                          Remove & Upload New
                        </button>
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
                          className="w-full border-2 border-dashed border-purple-200 rounded-xl py-8 flex flex-col items-center gap-3 hover:border-purple-400 hover:bg-purple-50/30 transition-all active:scale-[0.98]"
                        >
                          <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center">
                            <Upload className="h-6 w-6 text-purple-600" />
                          </div>
                          <div className="text-center">
                            <p className="text-[13px] font-semibold text-gray-900">Tap to upload screenshot</p>
                            <p className="text-[11px] text-gray-500 mt-0.5">JPG, PNG or HEIC</p>
                          </div>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Transaction ID */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
              >
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100">
                  <div className="p-1.5 bg-gray-100 rounded-lg">
                    <Receipt className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">Transaction ID</h3>
                    <p className="text-[10px] text-gray-500">Optional — helps us find your payment faster</p>
                  </div>
                </div>
                <div className="p-4">
                  <Input
                    placeholder="e.g. TXN123456789"
                    value={transactionId}
                    onChange={e => onTransactionIdChange(e.target.value)}
                    className="h-11 text-[13px] rounded-lg"
                  />
                </div>
              </motion.div>

              {/* Order Summary */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
              >
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100">
                  <div className="p-1.5 bg-gray-100 rounded-lg">
                    <Receipt className="h-4 w-4 text-gray-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">Order Summary</h3>
                </div>
                <div className="p-4">
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[12px] text-gray-500">Subtotal</span>
                      <span className="text-[12px] font-medium text-gray-900">{formatCurrency(subtotal)} Birr</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[12px] text-gray-500">VAT 15%</span>
                      <span className="text-[12px] font-medium text-gray-900">{formatCurrency(tax)} Birr</span>
                    </div>
                    {orderType === 'delivery' && deliveryFee > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-[12px] text-gray-500">Delivery Fee</span>
                        <span className="text-[12px] font-medium text-gray-900">{formatCurrency(deliveryFee)} Birr</span>
                      </div>
                    )}
                    <div className="border-t border-gray-100 pt-2.5 mt-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[13px] font-bold text-gray-900">Total</span>
                        <span className="text-lg font-bold text-gray-900">{formatCurrency(total)} Birr</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

            </div>
          </div>

          {/* ── Sticky Footer ── */}
          <div className="sticky bottom-0 border-t border-gray-200 bg-white px-4 py-3 space-y-2">
            {!paymentScreenshot.uploaded && (
              <p className="text-[11px] text-center text-amber-600 font-medium flex items-center justify-center gap-1">
                <CircleDot className="h-3 w-3" />
                Upload your payment screenshot to continue
              </p>
            )}

            <motion.div whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleConfirm}
                disabled={!canConfirm}
                className={`w-full h-12 text-[13px] font-bold rounded-xl shadow-sm transition-all ${
                  canConfirm
                    ? 'bg-purple-900 hover:bg-purple-800 text-white shadow-md'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
                type="button"
              >
                {isPlacingOrder ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Placing Order...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Confirm & Place Order
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
