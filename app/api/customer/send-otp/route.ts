// app/api/customer/send-otp/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import nodemailer from 'nodemailer'

const MONGODB_URI = process.env.MONGODB_URI || 'your_mongodb_connection_string'
const client = new MongoClient(MONGODB_URI)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, firstName, lastName, address, referralCode } = body

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // Connect to MongoDB
    await client.connect()
    const db = client.db('restaurant_db')
    const otpCollection = db.collection('otps')

    // Store OTP
    await otpCollection.insertOne({
      email,
      otp,
      firstName,
      lastName,
      address,
      referralCode,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    })

    // Send email (configure email service)
    // const transporter = nodemailer.createTransport({
    //   service: 'gmail',
    //   auth: {
    //     user: process.env.EMAIL_USER,
    //     pass: process.env.EMAIL_PASS
    //   }
    // })

    // await transporter.sendMail({
    //   from: process.env.EMAIL_USER,
    //   to: email,
    //   subject: 'Your OTP Code',
    //   text: `Your OTP is: ${otp}`
    // })

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      otp: otp // Remove in production!
    })

  } catch (error) {
    console.error('Error sending OTP:', error)
    return NextResponse.json(
      { error: 'Failed to send OTP' },
      { status: 500 }
    )
  } finally {
    await client.close()
  }
}