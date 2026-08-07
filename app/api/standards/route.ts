import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { getCurrentUserData } from "../utils/orderHelpers";
import { Standard, DepartmentRole, departmentOptions } from "@/types/standards";

// Helper function to check if user is admin
const isAdminRole = (role: string | undefined): boolean => {
  if (!role) return false;
  return ['ADMIN', 'admin', 'Admin', 'SUPER_ADMIN'].includes(role);
};

// GET endpoint - Fetch all standards
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const standardId = url.searchParams.get("id");
    const role = url.searchParams.get("role");
    const all = url.searchParams.get("all") === "true";

    let query: any = { isActive: { not: false } };
    if (standardId) {
      query.id = standardId;
    }
    if (role) {
      query.role = role;
    }

    const standards = await prisma.standard.findMany({
      where: query,
      orderBy: [{ role: 'asc' }, { version: 'desc' }]
    });

    // If all is true, return all standards, else return only active ones
    const filteredStandards = (all ? standards : standards.filter(s => s.isActive !== false))
      .map((s: any) => ({ ...s, _id: s.id }));

    return NextResponse.json({
      success: true,
      standards: filteredStandards,
      count: filteredStandards.length,
      totalStandards: standards.length
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching standards:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch standards" },
      { status: 500 }
    );
  }
}

// POST endpoint - Create new standards
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const { role, standards, description, effectiveFrom, reviewDate } = body;

    if (!role) {
      return NextResponse.json(
        { success: false, error: "Role is required" },
        { status: 400 }
      );
    }

    if (!standards || !Array.isArray(standards) || standards.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one standard is required" },
        { status: 400 }
      );
    }

    // Check if standards already exist for this role
    const existingStandards = await prisma.standard.findFirst({
      where: {
        role: role,
        isActive: { not: false }
      }
    });
    
    if (existingStandards) {
      return NextResponse.json({
        success: false,
        error: `Standards already exist for this role`,
        exists: true,
        standardId: existingStandards.id,
        standard: existingStandards
      }, { status: 409 });
    }

    // Get current user
    const userData = await getCurrentUserData(req);
    const isAdmin = isAdminRole(userData?.role);

    // Get role display name
    const roleOption = departmentOptions.find(r => r.value === role);
    const roleDisplayName = roleOption?.label || role;
    const departmentIcon = roleOption?.icon || "📋";

    // Prepare standards document
    const standardsData = {
      role,
      roleDisplayName,
      department: roleDisplayName,
      departmentIcon,
      standards: standards.map((standard: any) => ({
        id: standard.id,
        number: standard.number,
        title: standard.title,
        description: standard.description || "",
        category: standard.category || "",
        subItems: (standard.subItems || []).map((subItem: any) => ({
          id: subItem.id,
          number: subItem.number,
          title: subItem.title,
          description: subItem.description || "",
          isRequired: subItem.isRequired || false,
          checklist: subItem.checklist || [],
          penalty: subItem.penalty || null,
          points: subItem.points || 0
        }))
      })),
      description: description || "",
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom).toISOString() : null,
      reviewDate: reviewDate ? new Date(reviewDate).toISOString() : null,
      createdBy: userData?.name || userData?.email || "Unknown",
      createdByRole: userData?.role,
      isAdminCreated: isAdmin,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      version: 1
    };

    const result = await prisma.standard.create({
      data: { id: randomUUID(), ...standardsData } as any
    });

    // Create activity log
    await prisma.standardsLog.create({
      data: {
        id: randomUUID(),
        action: "CREATE",
        standardId: result.id,
        role: role,
        standardsCount: standards.length,
        createdBy: userData?.name || userData?.email,
        createdAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: "Standards created successfully",
      standardId: result.id,
      standard: {
        ...standardsData,
        _id: result.id
      }
    }, { status: 201 });

  } catch (error) {
    console.error("Error creating standards:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create standards" },
      { status: 500 }
    );
  }
}

// PUT endpoint - Update existing standards
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { standardId, role, standards, description, effectiveFrom, reviewDate } = body;

    if (!standardId) {
      return NextResponse.json(
        { success: false, error: "Valid standard ID is required" },
        { status: 400 }
      );
    }

    const userData = await getCurrentUserData(req);
    const isAdmin = isAdminRole(userData?.role);

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Only admins can update standards" },
        { status: 403 }
      );
    }

    const existingStandard = await prisma.standard.findUnique({ where: { id: standardId } });
    if (!existingStandard) {
      return NextResponse.json(
        { success: false, error: "Standards not found" },
        { status: 404 }
      );
    }

    const roleOption = departmentOptions.find(r => r.value === role);
    const roleDisplayName = roleOption?.label || role;
    const departmentIcon = roleOption?.icon || "📋";

    const updateData: any = {
      role,
      roleDisplayName,
      department: roleDisplayName,
      departmentIcon,
      standards: standards.map((standard: any) => ({
        id: standard.id,
        number: standard.number,
        title: standard.title,
        description: standard.description || "",
        category: standard.category || "",
        subItems: (standard.subItems || []).map((subItem: any) => ({
          id: subItem.id,
          number: subItem.number,
          title: subItem.title,
          description: subItem.description || "",
          isRequired: subItem.isRequired || false,
          checklist: subItem.checklist || [],
          penalty: subItem.penalty || null,
          points: subItem.points || 0
        }))
      })),
      description: description || "",
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom).toISOString() : null,
      reviewDate: reviewDate ? new Date(reviewDate).toISOString() : null,
      updatedAt: new Date(),
      updatedBy: userData?.name || userData?.email,
      version: (existingStandard.version || 0) + 1
    };

    const result = await prisma.standard.updateMany(
      { where: { id: standardId }, data: updateData }
    );

    await prisma.standardsLog.create({
      data: {
        id: randomUUID(),
        action: "UPDATE",
        standardId,
        role: role,
      }
    });

    return NextResponse.json({
      success: true,
      message: "Standards updated successfully",
      modifiedCount: result.count,
      version: updateData.version
    }, { status: 200 });

  } catch (error) {
    console.error("Error updating standards:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update standards" },
      { status: 500 }
    );
  }
}

// DELETE endpoint - Soft delete standards
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const standardId = url.searchParams.get("id");

    if (!standardId) {
      return NextResponse.json(
        { success: false, error: "Valid standard ID is required" },
        { status: 400 }
      );
    }

    const userData = await getCurrentUserData(req);
    const isAdmin = isAdminRole(userData?.role);

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Only admins can delete standards" },
        { status: 403 }
      );
    }

    const standard = await prisma.standard.findUnique({ where: { id: standardId } });
    if (!standard) {
      return NextResponse.json(
        { success: false, error: "Standards not found" },
        { status: 404 }
      );
    }

    // Soft delete
    const result = await prisma.standard.updateMany(
      { where: { id: standardId }, data: { isActive: false } }
    );

    await prisma.standardsLog.create({
      data: {
        id: randomUUID(),
        action: "DELETE",
        standardId,
        role: standard.role,
      }
    });

    return NextResponse.json({
      success: true,
      message: "Standards deleted successfully",
      modifiedCount: result.count
    }, { status: 200 });

  } catch (error) {
    console.error("Error deleting standards:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete standards" },
      { status: 500 }
    );
  }
}
