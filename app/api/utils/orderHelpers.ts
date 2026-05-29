import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { getToken } from "next-auth/jwt";

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
  const status = String(order.status).toLowerCase();
  return status === "completed";
}

export function normalizeStatus(status: string): string {
  return status?.toLowerCase() || "pending";
}

export async function getCurrentUserData(req: NextRequest) {
  try {
    const token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET 
    });
    
    if (!token) {
      debugLog("No authentication token found");
      return null;
    }
    
    debugLog("Token data received:", {
      id: token.sub || token.id,
      name: token.name,
      email: token.email,
      role: token.role,
      employeeId: token.employeeId,
      hasSub: !!token.sub,
      hasId: !!token.id,
      allTokenFields: Object.keys(token)
    });
    
    return {
      ...token,
      id: token.sub || token.id || "unknown",
      name: token.name || "Unknown User",
      email: token.email || "unknown@example.com",
      role: token.role || "employee",
      employeeId: token.employeeId || null
    };
  } catch (error) {
    debugError("Error getting user data from token:", error);
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
