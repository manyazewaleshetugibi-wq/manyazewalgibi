// app/api/podcastandentenfs/other-contacts/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { randomUUID } from "crypto"

// GET - Fetch all other contacts
export async function GET() {
  try {
    const contacts = await prisma.otherContact.findMany({
      orderBy: { serialNumber: 'asc' }
    })
    
    return NextResponse.json({
      success: true,
      data: contacts.map(contact => ({ ...contact, _id: contact.id })),
      count: contacts.length
    })
  } catch (error) {
    console.error("Error fetching other contacts:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch other contacts" },
      { status: 500 }
    )
  }
}

// POST - Create a new other contact
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    const requiredFields = ['fullName', 'phoneNumber', 'reasonForCall', 'callType']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }
    
    // Validate call type
    const validCallTypes = ['Prayer', 'Counseling', 'Information', 'Complaint', 'Suggestion', 'Testimony', 'Other']
    if (!validCallTypes.includes(body.callType)) {
      return NextResponse.json(
        { success: false, error: "Invalid call type. Must be one of: Prayer, Counseling, Information, Complaint, Suggestion, Testimony, Other" },
        { status: 400 }
      )
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
    
    // Get the next serial number
    const lastContact = await prisma.otherContact.findFirst({
      orderBy: { serialNumber: 'desc' }
    })
    
    const nextSerialNumber = lastContact
      ? (lastContact.serialNumber ?? 0) + 1
      : 1
    
    // Create new contact
    const result = await prisma.otherContact.create({
      data: {
        id: randomUUID(),
        serialNumber: nextSerialNumber,
        fullName: body.fullName,
        phoneNumber: body.phoneNumber,
        email: body.email || '',
        location: body.location || '',
        reasonForCall: body.reasonForCall,
        callType: body.callType,
        message: body.message || '',
        followUpNeeded: body.followUpNeeded || false,
        followUpDate: body.followUpDate || '',
        status: body.status || 'New',
        notes: body.notes || '',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    
    return NextResponse.json({
      success: true,
      data: { ...result, _id: result.id },
      message: "Contact created successfully"
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating other contact:", error)
    return NextResponse.json(
      { success: false, error: "Failed to create other contact" },
      { status: 500 }
    )
  }
}

// PUT - Update an other contact (by ID in query)
export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing contact ID" },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    
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
    
    const result = await prisma.otherContact.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    })
    
    return NextResponse.json({
      success: true,
      data: { ...result, _id: result.id },
      message: "Contact updated successfully"
    })
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: "Contact not found" },
        { status: 404 }
      )
    }
    console.error("Error updating other contact:", error)
    return NextResponse.json(
      { success: false, error: "Failed to update other contact" },
      { status: 500 }
    )
  }
}

// DELETE - Delete an other contact (by ID in query)
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing contact ID" },
        { status: 400 }
      )
    }
    
    const result = await prisma.otherContact.deleteMany({ where: { id } })
    
    if (result.count === 0) {
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
    console.error("Error deleting other contact:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete other contact" },
      { status: 500 }
    )
  }
}
