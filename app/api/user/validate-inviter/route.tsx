import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    // Find referral record with this code
    // Referral codes are stored in the referrals table (code + email)
    const referralRecord = await prisma.referral.findFirst({
      where: { code }
    })

    const referrer = referralRecord?.email
      ? await prisma.user.findFirst({ where: { email: referralRecord.email } })
      : null

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
        id: referrer.id,
        name: referrer.name || `${(referrer as any).firstName || ''} ${(referrer as any).lastName || ''}`.trim() || 'A friend',
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
