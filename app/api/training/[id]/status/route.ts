import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise;
    const db = client.db();
    const training = await db.collection("trainings").findOne({ _id: params.id });

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