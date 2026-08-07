// app/api/restaurants/[id]/route.ts (UPDATED - with location support)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch single restaurant
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const restaurant = await prisma.restaurant.findUnique({ where: { id } })

    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: 'Restaurant not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: restaurant
    })

  } catch (error) {
    console.error('Error fetching restaurant:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch restaurant' },
      { status: 500 }
    )
  }
}

// PUT - Update restaurant
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const body = await request.json()
    const { 
      name, 
      description, 
      address, 
      phone, 
      email, 
      website, 
      cuisine, 
      location,
      isActive 
    } = body

    // Validation
    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Restaurant name is required (min 2 characters)' },
        { status: 400 }
      )
    }

    // Check for duplicate name (excluding current restaurant)
    const existing = await prisma.restaurant.findFirst({
      where: {
        id: { not: id },
        name: { contains: name.trim(), mode: 'insensitive' }
      }
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A restaurant with this name already exists' },
        { status: 409 }
      )
    }

    const updateData: any = {
      name: name.trim(),
      description: description?.trim() || '',
      address: address?.trim() || '',
      phone: phone?.trim() || '',
      email: email?.trim() || '',
      website: website?.trim() || '',
      cuisine: Array.isArray(cuisine) ? cuisine : (cuisine ? [cuisine] : []),
      isActive: isActive !== undefined ? isActive : true,
      updatedAt: new Date()
    }

    // Add location if provided
    if (location) {
      updateData.location = {
        lat: location.lat ? parseFloat(location.lat) : null,
        lng: location.lng ? parseFloat(location.lng) : null,
        address: address?.trim() || '',
        updatedAt: new Date()
      }
    } else if (location === null) {
      // If location is explicitly set to null, remove it
      updateData.location = null
    }

    try {
      await prisma.restaurant.update({ where: { id }, data: updateData })
    } catch (e: any) {
      if (e?.code === 'P2025') {
        return NextResponse.json(
          { success: false, error: 'Restaurant not found' },
          { status: 404 }
        )
      }
      throw e
    }

    return NextResponse.json({
      success: true,
      message: 'Restaurant updated successfully',
      data: updateData
    })

  } catch (error) {
    console.error('Error updating restaurant:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update restaurant' },
      { status: 500 }
    )
  }
}

// PATCH - Partial update (toggle status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const body = await request.json()
    const { isActive } = body

    try {
      await prisma.restaurant.update({
        where: { id },
        data: { 
          isActive: isActive,
          updatedAt: new Date()
        }
      })
    } catch (e: any) {
      if (e?.code === 'P2025') {
        return NextResponse.json(
          { success: false, error: 'Restaurant not found' },
          { status: 404 }
        )
      }
      throw e
    }

    return NextResponse.json({
      success: true,
      message: `Restaurant ${isActive ? 'activated' : 'deactivated'} successfully`
    })

  } catch (error) {
    console.error('Error updating restaurant status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update restaurant status' },
      { status: 500 }
    )
  }
}

// DELETE - Delete restaurant
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const result = await prisma.restaurant.deleteMany({ where: { id } })

    if (result.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Restaurant not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Restaurant deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting restaurant:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete restaurant' },
      { status: 500 }
    )
  }
}
