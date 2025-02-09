import mongoose, { Schema, Document } from "mongoose";

const predefinedPlatforms = ["Twitter", "Facebook", "Instagram", "Telegram", "Blog", "TikTok"] as const;
const postTypes = ["text", "image", "video"] as const;
const postStatuses = ["Pending", "Posted", "Failed"] as const;

interface IContent extends Document {
  platformName: typeof predefinedPlatforms[number];
  content: string;
  postType: typeof postTypes[number];
  scheduleTime: Date;
  status: typeof postStatuses[number];
  retryCount: number;
  contentValidation: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IContent>(
  {
    platformName: { type: String, enum: predefinedPlatforms, required: true },
    content: { type: String, required: true },
    postType: { type: String, enum: postTypes, default: "video" },
    scheduleTime: { type: Date, required: true },
    status: { type: String, enum: postStatuses, default: "Pending" },
    retryCount: { type: Number, default: 0 },
    contentValidation: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Content || mongoose.model<IContent>("Content", postSchema);
