import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const DB_NAME = "podcast-app"; // Database name

// GET - Fetch applications with filtering and pagination
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'podcast' or 'entenfis'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    console.log(`Fetching ${type} applications, page: ${page}, limit: ${limit}, search: ${search}`);

    if (!type || !['podcast', 'entenfis'].includes(type)) {
      return NextResponse.json(
        { success: false, error: "Valid application type is required (podcast or entenfis)" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    // CORRECT COLLECTION NAMES - matching your registration APIs
    const collectionName = type === 'podcast' ? 'podcastApplications' : 'entenfisApplications';
    
    console.log(`Using collection: ${collectionName}`);
    
    let query: any = {};
    
    // Search functionality
    if (search && search.trim() !== '') {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    try {
      const total = await db.collection(collectionName).countDocuments(query);
      console.log(`Total documents found: ${total}`);
      
      const applications = await db.collection(collectionName)
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();

      console.log(`Retrieved ${applications.length} applications`);

      // Serialize ObjectIds to strings
      const serializedApplications = applications.map(app => ({
        ...app,
        _id: app._id.toString(),
        // Convert any other ObjectId fields if needed
        ...(app.categoryId && { categoryId: app.categoryId.toString() }),
        ...(app.requiredStock && {
          requiredStock: app.requiredStock.map((stock: any) => ({
            ...stock,
            stockId: stock.stockId?.toString()
          }))
        })
      }));

      return NextResponse.json({
        success: true,
        data: serializedApplications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }, { status: 200 });
    } catch (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { success: false, error: "Database error: " + (dbError as Error).message },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error("Error fetching applications:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST - Get single application by ID
export async function POST(req: NextRequest) {
  try {
    const { id, type } = await req.json();

    console.log(`Fetching single application - ID: ${id}, Type: ${type}`);

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid application ID" },
        { status: 400 }
      );
    }

    if (!type || !['podcast', 'entenfis'].includes(type)) {
      return NextResponse.json(
        { success: false, error: "Valid application type is required (podcast or entenfis)" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    // CORRECT COLLECTION NAMES
    const collectionName = type === 'podcast' ? 'podcastApplications' : 'entenfisApplications';
    
    console.log(`Looking in collection: ${collectionName}`);
    
    const application = await db.collection(collectionName).findOne({ 
      _id: new ObjectId(id) 
    });

    if (!application) {
      console.log(`Application not found in ${collectionName}`);
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
      );
    }

    console.log(`Application found: ${application.fullName}`);

    return NextResponse.json({
      success: true,
      data: {
        ...application,
        _id: application._id.toString(),
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error fetching application:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PUT - Get statistics from both collections
export async function PUT(req: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    console.log("Fetching statistics from both collections");
    
    // CORRECT COLLECTION NAMES
    const [podcastCount, entenfisCount] = await Promise.all([
      db.collection('podcastApplications').countDocuments(),
      db.collection('entenfisApplications').countDocuments()
    ]);

    console.log(`Podcast count: ${podcastCount}, Entenfis count: ${entenfisCount}`);

    // Get recent applications from both collections
    const recentPodcast = await db.collection('podcastApplications')
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    const recentEntenfis = await db.collection('entenfisApplications')
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    return NextResponse.json({
      success: true,
      data: {
        statistics: {
          podcastApplications: podcastCount,
          entenfisApplications: entenfisCount,
          totalApplications: podcastCount + entenfisCount
        },
        recent: {
          podcast: recentPodcast.map(app => ({ ...app, _id: app._id.toString() })),
          entenfis: recentEntenfis.map(app => ({ ...app, _id: app._id.toString() }))
        }
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error fetching statistics:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PATCH - Update application status
export async function PATCH(req: NextRequest) {
  try {
    const { id, type, status, notes } = await req.json();

    console.log(`Updating application - ID: ${id}, Type: ${type}, Status: ${status}`);

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid application ID" },
        { status: 400 }
      );
    }

    if (!type || !['podcast', 'entenfis'].includes(type)) {
      return NextResponse.json(
        { success: false, error: "Valid application type is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    // CORRECT COLLECTION NAMES
    const collectionName = type === 'podcast' ? 'podcastApplications' : 'entenfisApplications';
    
    const updateData: any = {
      updatedAt: new Date()
    };
    
    if (status) updateData.status = status;
    if (notes) updateData.adminNotes = notes;
    
    const result = await db.collection(collectionName).updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
      );
    }

    console.log(`Application updated successfully. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);

    return NextResponse.json({
      success: true,
      message: "Application updated successfully"
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error updating application:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete application
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');

    console.log(`Deleting application - ID: ${id}, Type: ${type}`);

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid application ID" },
        { status: 400 }
      );
    }

    if (!type || !['podcast', 'entenfis'].includes(type)) {
      return NextResponse.json(
        { success: false, error: "Valid application type is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    // CORRECT COLLECTION NAMES
    const collectionName = type === 'podcast' ? 'podcastApplications' : 'entenfisApplications';
    
    const result = await db.collection(collectionName).deleteOne({ 
      _id: new ObjectId(id) 
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
      );
    }

    console.log(`Application deleted successfully. Deleted count: ${result.deletedCount}`);

    return NextResponse.json({
      success: true,
      message: "Application deleted successfully"
    }, { status: 200 });

  } catch (error: any) {
    console.error("Error deleting application:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
