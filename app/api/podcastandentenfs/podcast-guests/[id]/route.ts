// app/api/podcastandentenfs/podcast-guests/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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
    
    const guest = await prisma.podcastGuest.findFirst({ where: { id } })
    
    if (!guest) {
      return NextResponse.json(
        { success: false, error: "Podcast guest not found" },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: { ...guest, _id: guest.id }
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
    console.error("Error deleting guest:", error)
    return NextResponse.json(
      { success: false, error: "Failed to delete guest" },
      { status: 500 }
    )
  }
}
