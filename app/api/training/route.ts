import { NextResponse } from "next/server";
import { Training } from "@/models/Training";
import clientPromise from "@/lib/mongodb";
import { uploadFileToS3 } from "@/lib/s3tr";
import { ObjectId } from "mongodb";

export async function POST(request: Request) {
  const formData = await request.formData();
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const type = formData.get("type") as "audio" | "pdf" | "video" | "text";
  const file = formData.get("file") as File;

  if (!title || !description || !type || !file) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    // Create a new training record with "pending" status
    const trainingDoc = { title, description, type, uploadStatus: "pending", uploadProgress: 0 };
    const result = await db.collection("trainings").insertOne(trainingDoc);
    const training = { ...trainingDoc, _id: result.insertedId };

    // Upload file to S3 with progress tracking
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileUrl = await uploadFileToS3(buffer, file.name, file.type, (progress) => {
      // Update progress in the database
      db.collection("trainings").updateOne(
        { _id: training._id },
        { $set: { uploadStatus: "uploading", uploadProgress: progress } }
      );
    });

    // Update training record with file URL and completed status
    await db.collection("trainings").updateOne(
      { _id: training._id }, // Remove ObjectId conversion since training._id is already an ObjectId
      { $set: { fileUrl, uploadStatus: "completed", uploadProgress: 100 } }
    );

    return NextResponse.json({ message: "Training created successfully", training }, { status: 201 });
  } catch (error) {
    console.error("Error creating training:", error);
    return NextResponse.json({ error: "Failed to create training" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const trainings = await db.collection("trainings").find().toArray();
    return NextResponse.json(trainings, { status: 200 });
  } catch (error) {
    console.error("Error fetching trainings:", error);
    return NextResponse.json({ error: "Failed to fetch trainings" }, { status: 500 });
  }
}