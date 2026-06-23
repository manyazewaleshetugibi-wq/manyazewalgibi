// app/api/podcastandentenfs/entenfes-cases/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

const DB_NAME = process.env.MONGODB_DB || 'retreat_management'
const COLLECTION = 'entenfesCases'

// GET - Fetch a single Entenfes case by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing case ID" },
        { status: 400 }
      )
    }
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid case ID" },
        { status: 400 }
      )
    }
    
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const collection = db.collection(COLLECTION)
    
    const caseItem = await collection.findOne({ _id: new ObjectId(id) })
    
    if (!caseItem) {
      return NextResponse.json(
        { success: false, error: "Entenfes case not found" },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: caseItem
    })
  } catch (error) {
    console.error("Error fetching case:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch case" },
      { status: 500 }
    )
  }
}

// PUT - Update an Entenfes case by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing case ID" },
        { status: 400 }
      )
    }
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid case ID" },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const collection = db.collection(COLLECTION)
    
    // Validate category if provided
    if (body.category) {
      const validCategories = ['Family', 'Work', 'Health', 'Financial', 'Spiritual', 'Other']
      if (!validCategories.includes(body.category)) {
        return NextResponse.json(
          { success: false, error: "Invalid category. Must be one of: Family, Work, Health, Financial, Spiritual, Other" },
          { status: 400 }
        )
      }
    }
    
    // Validate priority if provided
    if (body.priority) {
      const validPriorities = ['High', 'Medium', 'Low']
      if (!validPriorities.includes(body.priority)) {
        return NextResponse.json(
          { success: false, error: "Invalid priority. Must be one of: High, Medium, Low" },
          { status: 400 }
        )
      }
    }
    
    // Validate status if provided
    if (body.status) {
      const validStatuses = ['Called', 'AppointmentScheduled', 'InProgress', 'Resolved', 'Pending']
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { success: false, error: "Invalid status. Must be one of: Called, AppointmentScheduled, InProgress, Resolved, Pending" },
          { status: 400 }
        )
      }
    }
    
    // Remove fields that shouldn't be updated
    const { _id, serialNumber, createdAt, ...updateData } = body
    
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          ...updateData,
          updatedAt: new Date()
        } 
      },
      { returnDocument: 'after' }
    )
    
    if (!result) {
      return NextResponse.json(
        { success: false, error: "Entenfes case not found" },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: result,
      message: "Entenfes case updated successfully"
    })
  } catch (error) {
    console.error("Error updating case:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update case" },
      { status: 500 }
    )
  }
}

// DELETE - Delete an Entenfes case by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing case ID" },
        { status: 400 }
      )
    }
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid case ID" },
        { status: 400 }
      )
    }
    
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const collection = db.collection(COLLECTION)
    
    const result = await collection.deleteOne({ _id: new ObjectId(id) })
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Entenfes case not found" },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: "Entenfes case deleted successfully"
    })
  } catch (error) {
    console.error("Error deleting case:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete case" },
      { status: 500 }
    )
  }
}