import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Fetch applications with filtering and pagination
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'podcast' or 'entenfis'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';



    if (!type || !['podcast', 'entenfis'].includes(type)) {
      return NextResponse.json(
        { success: false, error: "Valid application type is required (podcast or entenfis)" },
        { status: 400 }
      );
    }
    
    let where: any = {};
    
    // Search functionality
    if (search && search.trim() !== '') {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ];
    }

    try {
      const isPodcast = type === 'podcast';

      const total = isPodcast
        ? await prisma.podcastApplication.count({ where })
        : await prisma.entenfisApplication.count({ where });

      
      const applications = isPodcast
        ? await prisma.podcastApplication.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
          })
        : await prisma.entenfisApplication.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
          });



      // Serialize ids to strings
      const serializedApplications = applications.map(app => ({
        ...app,
        _id: app.id,
        // Preserve nested fields that only exist on podcast applications
        ...((app as any).categoryId && { categoryId: (app as any).categoryId.toString() }),
        ...((app as any).requiredStock && {
          requiredStock: ((app as any).requiredStock as any[]).map((stock: any) => ({
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



    if (!id) {
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
    
    const isPodcast = type === 'podcast';
    

    
    const application = isPodcast
      ? await prisma.podcastApplication.findFirst({ where: { id } })
      : await prisma.entenfisApplication.findFirst({ where: { id } });

    if (!application) {

      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
      );
    }



    return NextResponse.json({
      success: true,
      data: {
        ...application,
        _id: application.id,
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

    
    const [podcastCount, entenfisCount] = await Promise.all([
      prisma.podcastApplication.count(),
      prisma.entenfisApplication.count()
    ]);



    // Get recent applications from both collections
    const recentPodcast = await prisma.podcastApplication.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const recentEntenfis = await prisma.entenfisApplication.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return NextResponse.json({
      success: true,
      data: {
        statistics: {
          podcastApplications: podcastCount,
          entenfisApplications: entenfisCount,
          totalApplications: podcastCount + entenfisCount
        },
        recent: {
          podcast: recentPodcast.map(app => ({ ...app, _id: app.id })),
          entenfis: recentEntenfis.map(app => ({ ...app, _id: app.id }))
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



    if (!id) {
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
    
    const updateData: any = {
      updatedAt: new Date()
    };
    
    if (status) updateData.status = status;
    if (notes) updateData.adminNotes = notes;
    
    const result = type === 'podcast'
      ? await prisma.podcastApplication.updateMany({ where: { id }, data: updateData })
      : await prisma.entenfisApplication.updateMany({ where: { id }, data: updateData });

    if (result.count === 0) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
      );
    }



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



    if (!id) {
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
    
    const result = type === 'podcast'
      ? await prisma.podcastApplication.deleteMany({ where: { id } })
      : await prisma.entenfisApplication.deleteMany({ where: { id } });

    if (result.count === 0) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
      );
    }



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
