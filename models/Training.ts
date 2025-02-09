import { Schema, model, Document } from "mongoose";

export interface ITraining extends Document {
  title: string;
  description: string;
  type: "audio" | "pdf" | "video" | "text";
  fileUrl: string;
  uploadStatus: "pending" | "uploading" | "completed" | "failed";
  uploadProgress: number;
  createdAt: Date;
  updatedAt: Date;
}

const TrainingSchema = new Schema<ITraining>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: { type: String, required: true, enum: ["audio", "pdf", "video", "text"] },
    fileUrl: { type: String, required: true },
    uploadStatus: { type: String, default: "pending", enum: ["pending", "uploading", "completed", "failed"] },
    uploadProgress: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Training = model<ITraining>("Training", TrainingSchema);