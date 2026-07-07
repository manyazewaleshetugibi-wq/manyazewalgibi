"use client"

import { useState } from "react"
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Loader2, ArrowRightLeft } from "lucide-react"
import type { Stock } from "../../app/(admin)/stock/page"

const transferSchema = z.object({
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  receiverName: z.string().min(1, "Receiver name is required").max(200),
  note: z.string().max(500).optional(),
})

type TransferFormValues = z.infer<typeof transferSchema>

interface RegisterTransferModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stock: Stock | null
  onSuccess: () => void
}

export function RegisterTransferModal({
  open,
  onOpenChange,
  stock,
  onSuccess,
}: RegisterTransferModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: { quantity: 0, receiverName: "", note: "" },
  })

  const onSubmit = async (values: TransferFormValues) => {
    if (!stock) return

    if (values.quantity > stock.currentStock) {
      toast.error(`Insufficient stock. Available: ${stock.currentStock} ${stock.unit}`)
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/stock-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockId: stock._id,
          quantity: values.quantity,
          receiverName: values.receiverName,
          note: values.note || "",
          date: new Date().toISOString().split("T")[0],
        }),
      })
      const data = await response.json()
      if (data.success) {
        toast.success(`Transfer of ${values.quantity} ${stock.unit} to ${values.receiverName} registered`)
        form.reset({ quantity: 0, receiverName: "", note: "" })
        onSuccess()
        onOpenChange(false)
      } else {
        toast.error(data.message || "Failed to register transfer")
      }
    } catch {
      toast.error("Failed to register transfer")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!stock) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-blue-500" />
            Register Kitchen Transfer
          </DialogTitle>
          <DialogDescription>
            Transfer stock from <span className="font-semibold">{stock.name}</span> to kitchen
            <br />
            <span className="text-sm text-muted-foreground">
              Available: <span className="font-bold">{stock.currentStock}</span> {stock.unit}
            </span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity ({stock.unit})</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Enter quantity"
                      {...field}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value)
                        field.onChange(isNaN(v) ? 0 : v)
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="receiverName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Receiver Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Kitchen, Chef John..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { form.reset(); onOpenChange(false) }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Register Transfer
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
