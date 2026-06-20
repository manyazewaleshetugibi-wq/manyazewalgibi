// app/api/entenfes-cases/route.ts
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

interface EntenfesCase {
  _id?: ObjectId
  serialNumber: number
  userName: string
  phoneNumber: string
  category: 'Family' | 'Work' | 'Health' | 'Financial' | 'Spiritual' | 'Other'
  summary: string
  priority: 'High' | 'Medium' | 'Low'
  status: 'Called' | 'AppointmentScheduled' | 'InProgress' | 'Resolved' | 'Pending'
  createdAt: Date
  updatedAt: Date
}

const DB_NAME = process.env.MONGODB_DB || 'retreat_management'
const COLLECTION = 'entenfesCases'

// GET - Fetch all Entenfes cases
export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const collection = db.collection(COLLECTION)
    
    const cases = await collection
      .find({})
      .sort({ serialNumber: 1 })
      .toArray()
    
    return NextResponse.json({
      success: true,
      data: cases,
      count: cases.length
    })
  } catch (error) {
    console.error("Error fetching Entenfes cases:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch Entenfes cases" },
      { status: 500 }
    )
  }
}

// POST - Create a new Entenfes case
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const collection = db.collection(COLLECTION)
    
    // Validate required fields
    const requiredFields = ['userName', 'phoneNumber', 'category', 'priority']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }
    
    // Validate category
    const validCategories = ['Family', 'Work', 'Health', 'Financial', 'Spiritual', 'Other']
    if (!validCategories.includes(body.category)) {
      return NextResponse.json(
        { success: false, error: "Invalid category. Must be one of: Family, Work, Health, Financial, Spiritual, Other" },
        { status: 400 }
      )
    }
    
    // Validate priority
    const validPriorities = ['High', 'Medium', 'Low']
    if (!validPriorities.includes(body.priority)) {
      return NextResponse.json(
        { success: false, error: "Invalid priority. Must be one of: High, Medium, Low" },
        { status: 400 }
      )
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
    
    // Get the next serial number
    const lastCase = await collection
      .find({})
      .sort({ serialNumber: -1 })
      .limit(1)
      .toArray()
    
    const nextSerialNumber = lastCase.length > 0 
      ? lastCase[0].serialNumber + 1 
      : 1
    
    // Create new case
    const newCase: EntenfesCase = {
      serialNumber: nextSerialNumber,
      userName: body.userName,
      phoneNumber: body.phoneNumber,
      category: body.category,
      summary: body.summary || '',
      priority: body.priority,
      status: body.status || 'Pending',
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    const result = await collection.insertOne(newCase)
    
    return NextResponse.json({
      success: true,
      data: { ...newCase, _id: result.insertedId },
      message: "Entenfes case created successfully"
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating Entenfes case:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create Entenfes case" },
      { status: 500 }
    )
  }
}

// PUT - Update an Entenfes case (by ID in query)
export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing case ID" },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    const client = await clientPromise
    const db = client.db(DB_NAME)
    const collection = db.collection(COLLECTION)
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid case ID" },
        { status: 400 }
      )
    }
    
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
    console.error("Error updating Entenfes case:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update Entenfes case" },
      { status: 500 }
    )
  }
}

// DELETE - Delete an Entenfes case (by ID in query)
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    
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
    console.error("Error deleting Entenfes case:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete Entenfes case" },
      { status: 500 }
    )
  }
}