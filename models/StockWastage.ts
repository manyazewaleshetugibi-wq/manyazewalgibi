import mongoose, { Schema, Document } from "mongoose"

export interface IStockWastage extends Document {
  stockId: mongoose.Types.ObjectId
  quantity: number
  reason: string
  date: string
  createdAt: Date
  updatedAt: Date
}

const StockWastageSchema = new Schema<IStockWastage>(
  {
    stockId: {
      type: Schema.Types.ObjectId,
      ref: "Stock",
      required: [true, "Stock ID is required"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0.01, "Quantity must be greater than 0"],
    },
    reason: {
      type: String,
      required: [true, "Reason is required"],
      maxlength: [500, "Reason cannot exceed 500 characters"],
    },
    date: {
      type: String,
      required: [true, "Date is required"],
    },
  },
  {
    timestamps: true,
  }
)

// Index for faster queries
StockWastageSchema.index({ stockId: 1, date: -1 })
StockWastageSchema.index({ date: 1 })

const StockWastage = mongoose.models.StockWastage || mongoose.model<IStockWastage>("StockWastage", StockWastageSchema)

export default StockWastage