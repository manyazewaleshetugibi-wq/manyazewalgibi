import mongoose, { Schema, Document } from "mongoose"

export interface IStockTransfer extends Document {
  stockId: mongoose.Types.ObjectId
  quantity: number
  receiverName: string
  note: string
  date: string
  createdAt: Date
  updatedAt: Date
}

const StockTransferSchema = new Schema<IStockTransfer>(
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
    receiverName: {
      type: String,
      required: [true, "Receiver name is required"],
      maxlength: [200, "Receiver name cannot exceed 200 characters"],
    },
    note: {
      type: String,
      default: "",
      maxlength: [500, "Note cannot exceed 500 characters"],
    },
    date: {
      type: String,
      required: [true, "Date is required"],
    },
  },
  { timestamps: true }
)

StockTransferSchema.index({ stockId: 1, date: -1 })
StockTransferSchema.index({ date: 1 })

const StockTransfer =
  mongoose.models.StockTransfer ||
  mongoose.model<IStockTransfer>("StockTransfer", StockTransferSchema)

export default StockTransfer
