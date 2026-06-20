// app/api/podcast-guests/route.ts
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

interface PodcastGuest {
  _id?: ObjectId
  serialNumber: number
  fullName: string
  workSector: string
  phoneNumber: string
  scheduledDate: string
  scheduledTime: string
  additionalNotes: string
  createdAt: Date
  updatedAt: Date
}

const DB_NAME = process.env.MONGODB_DB || 'retreat_management'
const COLLECTION = 'podcastGuests'

// GET - Fetch all podcast guests
export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const collection = db.collection(COLLECTION)
    
    const guests = await collection
      .find({})
      .sort({ serialNumber: 1 })
      .toArray()
    
    return NextResponse.json({
      success: true,
      data: guests,
      count: guests.length
    })
  } catch (error) {
    console.error("Error fetching podcast guests:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch podcast guests" },
      { status: 500 }
    )
  }
}

// POST - Create a new podcast guest
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const collection = db.collection(COLLECTION)
    
    // Validate required fields
    const requiredFields = ['fullName', 'phoneNumber']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }
    
    // Get the next serial number
    const lastGuest = await collection
      .find({})
      .sort({ serialNumber: -1 })
      .limit(1)
      .toArray()
    
    const nextSerialNumber = lastGuest.length > 0 
      ? lastGuest[0].serialNumber + 1 
      : 1
    
    // Create new guest
    const newGuest: PodcastGuest = {
      serialNumber: nextSerialNumber,
      fullName: body.fullName,
      workSector: body.workSector || '',
      phoneNumber: body.phoneNumber,
      scheduledDate: body.scheduledDate || '',
      scheduledTime: body.scheduledTime || '',
      additionalNotes: body.additionalNotes || '',
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    const result = await collection.insertOne(newGuest)
    
    return NextResponse.json({
      success: true,
      data: { ...newGuest, _id: result.insertedId },
      message: "Podcast guest created successfully"
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating podcast guest:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create podcast guest" },
      { status: 500 }
    )
  }
}

// PUT - Update a podcast guest (by ID in query)
export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing guest ID" },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const collection = db.collection(COLLECTION)
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid guest ID" },
        { status: 400 }
      )
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
    console.error("Error updating podcast guest:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update podcast guest" },
      { status: 500 }
    )
  }
}

// DELETE - Delete a podcast guest (by ID in query)
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    
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
    console.error("Error deleting podcast guest:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete podcast guest" },
      { status: 500 }
    )
  }
}