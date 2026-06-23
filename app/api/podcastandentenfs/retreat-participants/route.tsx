// app/api/retreat-participants/route.ts
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

// Define the schema for a retreat participant
interface RetreatParticipant {
  _id?: ObjectId
  serialNumber: number
  fullName: string
  phoneNumber: string
  paymentStatus: 'Paid' | 'Partial' | 'Pending'
  paymentApp: string
  specialNeeds: string
  attendanceStatus: 'Attended' | 'Absent' | 'Partial' | 'Pending'
  residence: string
  createdAt: Date
  updatedAt: Date
}

const DB_NAME = process.env.MONGODB_DB || 'retreat_management'
const COLLECTION = 'retreatParticipants'

// GET - Fetch all retreat participants
export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const collection = db.collection(COLLECTION)
    
    const participants = await collection
      .find({})
      .sort({ serialNumber: 1 })
      .toArray()
    
    return NextResponse.json({
      success: true,
      data: participants,
      count: participants.length
    })
  } catch (error) {
    console.error("Error fetching retreat participants:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch retreat participants" },
      { status: 500 }
    )
  }
}

// POST - Create a new retreat participant
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
    const lastParticipant = await collection
      .find({})
      .sort({ serialNumber: -1 })
      .limit(1)
      .toArray()
    
    const nextSerialNumber = lastParticipant.length > 0 
      ? lastParticipant[0].serialNumber + 1 
      : 1
    
    // Create new participant
    const newParticipant: RetreatParticipant = {
      serialNumber: nextSerialNumber,
      fullName: body.fullName,
      phoneNumber: body.phoneNumber,
      paymentStatus: body.paymentStatus || 'Pending',
      paymentApp: body.paymentApp || '',
      specialNeeds: body.specialNeeds || '',
      attendanceStatus: body.attendanceStatus || 'Pending',
      residence: body.residence || '',
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    const result = await collection.insertOne(newParticipant)
    
    return NextResponse.json({
      success: true,
      data: { ...newParticipant, _id: result.insertedId },
      message: "Participant created successfully"
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating retreat participant:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create retreat participant" },
      { status: 500 }
    )
  }
}

// PUT - Update a retreat participant (by ID in query)
export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing participant ID" },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const collection = db.collection(COLLECTION)
    
    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid participant ID" },
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
    console.error("Error updating retreat participant:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update retreat participant" },
      { status: 500 }
    )
  }
}

// DELETE - Delete a retreat participant (by ID in query)
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    
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
    console.error("Error deleting retreat participant:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete retreat participant" },
      { status: 500 }
    )
  }
}