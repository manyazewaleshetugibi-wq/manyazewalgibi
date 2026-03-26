// import { NextRequest, NextResponse } from "next/server";
// import clientPromise from "@/lib/mongodb";
// import { validateItemData } from "@/models/Item";
// import { ObjectId } from "mongodb";

// // Cloudinary Configuration (keep your existing config)
// const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dnqsoezfo';
// const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'photoupload';
// const CLOUDINARY_IMAGE_FOLDER = process.env.NEXT_PUBLIC_CLOUDINARY_IMAGE_FOLDER || 'items';

// const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
// const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

// // Your existing uploadToCloudinary function (keep as is)
// async function uploadToCloudinary(
//   file: File,
//   onProgress?: (progress: number) => void
// ): Promise<{ 
//   url: string; 
//   publicId: string; 
//   format: string; 
//   bytes: number;
//   width?: number;
//   height?: number;
// }> {
//   // ... keep your existing implementation
//   let interval: NodeJS.Timeout | null = null;

//   try {
//     const formData = new FormData();
//     formData.append('file', file);
//     formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
//     formData.append('folder', CLOUDINARY_IMAGE_FOLDER);
    
//     const timestamp = Date.now();
//     const randomString = Math.random().toString(36).substring(7);
//     const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
//     const publicId = `${CLOUDINARY_IMAGE_FOLDER}/${timestamp}_${randomString}_${safeFileName.replace(/\.[^/.]+$/, "")}`;
//     formData.append('public_id', publicId);
//     formData.append('tags', 'item');
//     formData.append('context', `type=item_image|filename=${file.name}|uploaded_at=${timestamp}`);
    
//     if (onProgress) {
//       let progress = 0;
//       interval = setInterval(() => {
//         progress += 20;
//         if (progress > 90) progress = 90;
//         onProgress(progress);
//       }, 100);
//     }
    
//     const response = await fetch(
//       `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
//       {
//         method: 'POST',
//         body: formData,
//       }
//     );
    
//     if (interval) clearInterval(interval);

//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error('Cloudinary response error:', errorText);
//       throw new Error(`Cloudinary upload failed: ${response.status} ${errorText}`);
//     }
    
//     const data = await response.json();
    
//     if (onProgress) {
//       onProgress(100);
//     }
    
//     return {
//       url: data.secure_url,
//       publicId: data.public_id,
//       format: data.format,
//       bytes: data.bytes,
//       width: data.width,
//       height: data.height,
//     };
    
//   } catch (error: any) {
//     if (interval) clearInterval(interval);
//     console.error('Cloudinary upload error:', error);
//     throw new Error(`Failed to upload to Cloudinary: ${error.message}`);
//   }
// }

// // ✅ UPDATED GET handler with batch support
// export async function GET(req: NextRequest) {
//   try {
//     const client = await clientPromise;
//     const db = client.db("gold");
    
//     // Get query parameters
//     const searchParams = req.nextUrl.searchParams;
//     const id = searchParams.get("id");        // Single item by ID
//     const ids = searchParams.get("ids");      // Batch items (comma-separated)
//     const categoryId = searchParams.get("categoryId"); // Filter by category
//     const isActive = searchParams.get("isActive");     // Filter by active status
//     const limit = parseInt(searchParams.get("limit") || "50");
//     const page = parseInt(searchParams.get("page") || "1");
    
//     // ========== BATCH REQUEST (NEW) ==========
//     if (ids) {
//       // Parse and validate IDs
//       const idsArray = ids.split(",").filter(id => id && id.trim().length > 0);
      
//       if (idsArray.length === 0) {
//         return NextResponse.json({ items: [], total: 0, requested: 0 });
//       }
      
//       // Limit batch size for security (max 100 items per request)
//       const MAX_BATCH_SIZE = 100;
//       if (idsArray.length > MAX_BATCH_SIZE) {
//         return NextResponse.json(
//           { 
//             error: `Batch size exceeds limit of ${MAX_BATCH_SIZE}`, 
//             items: [],
//             total: 0,
//             requested: idsArray.length
//           },
//           { status: 400 }
//         );
//       }
      
