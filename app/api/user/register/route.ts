import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import clientPromise from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import type { IUser } from '@/models/customer'

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      birthDate,
      gender,
      address,
      location,
      registrationSource = 'website',
      locationConsent = false
    } = body

    // Validate required fields
    if (!firstName || !lastName || !password || !birthDate || !address) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'First name, last name, password, birth date, and address are required' 
        },
        { status: 400 }
      )
    }

    // Validate at least one contact method
    if (!email && !phone) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Either email or phone number is required' 
        },
        { status: 400 }
      )
    }

    // Connect to MongoDB
    const client = await clientPromise
    const db = client.db() // Get the default database

    // Check if user exists by email or phone
    const usersCollection = db.collection('users')
    
    // Check for existing user by email or phone
    const existingUser = await usersCollection.findOne({
      $or: [
        ...(email ? [{ email }] : []),
        ...(phone ? [{ phone }] : [])
      ]
    })

    if (existingUser) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'User with this email or phone already exists' 
        },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create new user document
    const newUser: IUser = {
      _id: new ObjectId(),
      firstName,
      lastName,
      email: email || null,
      phone: phone || null,
      password: hashedPassword,
      birthDate: new Date(birthDate),
      gender: gender || 'male',
      address,
      location: location || {
        coordinates: null,
        address: '',
        city: '',
        country: ''
      },
      role: 'user',
      registrationSource,
      locationConsent,
      createdAt: new Date(),
      updatedAt: new Date(),
      __v: 0
    }

    // Insert user into database
    const result = await usersCollection.insertOne(newUser)

    // Remove password from response
    const { password: _, ...userResponse } = newUser

    return NextResponse.json(
      { 
        success: true, 
        message: 'User registered successfully',
        user: userResponse,
        userId: result.insertedId
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Registration error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    )
  }
}