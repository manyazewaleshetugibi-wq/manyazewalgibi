import mongoose from 'mongoose';

const SubscriptionSchema = new mongoose.Schema({
  userId: { type: String, required: false }, // Optional: link to a logged-in user
  subscription: {
    endpoint: { type: String, required: true, unique: true },
    expirationTime: { type: Number, default: null },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
  },
}, { timestamps: true });

export default mongoose.models.Subscription || mongoose.model('Subscription', SubscriptionSchema);