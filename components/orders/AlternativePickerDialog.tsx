// components/orders/AlternativePickerDialog.tsx
"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Package, Check, Plus, Minus } from "lucide-react"

export type AlternativeOption = {
  stockId: string
  stockName: string
  quantity: number
  isDefault?: boolean
  unit?: string
}

export type IngredientChoice = {
  defaultStockId: string
  defaultStockName: string
  defaultQuantity: number
  defaultUnit?: string
  options: AlternativeOption[]
}

// What gets returned per ingredient: array of chosen options (multi-select)
export type IngredientSelections = {
  defaultStockId: string
  chosen: AlternativeOption[]  // can be 1 or more
}

interface AlternativePickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemName: string
  ingredients: IngredientChoice[]
  onConfirm: (selections: IngredientSelections[]) => void
}

export function AlternativePickerDialog({
  open,
  onOpenChange,
  itemName,
  ingredients,
  onConfirm,
}: AlternativePickerDialogProps) {
  // Per ingredient: map of option-index -> quantity
  const [selections, setSelections] = useState<Record<string, Record<number, number>>>({})

  useEffect(() => {
    if (open) {
      const defaults: Record<string, Record<number, number>> = {}
      ingredients.forEach((ing) => {
        defaults[ing.defaultStockId] = { 0: ing.defaultQuantity }
      })
      setSelections(defaults)
    }
  }, [open, ingredients])

  const toggleOption = (defaultStockId: string, optionIndex: number, defaultQty: number) => {
    setSelections((prev) => {
      const current = { ...prev[defaultStockId] }
      if (current[optionIndex]) {
        delete current[optionIndex]
      } else {
        current[optionIndex] = defaultQty || 1
      }
      return { ...prev, [defaultStockId]: current }
    })
  }

  const updateQty = (defaultStockId: string, optionIndex: number, delta: number) => {
    setSelections((prev) => {
      const current = { ...prev[defaultStockId] }
      const next = (current[optionIndex] || 0) + delta
      if (next <= 0) {
        delete current[optionIndex]
      } else {
        current[optionIndex] = next
      }
      return { ...prev, [defaultStockId]: current }
    })
  }

  const handleConfirm = () => {
    const result: IngredientSelections[] = ingredients.map((ing) => {
      const allOptions: AlternativeOption[] = [
        { stockId: ing.defaultStockId, stockName: ing.defaultStockName, quantity: ing.defaultQuantity, isDefault: true, unit: ing.defaultUnit },
        ...ing.options,
      ]
      const chosen = Object.entries(selections[ing.defaultStockId] || {}).map(([idxStr, qty]) => {
        const idx = parseInt(idxStr)
        const opt = allOptions[idx]
        return opt ? { ...opt, quantity: qty } : { stockId: '', stockName: '', quantity: qty }
      }).filter(c => c.stockId)
      return { defaultStockId: ing.defaultStockId, chosen }
    })
    onConfirm(result)
    onOpenChange(false)
  }

  const totalSelected = ingredients.reduce((sum, ing) => {
    return sum + Object.keys(selections[ing.defaultStockId] || {}).length
  }, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-500" />
            Choose Ingredients for {itemName}
          </DialogTitle>
          <p className="text-xs text-gray-500 mt-1">
            Select one or more alternatives per ingredient. Adjust quantities as needed.
          </p>
        </DialogHeader>

        <div className="space-y-5 py-2 max-h-[60vh] overflow-y-auto pr-1">
          {ingredients.map((ing) => {
            const ingSelections = selections[ing.defaultStockId] || {}
            const allOptions: AlternativeOption[] = [
              { stockId: ing.defaultStockId, stockName: ing.defaultStockName, quantity: ing.defaultQuantity, isDefault: true, unit: ing.defaultUnit },
              ...ing.options,
            ]

            return (
              <div key={ing.defaultStockId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">{ing.defaultStockName}</p>
                  <span className="text-xs text-gray-400">
                    {Object.keys(ingSelections).length} selected
                  </span>
                </div>
                <div className="space-y-1.5">
                  {allOptions.map((opt, optIdx) => {
                    const isSelected = !!ingSelections[optIdx]
                    const qty = ingSelections[optIdx] || 0
                    const displayName = opt.unit
                      ? `${opt.stockName} (${opt.unit})`
                      : opt.stockName
                    return (
                      <div
                        key={`${opt.stockId}-${optIdx}`}
                        className={`flex items-center justify-between w-full px-3 py-2 rounded-lg border text-sm transition-all ${
                          isSelected
                            ? "border-green-500 bg-green-50"
                            : "border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50"
                        }`}
                      >
                        <button
                          type="button"
                          className="flex items-center gap-2 flex-1 text-left"
                          onClick={() => toggleOption(ing.defaultStockId, optIdx, opt.quantity)}
                        >
                          <span className={`h-4 w-4 rounded border flex items-center justify-center flex-shrink-0 ${
                            isSelected ? "bg-green-500 border-green-500" : "border-gray-300"
                          }`}>
                            {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                          </span>
                          <span className={isSelected ? "text-green-800 font-medium" : "text-gray-700"}>
                            {displayName}
                          </span>
                          {opt.isDefault && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 border-gray-300 text-gray-500">
                              default
                            </Badge>
                          )}
                        </button>

                        {isSelected ? (
                          <div className="flex items-center gap-1 ml-2">
                            <button
                              type="button"
                              onClick={() => updateQty(ing.defaultStockId, optIdx, -0.5)}
                              className="h-6 w-6 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <Input
                              type="number"
                              min="0.1"
                              step="0.1"
                              value={qty}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value)
                                if (!isNaN(v) && v > 0) {
                                  setSelections((prev) => ({
                                    ...prev,
                                    [ing.defaultStockId]: { ...prev[ing.defaultStockId], [optIdx]: v },
                                  }))
                                }
                              }}
                              className="h-6 w-14 text-center text-xs px-1"
                            />
                            <button
                              type="button"
                              onClick={() => updateQty(ing.defaultStockId, optIdx, 0.5)}
                              className="h-6 w-6 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 ml-2">qty: {opt.quantity}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={totalSelected === 0}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Check className="h-4 w-4 mr-1" />
            Confirm & Add to Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
