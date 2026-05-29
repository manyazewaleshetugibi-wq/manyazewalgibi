import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code || code.length < 4) {
      return NextResponse.json(
        { 
          success: false, 
          valid: false,
          message: 'Invalid code format' 
        },
        { status: 400 }
      )
    }

    // Connect to MongoDB
    const client = await clientPromise
    const db = client.db()

    // Find user with this referral code
    // Assuming referral codes are stored in a field called 'referralCode'
    const usersCollection = db.collection('users')
    const referrer = await usersCollection.findOne({ 
      $or: [
        { referralCode: code },
        { inviterCode: code },
        { 'referralInfo.code': code }
      ]
    })

    if (!referrer) {
      return NextResponse.json({
        success: true,
        valid: false,
        message: 'Invalid referral code'
      })
    }

    // Don't allow self-referral (but we can't check this without the new user's info)
    
    return NextResponse.json({
      success: true,
      valid: true,
      referrer: {
        id: referrer._id.toString(),
        name: `${referrer.firstName || ''} ${referrer.lastName || ''}`.trim() || 'A friend',
        code: code
      }
    })

  } catch (error) {
    console.error('Error validating inviter code:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        valid: false,
        message: 'Failed to validate code' 
      },
      { status: 500 }
    )
  }
}