//       // Convert string IDs to ObjectId
//       const objectIds = idsArray
//         .filter(id => ObjectId.isValid(id))
//         .map(id => new ObjectId(id));
      
//       if (objectIds.length === 0) {
//         return NextResponse.json({ items: [], total: 0, requested: idsArray.length });
//       }
      
//       // Fetch items using $in operator (optimized with index)
//       const items = await db.collection("items")
//         .find({ _id: { $in: objectIds } })
//         .toArray();
      
//       // Create a map for O(1) lookup
//       const itemsMap = new Map(
//         items.map(item => [item._id.toString(), item])
//       );
      
//       // Preserve the original order of requested IDs
//       const orderedItems = idsArray
//         .filter(id => ObjectId.isValid(id))
//         .map(id => itemsMap.get(id))
//         .filter(item => item !== undefined);
      
//       return NextResponse.json({
//         success: true,
//         items: orderedItems,
//         total: orderedItems.length,
//         requested: idsArray.length,
//         missing: idsArray.length - orderedItems.length
//       });
//     }
    
//     // ========== SINGLE ITEM REQUEST ==========
//     if (id) {
//       if (!ObjectId.isValid(id)) {
//         return NextResponse.json(
//           { success: false, error: "Invalid item ID" },
//           { status: 400 }
//         );
//       }
      
//       const item = await db.collection("items").findOne({ 
//         _id: new ObjectId(id) 
//       });
      
//       if (!item) {
//         return NextResponse.json(
//           { success: false, error: "Item not found" },
//           { status: 404 }
//         );
//       }
      
//       return NextResponse.json({ 
//         success: true, 
//         data: item 
//       });
//     }
    
//     // ========== LIST ITEMS WITH FILTERS ==========
//     // Build query filters
//     const query: any = {};
    
//     if (categoryId && ObjectId.isValid(categoryId)) {
//       query.categoryId = new ObjectId(categoryId);
//     }
    
//     if (isActive !== null && isActive !== undefined) {
//       query.isActive = isActive === "true";
//     }
    
//     // Calculate pagination
//     const skip = (page - 1) * limit;
    
//     // Fetch items with pagination
//     const [items, total] = await Promise.all([
//       db.collection("items")
//         .find(query)
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limit)
//         .toArray(),
//       db.collection("items").countDocuments(query)
//     ]);
    
//     return NextResponse.json({ 
//       success: true, 
//       items,
//       pagination: {
//         page,
//         limit,
//         total,
//         totalPages: Math.ceil(total / limit),
//         hasMore: skip + items.length < total
//       }
//     });
    
//   } catch (error) {
//     console.error("GET /api/items Error:", error);
//     return NextResponse.json(
//       { success: false, error: "Internal Server Error" },
//       { status: 500 }
//     );
//   }
// }

// // Keep your existing POST, PUT, DELETE handlers exactly as they are
// export async function POST(req: NextRequest) {
//   // ... your existing POST handler (unchanged)
//   try {
//     const formData = await req.formData();
//     console.log("Received item creation request");
    
//     // Parse form data
//     const name = formData.get("name") as string;
//     const description = formData.get("description") as string;
//     const price = parseFloat(formData.get("price") as string);
//     const cost = parseFloat(formData.get("cost") as string);
//     const categoryId = formData.get("categoryId") as string;
//     const requiredStockString = formData.get("requiredStock") as string;
//     const imageFile = formData.get("image") as File | null;

//     // Basic validation
//     if (!name || !description || !categoryId) {
//       return NextResponse.json(
//         { 
//           success: false, 
//           message: "Name, description, and category are required" 
//         },
//         { status: 400 }
//       );
//     }

//     if (!ObjectId.isValid(categoryId)) {
//       return NextResponse.json(
//         { success: false, message: "Invalid category ID" },
//         { status: 400 }
//       );
//     }

