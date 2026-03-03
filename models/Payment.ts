import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  email: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'timeout', 'failed'],
    default: 'pending'
  },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  // Additional fields you might need:
  transactionId: { type: String },
  customerName: { type: String },
  phoneNumber: { type: String },
  // ... other fields
});

export default mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);