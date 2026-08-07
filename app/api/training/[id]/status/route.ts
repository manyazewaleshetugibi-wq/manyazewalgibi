import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const training = await prisma.training.findUnique({ where: { id } });

    if (!training) {
      return NextResponse.json({ error: "Training not found" }, { status: 404 });
    }

    return NextResponse.json(
      { uploadStatus: training.uploadStatus, uploadProgress: training.uploadProgress },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching upload status:", error);
    return NextResponse.json({ error: "Failed to fetch upload status" }, { status: 500 });
  }
}