//     // Parse requiredStock
//     let requiredStock = [];
//     try {
//       requiredStock = requiredStockString ? JSON.parse(requiredStockString) : [];
//     } catch (error) {
//       return NextResponse.json(
//         { success: false, message: "Invalid requiredStock format" },
//         { status: 400 }
//       );
//     }

//     // Validate requiredStock IDs
//     for (const stock of requiredStock) {
//       if (!ObjectId.isValid(stock.stockId)) {
//         return NextResponse.json(
//           { success: false, message: `Invalid stock ID: ${stock.stockId}` },
//           { status: 400 }
//         );
//       }
//     }

//     // Handle image upload
//     let imageUrl = "";
//     let cloudinaryData: any = null;

//     if (imageFile && imageFile.size > 0) {
//       // Validate image file
//       if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
//         return NextResponse.json(
//           { 
//             success: false, 
//             message: `Invalid image file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}` 
//           },
//           { status: 400 }
//         );
//       }

//       if (imageFile.size > MAX_IMAGE_SIZE) {
//         const maxSizeMB = MAX_IMAGE_SIZE / (1024 * 1024);
//         const fileSizeMB = imageFile.size / (1024 * 1024);
//         return NextResponse.json(
//           { 
//             success: false, 
//             message: `Image file too large. Max: ${maxSizeMB}MB, Your file: ${fileSizeMB.toFixed(2)}MB` 
//           },
//           { status: 400 }
//         );
//       }

//       try {
//         console.log('Starting image upload to Cloudinary...');
//         cloudinaryData = await uploadToCloudinary(imageFile);
//         imageUrl = cloudinaryData.url;
//         console.log('Image upload successful:', cloudinaryData);
//       } catch (uploadError: any) {
//         console.error('Image upload error:', uploadError);
//         return NextResponse.json(
//           { 
//             success: false, 
//             message: uploadError.message || "Failed to upload image" 
//           },
//           { status: 500 }
//         );
//       }
//     }

//     // Prepare item data
//     const itemData = {
//       name,
//       description,
//       price,
//       cost,
//       categoryId,
//       imageUrl,
//       requiredStock,
//       cloudinaryData,
//       isActive: true,
//       createdAt: new Date(),
//       updatedAt: new Date(),
//     };

//     // Validate item data
//     const validatedData = validateItemData(itemData);

//     // Connect to database
//     const dbClient = await clientPromise;
//     const db = dbClient.db("gold");

//     // Insert into database
//     const result = await db.collection("items").insertOne({
//       ...validatedData,
//       categoryId: new ObjectId(validatedData.categoryId),
//       requiredStock: validatedData.requiredStock.map((stock: any) => ({
//         stockId: new ObjectId(stock.stockId),
//         quantity: stock.quantity,
//       })),
//       imageUrl,
//       cloudinaryData,
//       isActive: true,
//       createdAt: new Date(),
//       updatedAt: new Date(),
//     });

//     // Fetch the created item to return
//     const createdItem = await db.collection("items").findOne({ _id: result.insertedId });

//     return NextResponse.json(
//       {
//         success: true,
//         message: "Item created successfully",
//         data: createdItem,
//       },
//       { status: 201 }
//     );
//   } catch (error: any) {
//     console.error("Error creating item:", error);
//     return NextResponse.json(
//       { success: false, message: error.message || "Internal Server Error" },
//       { status: 500 }
//     );
//   }
// }

// export async function PUT(req: NextRequest) {
//   // ... your existing PUT handler (unchanged)
//   try {
//     const url = new URL(req.url);
//     const id = url.pathname.split('/').pop();
    
//     if (!id) {
//       return NextResponse.json(
//         { success: false, message: "Item ID is required" },
//         { status: 400 }
//       );
//     }

//     if (!ObjectId.isValid(id)) {
//       return NextResponse.json(
//         { success: false, message: "Invalid item ID" },
//         { status: 400 }
//       );
//     }

