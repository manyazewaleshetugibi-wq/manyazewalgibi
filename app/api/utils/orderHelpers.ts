import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { auth } from "@/auth";

export const DEBUG = true;

export function debugLog(message: string, data?: any) {
  if (DEBUG) {
    console.log(`[DEBUG] ${message}`, data ? data : '');
  }
}

export function debugError(message: string, error: any) {
  console.error(`[ERROR] ${message}`, error);
}

export function isOrderCompleted(order: any): boolean {
  if (!order || !order.status) return false;
  const status = String(order.status).toUpperCase();
  return status === "COMPLETED";
}

export function normalizeStatus(status: string): string {
  return status?.toUpperCase() || "PENDING";
}

export async function getCurrentUserData(req?: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      debugLog("No session found");
      return null;
    }

    const user = session.user as any;
    
    debugLog("Session data received:", {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
    });
    
    return {
      id: user.id || "unknown",
      name: user.name || "Unknown User",
      email: user.email || "unknown@example.com",
      role: user.role || "employee",
      employeeId: user.employeeId || null,
    };
  } catch (error) {
    debugError("Error getting user data from session:", error);
    return null;
  }
}

export async function uploadToCloudinary(file: File): Promise<string> {
  const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dnqsoezfo';
  const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'photoupload';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    debugError("Cloudinary upload failed", { status: response.status, body: errorBody });
    throw new Error('Failed to upload payment screenshot');
  }

  const data = await response.json();
  return data.secure_url;
}
