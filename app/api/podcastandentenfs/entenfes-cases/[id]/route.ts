// app/api/podcastandentenfs/entenfes-cases/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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
    
    const caseItem = await prisma.entenfisCase.findFirst({ where: { id } })
    
    if (!caseItem) {
      return NextResponse.json(
        { success: false, error: "Entenfes case not found" },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: { ...caseItem, _id: caseItem.id }
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
    
    const body = await request.json()
    
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
    
    const result = await prisma.entenfisCase.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    })
    
    return NextResponse.json({
      success: true,
      data: { ...result, _id: result.id },
      message: "Entenfes case updated successfully"
    })
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: "Entenfes case not found" },
        { status: 404 }
      )
    }
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
    
    const result = await prisma.entenfisCase.deleteMany({ where: { id } })
    
    if (result.count === 0) {
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