//     const formData = await req.formData();
    
//     // Parse form data
//     const name = formData.get("name") as string;
//     const description = formData.get("description") as string;
//     const price = formData.get("price") as string;
//     const cost = formData.get("cost") as string;
//     const categoryId = formData.get("categoryId") as string;
//     const requiredStockString = formData.get("requiredStock") as string;
//     const imageFile = formData.get("image") as File | null;
//     const removeImage = formData.get("removeImage") === "true";

//     // Connect to database
//     const dbClient = await clientPromise;
//     const db = dbClient.db("gold");

//     // Get existing item
//     const existingItem = await db.collection("items").findOne({ _id: new ObjectId(id) });
//     if (!existingItem) {
//       return NextResponse.json(
//         { success: false, message: "Item not found" },
//         { status: 404 }
//       );
//     }

//     let imageUrl = existingItem.imageUrl;
//     let cloudinaryData = existingItem.cloudinaryData;

//     // Handle image removal
//     if (removeImage) {
//       imageUrl = "";
//       cloudinaryData = null;
//     }

//     // Handle new image upload
//     if (imageFile && imageFile.size > 0) {
//       // Validate image file
//       if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
//         return NextResponse.json(
//           { 
//             success: false, 
//             message: `Invalid image file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}` 
//           },
//           { status: 400 }
//         );
//       }

//       if (imageFile.size > MAX_IMAGE_SIZE) {
//         const maxSizeMB = MAX_IMAGE_SIZE / (1024 * 1024);
//         const fileSizeMB = imageFile.size / (1024 * 1024);
//         return NextResponse.json(
//           { 
//             success: false, 
//             message: `Image file too large. Max: ${maxSizeMB}MB, Your file: ${fileSizeMB.toFixed(2)}MB` 
//           },
//           { status: 400 }
//         );
//       }

//       try {
//         console.log('Starting image upload to Cloudinary for update...');
//         cloudinaryData = await uploadToCloudinary(imageFile);
//         imageUrl = cloudinaryData.url;
//         console.log('Image upload successful:', cloudinaryData);
//       } catch (uploadError: any) {
//         console.error('Image upload error:', uploadError);
//         return NextResponse.json(
//           { 
//             success: false, 
//             message: uploadError.message || "Failed to upload image" 
//           },
//           { status: 500 }
//         );
//       }
//     }

//     // Parse requiredStock
//     let requiredStock = existingItem.requiredStock || [];
//     if (requiredStockString) {
//       try {
//         requiredStock = JSON.parse(requiredStockString);
//       } catch (error) {
//         return NextResponse.json(
//           { success: false, message: "Invalid requiredStock format" },
//           { status: 400 }
//         );
//       }
//     }

//     // Validate requiredStock IDs
//     for (const stock of requiredStock) {
//       if (!ObjectId.isValid(stock.stockId)) {
//         return NextResponse.json(
//           { success: false, message: `Invalid stock ID: ${stock.stockId}` },
//           { status: 400 }
//         );
//       }
//     }

//     // Prepare update data
//     const updateData: any = {
//       name: name !== undefined ? name : existingItem.name,
//       description: description !== undefined ? description : existingItem.description,
//       price: price !== undefined ? parseFloat(price) : existingItem.price,
//       cost: cost !== undefined ? parseFloat(cost) : existingItem.cost,
//       categoryId: categoryId !== undefined ? categoryId : existingItem.categoryId,
//       imageUrl,
//       cloudinaryData,
//       requiredStock: requiredStock.map((stock: any) => ({
//         stockId: new ObjectId(stock.stockId),
//         quantity: stock.quantity,
//       })),
//       updatedAt: new Date(),
//     };

//     // Validate data
//     const validatedData = validateItemData(updateData);

//     // Update item
//     const result = await db.collection("items").updateOne(
//       { _id: new ObjectId(id) },
//       { $set: validatedData }
//     );

//     if (result.matchedCount === 0) {
//       return NextResponse.json(
//         { success: false, message: "Item not found" },
//         { status: 404 }
//       );
//     }

