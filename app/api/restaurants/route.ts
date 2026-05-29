// app/api/restaurants/route.ts
import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

// GET - Fetch all restaurants
export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db('restaurant_db')
    const collection = db.collection('restaurants')

    const restaurants = await collection
      .find({})
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json({
      success: true,
      data: restaurants
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
    const client = await clientPromise
    const db = client.db('restaurant_db')
    const collection = db.collection('restaurants')

    const body = await request.json()
    const { name, description, address, phone, email, website, cuisine, isActive } = body

    // Validation
    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Restaurant name is required (min 2 characters)' },
        { status: 400 }
      )
    }

    // Check for duplicate
    const existing = await collection.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A restaurant with this name already exists' },
        { status: 409 }
      )
    }

    const now = new Date()
    const restaurant = {
      name: name.trim(),
      description: description?.trim() || '',
      address: address?.trim() || '',
      phone: phone?.trim() || '',
      email: email?.trim() || '',
      website: website?.trim() || '',
      cuisine: Array.isArray(cuisine) ? cuisine : [],
      isActive: isActive !== undefined ? isActive : true,
      createdAt: now,
      updatedAt: now
    }

    const result = await collection.insertOne(restaurant)

    return NextResponse.json({
      success: true,
      message: 'Restaurant created successfully',
      data: { ...restaurant, _id: result.insertedId }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating restaurant:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create restaurant' },
      { status: 500 }
    )
  }
}
