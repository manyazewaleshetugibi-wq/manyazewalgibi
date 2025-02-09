import { clsx, type ClassValue } from "clsx"
import { NextResponse } from "next/server";
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const createResponse = (status: number, success: boolean, message: string, data: any = null) => {
  return NextResponse.json({ success, message, data }, { status });
};