//     // Fetch updated item
//     const updatedItem = await db.collection("items").findOne({ _id: new ObjectId(id) });

//     return NextResponse.json(
//       {
//         success: true,
//         message: "Item updated successfully",
//         data: updatedItem,
//       },
//       { status: 200 }
//     );
//   } catch (error: any) {
//     console.error("Error updating item:", error);
//     return NextResponse.json(
//       { success: false, message: error.message || "Internal Server Error" },
//       { status: 500 }
//     );
//   }
// }

// export async function DELETE(req: NextRequest) {
//   // ... your existing DELETE handler (unchanged)
//   try {
//     const url = new URL(req.url);
//     const id = url.pathname.split('/').pop();

//     if (!id) {
//       return NextResponse.json(
//         { success: false, message: "Item ID is required" },
//         { status: 400 }
//       );
//     }

//     if (!ObjectId.isValid(id)) {
//       return NextResponse.json(
//         { success: false, message: "Invalid item ID" },
//         { status: 400 }
//       );
//     }

//     const dbClient = await clientPromise;
//     const db = dbClient.db("gold");

//     // Get item first to get Cloudinary publicId
//     const item = await db.collection("items").findOne({ _id: new ObjectId(id) });

//     if (!item) {
//       return NextResponse.json(
//         { success: false, message: "Item not found" },
//         { status: 404 }
//       );
//     }

//     // Delete from database
//     const result = await db.collection("items").deleteOne({ _id: new ObjectId(id) });

//     if (result.deletedCount === 0) {
//       return NextResponse.json(
//         { success: false, message: "Item not found" },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json(
//       {
//         success: true,
//         message: "Item deleted successfully",
//       },
//       { status: 200 }
//     );
//   } catch (error: any) {
//     console.error("Error deleting item:", error);
//     return NextResponse.json(
//       { success: false, message: error.message || "Internal Server Error" },
//       { status: 500 }
//     );
//   }
// }




import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { validateItemData } from "@/models/Item";
import { ObjectId } from "mongodb";

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dnqsoezfo';
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'photoupload';
const CLOUDINARY_IMAGE_FOLDER = process.env.NEXT_PUBLIC_CLOUDINARY_IMAGE_FOLDER || 'items';

// Max file size for images
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

// Allowed image types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

