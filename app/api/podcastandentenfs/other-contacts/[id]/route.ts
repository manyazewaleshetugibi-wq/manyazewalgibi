// app/api/podcastandentenfs/other-contacts/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

const DB_NAME = process.env.MONGODB_DB || 'retreat_management'
const COLLECTION = 'otherContacts'

// GET - Fetch a single other contact by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing contact ID" },
        { status: 400 }
      )
    }
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid contact ID" },
        { status: 400 }
      )
    }
    
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const collection = db.collection(COLLECTION)
    
    const contact = await collection.findOne({ _id: new ObjectId(id) })
    
    if (!contact) {
      return NextResponse.json(
        { success: false, error: "Contact not found" },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: contact
    })
  } catch (error) {
    console.error("Error fetching contact:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch contact" },
      { status: 500 }
    )
  }
}

// PUT - Update an other contact by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing contact ID" },
        { status: 400 }
      )
    }
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid contact ID" },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const collection = db.collection(COLLECTION)
    
    // Validate call type if provided
    if (body.callType) {
      const validCallTypes = ['Prayer', 'Counseling', 'Information', 'Complaint', 'Suggestion', 'Testimony', 'Other']
      if (!validCallTypes.includes(body.callType)) {
        return NextResponse.json(
          { success: false, error: "Invalid call type. Must be one of: Prayer, Counseling, Information, Complaint, Suggestion, Testimony, Other" },
          { status: 400 }
        )
      }
    }
    
    // Validate status if provided
    if (body.status) {
      const validStatuses = ['New', 'InProgress', 'FollowedUp', 'Resolved', 'Closed']
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { success: false, error: "Invalid status. Must be one of: New, InProgress, FollowedUp, Resolved, Closed" },
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
        { success: false, error: "Contact not found" },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: result,
      message: "Contact updated successfully"
    })
  } catch (error) {
    console.error("Error updating contact:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update contact" },
      { status: 500 }
    )
  }
}

// DELETE - Delete an other contact by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing contact ID" },
        { status: 400 }
      )
    }
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid contact ID" },
        { status: 400 }
      )
    }
    
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const collection = db.collection(COLLECTION)
    
    const result = await collection.deleteOne({ _id: new ObjectId(id) })
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Contact not found" },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      message: "Contact deleted successfully"
    })
  } catch (error) {
    console.error("Error deleting contact:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete contact" },
      { status: 500 }
    )
  }
}