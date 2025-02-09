import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";  // Import ObjectId
import clientPromise from "@/lib/mongodb";
import { uploadFileToS3 } from "@/lib/s3tr";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise;
    const db = client.db();

    const training = await db.collection("trainings").findOne({ _id: new ObjectId(params.id) });

    if (!training) {
      return NextResponse.json({ error: "Training not found" }, { status: 404 });
    }

    return NextResponse.json(training, { status: 200 });
  } catch (error) {
    console.error("Error fetching training:", error);
    return NextResponse.json({ error: "Failed to fetch training" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const formData = await request.formData();
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const type = formData.get("type") as "audio" | "pdf" | "video" | "text";
    const file = formData.get("file") as File;

    if (!title || !description || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    let fileUrl: string | undefined;
    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      fileUrl = await uploadFileToS3(buffer, file.name, file.type);
    }

    const updateData = { title, description, type, ...(fileUrl && { fileUrl }) };
    await db.collection("trainings").updateOne(
      { _id: new ObjectId(params.id) }, // Convert id to ObjectId
      { $set: updateData }
    );

    return NextResponse.json({ message: "Training updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error updating training:", error);
    return NextResponse.json({ error: "Failed to update training" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const client = await clientPromise;
    const db = client.db();
    await db.collection("trainings").deleteOne({ _id: new ObjectId(params.id) }); // Convert id to ObjectId

    return NextResponse.json({ message: "Training deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting training:", error);
    return NextResponse.json({ error: "Failed to delete training" }, { status: 500 });
  }
}
