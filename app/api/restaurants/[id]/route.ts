// app/api/restaurants/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

// GET - Fetch single restaurant
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid restaurant ID' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db('restaurant_db')
    const collection = db.collection('restaurants')

    const restaurant = await collection.findOne({ _id: new ObjectId(id) })

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
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid restaurant ID' },
        { status: 400 }
      )
    }

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

    // Check for duplicate name (excluding current restaurant)
    const existing = await collection.findOne({
      _id: { $ne: new ObjectId(id) },
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A restaurant with this name already exists' },
        { status: 409 }
      )
    }

    const updateData = {
      name: name.trim(),
      description: description?.trim() || '',
      address: address?.trim() || '',
      phone: phone?.trim() || '',
      email: email?.trim() || '',
      website: website?.trim() || '',
      cuisine: Array.isArray(cuisine) ? cuisine : [],
      isActive: isActive !== undefined ? isActive : true,
      updatedAt: new Date()
    }

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Restaurant not found' },
        { status: 404 }
      )
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
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid restaurant ID' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db('restaurant_db')
    const collection = db.collection('restaurants')

    const body = await request.json()
    const { isActive } = body

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          isActive: isActive,
          updatedAt: new Date()
        } 
      }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Restaurant not found' },
        { status: 404 }
      )
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
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid restaurant ID' },
        { status: 400 }
      )
    }

    const client = await clientPromise
    const db = client.db('restaurant_db')
    const collection = db.collection('restaurants')

    const result = await collection.deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
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