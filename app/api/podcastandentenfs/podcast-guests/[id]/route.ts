// app/api/podcastandentenfs/podcast-guests/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

const DB_NAME = process.env.MONGODB_DB || 'retreat_management'
const COLLECTION = 'podcastGuests'

// GET - Fetch a single podcast guest by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing guest ID" },
        { status: 400 }
      )
    }
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid guest ID" },
        { status: 400 }
      )
    }
    
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const collection = db.collection(COLLECTION)
    
    const guest = await collection.findOne({ _id: new ObjectId(id) })
    
    if (!guest) {
      return NextResponse.json(
        { success: false, error: "Podcast guest not found" },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: guest
    })
  } catch (error) {
    console.error("Error fetching guest:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch guest" },
      { status: 500 }
    )
  }
}

// PUT - Update a podcast guest by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing guest ID" },
        { status: 400 }
      )
    }
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid guest ID" },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const collection = db.collection(COLLECTION)
    
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
        { success: false, error: "Podcast guest not found" },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: result,
      message: "Podcast guest updated successfully"
    })
  } catch (error) {
    console.error("Error updating guest:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update guest" },
      { status: 500 }
    )
  }
}

// DELETE - Delete a podcast guest by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing guest ID" },
        { status: 400 }
      )
    }
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid guest ID" },
        { status: 400 }
      )
    }
    
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const collection = db.collection(COLLECTION)
    
    const result = await collection.deleteOne({ _id: new ObjectId(id) })
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Podcast guest not found" },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: "Podcast guest deleted successfully"
    })
  } catch (error) {
    console.error("Error deleting guest:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete guest" },
      { status: 500 }
    )
  }
}