// app/api/employee-rank/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

const COLLECTION_NAME = "employee_rank";

export interface EmployeeRank {
  _id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  performanceScore: number;
  attendance: number; // percentage
  efficiency: number; // percentage
  salesTarget?: number;
  salesAchieved?: number;
  customerRating: number; // 1-5
  points: number;
  rank: number;
  lastUpdated: Date;
  createdAt: Date;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 10;
    const department = searchParams.get("department");
    
    let query: any = {};
    if (department) {
      query.department = department;
    }
    
    // Get employee ranks sorted by rank (ascending - 1 is best)
    const employeeRanks = await prisma.employeeRank.findMany({
      where: query,
      orderBy: { rank: 'asc' },
      take: limit,
    });
    
    return NextResponse.json(employeeRanks.map(r => ({ ...r, _id: r.id })), { status: 200 });
  } catch (error) {
    console.error("Error fetching employee ranks:", error);
    return NextResponse.json(
      { message: "Error fetching employee ranks", error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      name,
      email,
      role,
      department,
      performanceScore,
      attendance,
      efficiency,
      salesTarget,
      salesAchieved,
      customerRating,
      points,
    } = body;

    if (!userId || !name || !email || !role) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if employee rank already exists for this user
    const existingRank = await prisma.employeeRank.findFirst({
      where: { userId: String(userId) }
    });
    
    const now = new Date();
    
    if (existingRank) {
      // Update existing rank
      const result = await prisma.employeeRank.updateMany(
        {
          where: { id: existingRank.id },
          data: {
            name,
            email,
            role,
            department,
            performanceScore: performanceScore || existingRank.performanceScore,
            attendance: attendance || existingRank.attendance,
            efficiency: efficiency || existingRank.efficiency,
            salesTarget: salesTarget || existingRank.salesTarget,
            salesAchieved: salesAchieved || existingRank.salesAchieved,
            customerRating: customerRating || existingRank.customerRating,
            points: points || existingRank.points,
            lastUpdated: now,
          },
        }
      );
      
      return NextResponse.json(
        { message: "Employee rank updated successfully", modifiedCount: result.count },
        { status: 200 }
      );
    } else {
      // Create new rank
      // Calculate initial rank based on performance (this will be updated later by rank calculation)
      const initialRank = performanceScore ? Math.max(1, Math.floor(100 - performanceScore)) : 50;
      
      const newRank: any = {
        userId: String(userId),
        name,
        email,
        role,
        department,
        performanceScore: performanceScore || 50,
        attendance: attendance || 100,
        efficiency: efficiency || 100,
        salesTarget,
        salesAchieved,
        customerRating: customerRating || 4.0,
        points: points || 0,
        rank: initialRank,
        lastUpdated: now,
        createdAt: now,
      };
      
      const created = await prisma.employeeRank.create({
        data: { id: randomUUID(), ...newRank },
      });
      
      return NextResponse.json(
        { message: "Employee rank created successfully", rank: { ...created, _id: created.id } },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("Error creating/updating employee rank:", error);
    return NextResponse.json(
      { message: "Error creating/updating employee rank", error: String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, userId, points, data } = body;
    
    if (!action || !userId) {
      return NextResponse.json(
        { message: "Action and userId are required" },
        { status: 400 }
      );
    }
    
    switch (action) {
      case "addPoints":
        if (!points) {
          return NextResponse.json(
            { message: "Points required for addPoints action" },
            { status: 400 }
          );
        }
        
        const pointResult = await prisma.employeeRank.updateMany(
          {
            where: { userId: String(userId) },
            data: {
              points: { increment: points },
              lastUpdated: new Date()
            }
          }
        );
        
        return NextResponse.json(
          { message: `Added ${points} points to employee`, modifiedCount: pointResult.count },
          { status: 200 }
        );
        
      case "updatePerformance":
        if (!data) {
          return NextResponse.json(
            { message: "Data required for updatePerformance action" },
            { status: 400 }
          );
        }
        
        const updateResult = await prisma.employeeRank.updateMany(
          {
            where: { userId: String(userId) },
            data: {
              ...data,
              lastUpdated: new Date()
            }
          }
        );
        
        return NextResponse.json(
          { message: "Performance updated successfully", modifiedCount: updateResult.count },
          { status: 200 }
        );
        
      default:
        return NextResponse.json(
          { message: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error updating employee rank:", error);
    return NextResponse.json(
      { message: "Error updating employee rank", error: String(error) },
      { status: 500 }
    );
  }
}
