// app/api/podcastandentenfs/podcast-guests/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { randomUUID } from "crypto"

// GET - Fetch all podcast guests
export async function GET() {
  try {
    const guests = await prisma.podcastGuest.findMany({
      orderBy: { serialNumber: 'asc' }
    })
    
    return NextResponse.json({
      success: true,
      data: guests.map(guest => ({ ...guest, _id: guest.id })),
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
    const lastGuest = await prisma.podcastGuest.findFirst({
      orderBy: { serialNumber: 'desc' }
    })
    
    const nextSerialNumber = lastGuest
      ? (lastGuest.serialNumber ?? 0) + 1
      : 1
    
    // Create new guest
    const result = await prisma.podcastGuest.create({
      data: {
        id: randomUUID(),
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
    })
    
    return NextResponse.json({
      success: true,
      data: { ...result, _id: result.id },
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
    
    // Remove fields that shouldn't be updated
    const { _id, serialNumber, createdAt, ...updateData } = body
    
    const result = await prisma.podcastGuest.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    })
    
    return NextResponse.json({
      success: true,
      data: { ...result, _id: result.id },
      message: "Podcast guest updated successfully"
    })
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: "Podcast guest not found" },
        { status: 404 }
      )
    }
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
    
    const result = await prisma.podcastGuest.deleteMany({ where: { id } })
    
    if (result.count === 0) {
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
