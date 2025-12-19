// app/api/employee-rank/route.ts
import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const COLLECTION_NAME = "employee_rank";

export interface EmployeeRank {
  _id: ObjectId;
  userId: ObjectId;
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
    const client = await clientPromise;
    const db = client.db("gold");
    
    const { searchParams } = new URL(req.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 10;
    const department = searchParams.get("department");
    
    let query: any = {};
    if (department) {
      query.department = department;
    }
    
    // Get employee ranks sorted by rank (ascending - 1 is best)
    const employeeRanks = await db.collection<EmployeeRank>(COLLECTION_NAME)
      .find(query)
      .sort({ rank: 1 })
      .limit(limit)
      .toArray();
    
    return NextResponse.json(employeeRanks, { status: 200 });
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

    const client = await clientPromise;
    const db = client.db("gold");
    
    // Check if employee rank already exists for this user
    const existingRank = await db.collection<EmployeeRank>(COLLECTION_NAME).findOne({
      userId: new ObjectId(userId)
    });
    
    const now = new Date();
    
    if (existingRank) {
      // Update existing rank
      const result = await db.collection<EmployeeRank>(COLLECTION_NAME).updateOne(
        { _id: existingRank._id },
        {
          $set: {
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
        { message: "Employee rank updated successfully", modifiedCount: result.modifiedCount },
        { status: 200 }
      );
    } else {
      // Create new rank
      // Calculate initial rank based on performance (this will be updated later by rank calculation)
      const initialRank = performanceScore ? Math.max(1, Math.floor(100 - performanceScore)) : 50;
      
      const newRank: EmployeeRank = {
        _id: new ObjectId(),
        userId: new ObjectId(userId),
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
      
      await db.collection<EmployeeRank>(COLLECTION_NAME).insertOne(newRank);
      
      return NextResponse.json(
        { message: "Employee rank created successfully", rank: newRank },
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
    
    const client = await clientPromise;
    const db = client.db("gold");
    
    switch (action) {
      case "addPoints":
        if (!points) {
          return NextResponse.json(
            { message: "Points required for addPoints action" },
            { status: 400 }
          );
        }
        
        const pointResult = await db.collection<EmployeeRank>(COLLECTION_NAME).updateOne(
          { userId: new ObjectId(userId) },
          { 
            $inc: { points: points },
            $set: { lastUpdated: new Date() }
          }
        );
        
        return NextResponse.json(
          { message: `Added ${points} points to employee`, modifiedCount: pointResult.modifiedCount },
          { status: 200 }
        );
        
      case "updatePerformance":
        if (!data) {
          return NextResponse.json(
            { message: "Data required for updatePerformance action" },
            { status: 400 }
          );
        }
        
        const updateResult = await db.collection<EmployeeRank>(COLLECTION_NAME).updateOne(
          { userId: new ObjectId(userId) },
          { 
            $set: {
              ...data,
              lastUpdated: new Date()
            }
          }
        );
        
        return NextResponse.json(
          { message: "Performance updated successfully", modifiedCount: updateResult.modifiedCount },
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