/**
 * Uploads an image to Cloudinary
 */
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
    formData.append('folder', CLOUDINARY_IMAGE_FOLDER);
    
    // Add public_id for better organization
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const publicId = `${CLOUDINARY_IMAGE_FOLDER}/${timestamp}_${randomString}_${safeFileName.replace(/\.[^/.]+$/, "")}`;
    formData.append('public_id', publicId);
    
    // Add tags for organization
    formData.append('tags', 'item');
    
    // Add context/metadata
    formData.append('context', `type=item_image|filename=${file.name}|uploaded_at=${timestamp}`);
    
    // Simulate upload progress
    if (onProgress) {
      let progress = 0;
      interval = setInterval(() => {
        progress += 20;
        if (progress > 90) progress = 90;
        onProgress(progress);
      }, 100);
    }
    
    // Upload to Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );
    
    if (interval) clearInterval(interval);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cloudinary response error:', errorText);
      throw new Error(`Cloudinary upload failed: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    
    if (onProgress) {
      onProgress(100); // Complete
    }
    
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

/**
 * Handles creating a new item with Cloudinary image upload
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    console.log("Received item creation request");
    
    // Parse form data
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const price = parseFloat(formData.get("price") as string);
    const cost = parseFloat(formData.get("cost") as string);
    const categoryId = formData.get("categoryId") as string;
    const requiredStockString = formData.get("requiredStock") as string;
    const imageFile = formData.get("image") as File | null;

    // Basic validation
    if (!name || !description || !categoryId) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Name, description, and category are required" 
        },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(categoryId)) {
      return NextResponse.json(
        { success: false, message: "Invalid category ID" },
        { status: 400 }
      );
    }

    // Parse requiredStock
    let requiredStock = [];
    try {
      requiredStock = requiredStockString ? JSON.parse(requiredStockString) : [];
    } catch (error) {
      return NextResponse.json(
        { success: false, message: "Invalid requiredStock format" },
        { status: 400 }
      );
    }

    // Validate requiredStock IDs
    for (const stock of requiredStock) {
      if (!ObjectId.isValid(stock.stockId)) {
        return NextResponse.json(
          { success: false, message: `Invalid stock ID: ${stock.stockId}` },
          { status: 400 }
        );
      }
    }

    // Handle image upload
    let imageUrl = "";
    let cloudinaryData: any = null;

    if (imageFile && imageFile.size > 0) {
      // Validate image file
      if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
        return NextResponse.json(
          { 
            success: false, 
            message: `Invalid image file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}` 
          },
          { status: 400 }
        );
      }

      if (imageFile.size > MAX_IMAGE_SIZE) {
        const maxSizeMB = MAX_IMAGE_SIZE / (1024 * 1024);
        const fileSizeMB = imageFile.size / (1024 * 1024);
        return NextResponse.json(
          { 
            success: false, 
            message: `Image file too large. Max: ${maxSizeMB}MB, Your file: ${fileSizeMB.toFixed(2)}MB` 
          },
          { status: 400 }
        );
      }

      try {
        console.log('Starting image upload to Cloudinary...');
        cloudinaryData = await uploadToCloudinary(imageFile);
        imageUrl = cloudinaryData.url;
        console.log('Image upload successful:', cloudinaryData);
      } catch (uploadError: any) {
        console.error('Image upload error:', uploadError);
        return NextResponse.json(
          { 
            success: false, 
            message: uploadError.message || "Failed to upload image" 
          },
          { status: 500 }
        );
      }
    }

    // Prepare item data
    const itemData = {
      name,
      description,
      price,
      cost,
      categoryId,
      imageUrl,
      requiredStock,
      cloudinaryData, // Store Cloudinary metadata
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validate item data
    const validatedData = validateItemData(itemData);

    // Connect to database
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    // Insert into database
    const result = await db.collection("items").insertOne({
      ...validatedData,
      categoryId: new ObjectId(validatedData.categoryId),
      requiredStock: validatedData.requiredStock.map((stock: any) => ({
        stockId: new ObjectId(stock.stockId),
        quantity: stock.quantity,
      })),
      imageUrl,
      cloudinaryData, // Store Cloudinary metadata
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Fetch the created item to return
    const createdItem = await db.collection("items").findOne({ _id: result.insertedId });

    return NextResponse.json(
      {
        success: true,
        message: "Item created successfully",
        data: createdItem,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating item:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ✅ GET all items
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("gold");
    const items = await db.collection("items").find({}).toArray();

    return NextResponse.json({ success: true, items }, { status: 200 });
  } catch (error) {
    console.error("GET /item Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ✅ PUT - Update item with optional image update
export async function PUT(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: "Item ID is required" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid item ID" },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    
    // Parse form data
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const price = formData.get("price") as string;
    const cost = formData.get("cost") as string;
    const categoryId = formData.get("categoryId") as string;
    const requiredStockString = formData.get("requiredStock") as string;
    const imageFile = formData.get("image") as File | null;
    const removeImage = formData.get("removeImage") === "true";

    // Connect to database
    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    // Get existing item
    const existingItem = await db.collection("items").findOne({ _id: new ObjectId(id) });
    if (!existingItem) {
      return NextResponse.json(
        { success: false, message: "Item not found" },
        { status: 404 }
      );
    }

    let imageUrl = existingItem.imageUrl;
    let cloudinaryData = existingItem.cloudinaryData;

    // Handle image removal
    if (removeImage) {
      imageUrl = "";
      cloudinaryData = null;
      // Note: You might want to delete from Cloudinary here
      // if (existingItem.cloudinaryData?.publicId) {
      //   await deleteFromCloudinary(existingItem.cloudinaryData.publicId);
      // }
    }

    // Handle new image upload
    if (imageFile && imageFile.size > 0) {
      // Validate image file
      if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
        return NextResponse.json(
          { 
            success: false, 
            message: `Invalid image file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}` 
          },
          { status: 400 }
        );
      }

      if (imageFile.size > MAX_IMAGE_SIZE) {
        const maxSizeMB = MAX_IMAGE_SIZE / (1024 * 1024);
        const fileSizeMB = imageFile.size / (1024 * 1024);
        return NextResponse.json(
          { 
            success: false, 
            message: `Image file too large. Max: ${maxSizeMB}MB, Your file: ${fileSizeMB.toFixed(2)}MB` 
          },
          { status: 400 }
        );
      }

      try {
        console.log('Starting image upload to Cloudinary for update...');
        cloudinaryData = await uploadToCloudinary(imageFile);
        imageUrl = cloudinaryData.url;
        console.log('Image upload successful:', cloudinaryData);
        
        // Optionally delete old image from Cloudinary
        // if (existingItem.cloudinaryData?.publicId) {
        //   await deleteFromCloudinary(existingItem.cloudinaryData.publicId);
        // }
      } catch (uploadError: any) {
        console.error('Image upload error:', uploadError);
        return NextResponse.json(
          { 
            success: false, 
            message: uploadError.message || "Failed to upload image" 
          },
          { status: 500 }
        );
      }
    }

    // Parse requiredStock
    let requiredStock = existingItem.requiredStock || [];
    if (requiredStockString) {
      try {
        requiredStock = JSON.parse(requiredStockString);
      } catch (error) {
        return NextResponse.json(
          { success: false, message: "Invalid requiredStock format" },
          { status: 400 }
        );
      }
    }

    // Validate requiredStock IDs
    for (const stock of requiredStock) {
      if (!ObjectId.isValid(stock.stockId)) {
        return NextResponse.json(
          { success: false, message: `Invalid stock ID: ${stock.stockId}` },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {
      name: name !== undefined ? name : existingItem.name,
      description: description !== undefined ? description : existingItem.description,
      price: price !== undefined ? parseFloat(price) : existingItem.price,
      cost: cost !== undefined ? parseFloat(cost) : existingItem.cost,
      categoryId: categoryId !== undefined ? categoryId : existingItem.categoryId,
      imageUrl,
      cloudinaryData,
      requiredStock: requiredStock.map((stock: any) => ({
        stockId: new ObjectId(stock.stockId),
        quantity: stock.quantity,
      })),
      updatedAt: new Date(),
    };

    // Validate data
    const validatedData = validateItemData(updateData);

    // Update item
    const result = await db.collection("items").updateOne(
      { _id: new ObjectId(id) },
      { $set: validatedData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: "Item not found" },
        { status: 404 }
      );
    }

    // Fetch updated item
    const updatedItem = await db.collection("items").findOne({ _id: new ObjectId(id) });

    return NextResponse.json(
      {
        success: true,
        message: "Item updated successfully",
        data: updatedItem,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error updating item:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ✅ DELETE - Delete item and optionally delete from Cloudinary
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Item ID is required" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid item ID" },
        { status: 400 }
      );
    }

    const dbClient = await clientPromise;
    const db = dbClient.db("gold");

    // Get item first to get Cloudinary publicId
    const item = await db.collection("items").findOne({ _id: new ObjectId(id) });

    if (!item) {
      return NextResponse.json(
        { success: false, message: "Item not found" },
        { status: 404 }
      );
    }

    // TODO: Optionally delete from Cloudinary if needed
    // if (item.cloudinaryData?.publicId) {
    //   // Delete from Cloudinary
    //   await deleteFromCloudinary(item.cloudinaryData.publicId);
    // }

    // Delete from database
    const result = await db.collection("items").deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: "Item not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Item deleted successfully",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting item:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}