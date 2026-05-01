// models/Restaurant.ts
import mongoose, { Schema, Document } from 'mongoose'

export interface IRestaurant extends Document {
  name: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const RestaurantSchema = new Schema<IRestaurant>(
  {
    name: {
      type: String,
      required: [true, 'Restaurant name is required'],
      unique: true,
      trim: true,
      minlength: [2, 'Restaurant name must be at least 2 characters']
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
)

export default mongoose.models.Restaurant || mongoose.model<IRestaurant>('Restaurant', RestaurantSchema)