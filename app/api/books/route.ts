import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { validateBookData } from "@/models/Book";
import { ObjectId } from "mongodb";

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dnqsoezfo';
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'photoupload';
const CLOUDINARY_IMAGE_FOLDER = process.env.NEXT_PUBLIC_CLOUDINARY_IMAGE_FOLDER || 'items';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

async function uploadToCloudinary(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{
  url: string;
  publicId: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
}> {
  let interval: NodeJS.Timeout | null = null;

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'books');

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const publicId = `books/${timestamp}_${randomString}_${safeFileName.replace(/\.[^/.]+$/, "")}`;
    formData.append('public_id', publicId);
    formData.append('tags', 'book');
    formData.append('context', `type=book_image|filename=${file.name}|uploaded_at=${timestamp}`);

    if (onProgress) {
      let progress = 0;
      interval = setInterval(() => {
        progress += 20;
        if (progress > 90) progress = 90;
        onProgress(progress);
      }, 100);
    }

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    );

    if (interval) clearInterval(interval);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cloudinary response error:', errorText);
      throw new Error(`Cloudinary upload failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    if (onProgress) onProgress(100);

    return {
      url: data.secure_url,
      publicId: data.public_id,
      format: data.format,
      bytes: data.bytes,
      width: data.width,
      height: data.height,
    };
  } catch (error: any) {
    if (interval) clearInterval(interval);
    console.error('Cloudinary upload error:', error);
    throw new Error(`Failed to upload to Cloudinary: ${error.message}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const title = formData.get("title") as string;
    const price = parseFloat(formData.get("price") as string);
    const category = formData.get("category") as string;
    const quantity = parseInt(formData.get("quantity") as string) || 0;
    const imageFile = formData.get("image") as File | null;

    if (!title || !category) {
      return NextResponse.json(
        { success: false, message: "Title and category are required" },
        { status: 400 }
      );
    }

    if (isNaN(price) || price < 0) {
      return NextResponse.json(
        { success: false, message: "Valid price is required" },
        { status: 400 }
      );
    }

    let imageUrl = "";
    let cloudinaryData: any = null;

    if (imageFile && imageFile.size > 0) {
      if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
        return NextResponse.json(
          { success: false, message: `Invalid image type. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}` },
          { status: 400 }
        );
      }
      if (imageFile.size > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { success: false, message: `Image too large. Max: ${MAX_IMAGE_SIZE / (1024 * 1024)}MB` },
          { status: 400 }
        );
      }

      try {
        cloudinaryData = await uploadToCloudinary(imageFile);
        imageUrl = cloudinaryData.url;
      } catch (uploadError: any) {
        return NextResponse.json(
          { success: false, message: uploadError.message || "Failed to upload image" },
          { status: 500 }
        );
      }
    }

    const bookData = {
      title,
      price,
      category,
      quantity,
      imageUrl,
      cloudinaryData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const validatedData = validateBookData(bookData);

    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    const result = await db.collection("books").insertOne({
      ...validatedData,
      imageUrl,
      cloudinaryData,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const createdBook = await db.collection("books").findOne({ _id: result.insertedId });

    return NextResponse.json(
      { success: true, message: "Book created successfully", data: createdBook },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating book:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("gold");
    const books = await db.collection("books").find({}).sort({ createdAt: -1 }).toArray();

    const formattedBooks = books.map(book => ({
      _id: book._id.toString(),
      title: book.title || "",
      price: book.price || 0,
      category: book.category || "",
      quantity: book.quantity || 0,
      imageUrl: book.imageUrl || "",
      cloudinaryData: book.cloudinaryData || null,
      createdAt: book.createdAt,
      updatedAt: book.updatedAt,
    }));

    return NextResponse.json({ success: true, books: formattedBooks }, { status: 200 });
  } catch (error) {
    console.error("GET /books Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const formData = await req.formData();
    const id = formData.get("_id") as string;

    if (!id) {
      return NextResponse.json({ success: false, message: "Book ID is required" }, { status: 400 });
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid book ID" }, { status: 400 });
    }

    const title = formData.get("title") as string;
    const price = formData.get("price") as string;
    const category = formData.get("category") as string;
    const quantityStr = formData.get("quantity") as string;
    const imageFile = formData.get("image") as File | null;
    const removeImage = formData.get("removeImage") === "true";

    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    const existingBook = await db.collection("books").findOne({ _id: new ObjectId(id) });
    if (!existingBook) {
      return NextResponse.json({ success: false, message: "Book not found" }, { status: 404 });
    }

    let imageUrl = existingBook.imageUrl;
    let cloudinaryData = existingBook.cloudinaryData;

    if (removeImage) {
      imageUrl = "";
      cloudinaryData = null;
    }

    if (imageFile && imageFile.size > 0) {
      if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
        return NextResponse.json(
          { success: false, message: `Invalid image type. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}` },
          { status: 400 }
        );
      }
      if (imageFile.size > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { success: false, message: `Image too large. Max: ${MAX_IMAGE_SIZE / (1024 * 1024)}MB` },
          { status: 400 }
        );
      }

      try {
        cloudinaryData = await uploadToCloudinary(imageFile);
        imageUrl = cloudinaryData.url;
      } catch (uploadError: any) {
        return NextResponse.json(
          { success: false, message: uploadError.message || "Failed to upload image" },
          { status: 500 }
        );
      }
    }

    const dataToSave: any = {
      title: title !== undefined ? title : existingBook.title,
      price: price !== undefined ? parseFloat(price) : existingBook.price,
      category: category !== undefined ? category : existingBook.category,
      quantity: quantityStr !== undefined ? parseInt(quantityStr) : existingBook.quantity,
      imageUrl,
      cloudinaryData,
      updatedAt: new Date(),
    };

    const result = await db.collection("books").updateOne(
      { _id: new ObjectId(id) },
      { $set: dataToSave }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, message: "Book not found" }, { status: 404 });
    }

    const updatedBook = await db.collection("books").findOne({ _id: new ObjectId(id) });

    return NextResponse.json(
      { success: true, message: "Book updated successfully", data: updatedBook },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating book:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = body.id;

    if (!id) {
      return NextResponse.json({ success: false, message: "Book ID is required" }, { status: 400 });
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid book ID" }, { status: 400 });
    }

    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    const result = await db.collection("books").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, message: "Book not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Book deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting book:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PATCH - Decrease quantity when a book is sold
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, quantity } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "Book ID is required" }, { status: 400 });
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid book ID" }, { status: 400 });
    }

    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    const existingBook = await db.collection("books").findOne({ _id: new ObjectId(id) });
    if (!existingBook) {
      return NextResponse.json({ success: false, message: "Book not found" }, { status: 404 });
    }

    const newQuantity = existingBook.quantity - (quantity || 1);
    if (newQuantity < 0) {
      return NextResponse.json(
        { success: false, message: "Insufficient stock" },
        { status: 400 }
      );
    }

    const result = await db.collection("books").updateOne(
      { _id: new ObjectId(id) },
      { $set: { quantity: newQuantity, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, message: "Book not found" }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, message: "Book quantity updated", data: { quantity: newQuantity } },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating book quantity:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
