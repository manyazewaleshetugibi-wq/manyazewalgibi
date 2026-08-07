"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "react-hot-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Loader2, AlertTriangle } from "lucide-react"
import type { Stock } from "../../app/(admin)/stock/page"

// Simple schema without date transformation issues
const wastageSchema = z.object({
  quantity: z.number()
    .min(0.01, "Quantity must be greater than 0")
    .positive("Quantity must be positive"),
  reason: z.string()
    .min(1, "Reason is required")
    .max(500, "Reason must be less than 500 characters"),
})

type WastageFormValues = z.infer<typeof wastageSchema>

interface RegisterWastageModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stock: Stock | null
  onSuccess: () => void
}

export function RegisterWastageModal({
  open,
  onOpenChange,
  stock,
  onSuccess,
}: RegisterWastageModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Debug log
  useEffect(() => {
  }, [open, stock])

  const form = useForm<WastageFormValues>({
    resolver: zodResolver(wastageSchema),
    defaultValues: {
      quantity: 0,
      reason: "",
    },
  })

  const onSubmit = async (values: WastageFormValues) => {
    
    if (!stock) {
      console.error("No stock selected")
      toast.error("No stock selected")
      return
    }

    if (values.quantity > stock.currentStock) {
      toast.error(`Insufficient stock. Available: ${stock.currentStock} ${stock.unit}`)
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        stockId: stock._id,
        quantity: values.quantity,
        reason: values.reason,
        date: new Date().toISOString().split("T")[0],
      }
      

      const response = await fetch("/api/stock-wastage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`Wastage of ${values.quantity} ${stock.unit} registered successfully`)
        form.reset({
          quantity: 0,
          reason: "",
        })
        onSuccess()
        onOpenChange(false)
      } else {
        toast.error(data.message || "Failed to register wastage")
      }
    } catch (error) {
      console.error("Error registering wastage:", error)
      toast.error("Failed to register wastage")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!stock) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Register Wastage
          </DialogTitle>
          <DialogDescription>
            Record wastage for <span className="font-semibold">{stock.name}</span>
            <br />
            <span className="text-sm text-muted-foreground">
              Current Stock: <span className="font-bold">{stock.currentStock}</span> {stock.unit}
            </span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Wastage Quantity ({stock.unit})</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Enter quantity"
                      {...field}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value)
                        field.onChange(isNaN(value) ? 0 : value)
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter the quantity of {stock.unit} that was wasted
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Wastage</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Expired, Damaged, Broken, Quality issue..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide a detailed reason for the wastage
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset()
                  onOpenChange(false)
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Register Wastage
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}