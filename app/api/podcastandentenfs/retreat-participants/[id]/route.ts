// app/api/podcastandentenfs/retreat-participants/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

const DB_NAME = process.env.MONGODB_DB || 'retreat_management'
const COLLECTION = 'retreatParticipants'

// GET - Fetch a single retreat participant by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing participant ID" },
        { status: 400 }
      )
    }
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid participant ID" },
        { status: 400 }
      )
    }
    
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const collection = db.collection(COLLECTION)
    
    const participant = await collection.findOne({ _id: new ObjectId(id) })
    
    if (!participant) {
      return NextResponse.json(
        { success: false, error: "Participant not found" },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: participant
    })
  } catch (error) {
    console.error("Error fetching participant:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch participant" },
      { status: 500 }
    )
  }
}

// PUT - Update a retreat participant by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing participant ID" },
        { status: 400 }
      )
    }
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid participant ID" },
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
        { success: false, error: "Participant not found" },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: result,
      message: "Participant updated successfully"
    })
  } catch (error) {
    console.error("Error updating participant:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update participant" },
      { status: 500 }
    )
  }
}

// DELETE - Delete a retreat participant by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing participant ID" },
        { status: 400 }
      )
    }
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid participant ID" },
        { status: 400 }
      )
    }
    
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const collection = db.collection(COLLECTION)
    
    const result = await collection.deleteOne({ _id: new ObjectId(id) })
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Participant not found" },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: "Participant deleted successfully"
    })
  } catch (error) {
    console.error("Error deleting participant:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete participant" },
      { status: 500 }
    )
  }
}