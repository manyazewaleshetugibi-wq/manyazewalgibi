// app/api/customer/verify-otp/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI
const client = new MongoClient(MONGODB_URI)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, otp, firstName, lastName, address, referralCode } = body

    // Connect to MongoDB
    await client.connect()
    const db = client.db('restaurant_db')
    const otpCollection = db.collection('otps')
    const usersCollection = db.collection('users')

    // Verify OTP
    const otpRecord = await otpCollection.findOne({
      email,
      otp,
      expiresAt: { $gt: new Date() }
    })

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      )
    }

    // Generate referral code for new user
    const userReferralCode = `REF_${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Create user
    const user = {
      email,
      firstName,
      lastName,
      address,
      location: body.location || {},
      referralCode: userReferralCode,
      referredBy: referralCode || null,
      role: 'USER',
      points: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email })
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    // Insert user
    const result = await usersCollection.insertOne(user)

    // Award referral points if applicable
    if (referralCode) {
      const referrer = await usersCollection.findOne({ referralCode })
      if (referrer) {
        await usersCollection.updateOne(
          { _id: referrer._id },
          { $inc: { points: 0.10 } }
        )
      }
    }

    // Delete used OTP
    await otpCollection.deleteOne({ _id: otpRecord._id })

    return NextResponse.json({
      success: true,
      message: 'Registration successful',
      user: {
        id: result.insertedId,
        email,
        firstName,
        lastName,
        referralCode: userReferralCode,
        points: 0
      }
    })

  } catch (error) {
    console.error('Error verifying OTP:', error)
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  } finally {
    await client.close()
  }
}