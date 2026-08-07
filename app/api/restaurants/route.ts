// app/api/restaurants/route.ts (UPDATED - with location support)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

// GET - Fetch all restaurants
export async function GET() {
  try {
    const restaurants = await prisma.restaurant.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      data: restaurants.map((r: any) => ({ ...r, _id: r.id }))
    })

  } catch (error) {
    console.error('Error fetching restaurants:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch restaurants' },
      { status: 500 }
    )
  }
}

// POST - Create new restaurant
export async function POST(request: NextRequest) {
  try {
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

    // Check for duplicate
    const existing = await prisma.restaurant.findFirst({
      where: {
        name: { contains: name.trim(), mode: 'insensitive' }
      }
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A restaurant with this name already exists' },
        { status: 409 }
      )
    }

    const now = new Date()
    
    // Prepare location data if provided
    let locationData = null
    if (location && (location.lat || location.lng)) {
      locationData = {
        lat: location.lat ? parseFloat(location.lat) : null,
        lng: location.lng ? parseFloat(location.lng) : null,
        address: address?.trim() || '',
        capturedAt: now
      }
    }

    const restaurant: any = {
      name: name.trim(),
      description: description?.trim() || '',
      address: address?.trim() || '',
      phone: phone?.trim() || '',
      email: email?.trim() || '',
      website: website?.trim() || '',
      cuisine: Array.isArray(cuisine) ? cuisine : (cuisine ? [cuisine] : []),
      location: locationData,
      isActive: isActive !== undefined ? isActive : true,
      createdAt: now,
      updatedAt: now
    }

    const result = await prisma.restaurant.create({
      data: {
        id: randomUUID(),
        ...restaurant,
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Restaurant created successfully',
      data: { ...restaurant, _id: result.id }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating restaurant:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create restaurant' },
      { status: 500 }
    )
  }
}
