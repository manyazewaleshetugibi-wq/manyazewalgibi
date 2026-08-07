import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { nanoid } from 'nanoid';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email;
    

    
    // Check if user already has a referral code
    const existingUser = await prisma.user.findFirst({ 
      where: { 
        OR: [
          { id: userId },
          { email: userEmail }
        ]
      }
    });
    
    if (!existingUser) {

      return NextResponse.json(
        { 
          success: false,
          error: 'User not found' 
        },
        { status: 404 }
      );
    }
    
    // Check if user already has a referral code
    const existingReferralRecord = await prisma.referral.findFirst({ where: { email: userEmail } });
    const existingCode = (existingUser as any).referralCode || (existingUser as any).profile?.referralCode || existingReferralRecord?.code;
    if (existingCode) {
      const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      

      
      return NextResponse.json({
        success: true,
        referralCode: existingCode,
        referralLink: `${baseUrl}/register?ref=${existingCode}`,
        message: 'Referral code already exists',
        existing: true
      });
    }
    
    // Generate a unique referral code
    const generateUniqueCode = async (): Promise<string> => {
      let isUnique = false;
      let code = '';
      let attempts = 0;
      const maxAttempts = 10;
      
      while (!isUnique && attempts < maxAttempts) {
        code = `REF-${nanoid(8).toUpperCase()}`;
        
        // Check if code already exists in database
        const existingUserWithCode = await prisma.referral.findFirst({ 
          where: { code }
        });
        
        if (!existingUserWithCode) {
          isUnique = true;
        }
        
        attempts++;
      }
      
      if (!isUnique) {
        throw new Error('Failed to generate unique referral code after multiple attempts');
      }
      
      return code;
    };
    
    const referralCode = await generateUniqueCode();

    
    // Update user document timestamp
    const updateResult = await prisma.user.updateMany({ where: { id: userId }, data: { updatedAt: new Date() } });
    
    if (updateResult.count === 0) {
      // Try updating by email if ID update failed
      const emailUpdateResult = await prisma.user.updateMany({ where: { email: userEmail }, data: { updatedAt: new Date() } });
      
      if (emailUpdateResult.count === 0) {
        throw new Error('Failed to update user with referral code');
      }
    }
    

    
    // Create or update referral tracking record
    try {
      if (!existingReferralRecord) {
        await prisma.referral.create({
          data: {
            id: randomUUID(),
            email: userEmail,
            code: referralCode,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        });

      } else {
        await prisma.referral.updateMany({ where: { email: userEmail }, data: { code: referralCode, updatedAt: new Date() } });

      }
    } catch (referralError) {
      console.error('Error updating referral tracking:', referralError);
      // Don't fail the whole request if referral tracking fails
    }
    
    // Update points system if it exists
    try {
      const userPoints = await prisma.userPoint.findFirst({ where: { userId } });
      
      if (userPoints) {
        await prisma.userPoint.updateMany({ where: { userId }, data: { updatedAt: new Date() } });

      } else {
        // Create points record if it doesn't exist
        await prisma.userPoint.create({
          data: {
            id: randomUUID(),
            userId,
            points: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        });

      }
    } catch (pointsError) {
      console.error('Error updating points system:', pointsError);
      // Don't fail the whole request if points update fails
    }
    
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    return NextResponse.json({
      success: true,
      referralCode,
      referralLink: `${baseUrl}/register?ref=${referralCode}`,
      message: 'Referral code generated and saved successfully',
      existing: false
    });
    
  } catch (error) {
    console.error('Error generating referral code:', error);
    
    // Return a more specific error message
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to generate referral code';
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        message: 'An error occurred while generating your referral code'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email;
    

    
    // Find user and get their referral code
    const user = await prisma.user.findFirst({ 
      where: { 
        OR: [
          { id: userId },
          { email: userEmail }
        ]
      }
    });
    
    if (!user) {

      return NextResponse.json(
        { 
          success: false,
          error: 'User not found' 
        },
        { status: 404 }
      );
    }
    
    // Check for referral code in different possible locations
    const referralRecord = await prisma.referral.findFirst({ where: { email: userEmail } });
    const referralCode = (user as any).referralCode || (user as any).profile?.referralCode || referralRecord?.code || null;
    
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    if (!referralCode) {

      return NextResponse.json({
        success: true,
        hasReferralCode: false,
        message: 'No referral code found for this user'
      });
    }
    

    
    return NextResponse.json({
      success: true,
      hasReferralCode: true,
      referralCode,
      referralLink: `${baseUrl}/register?ref=${referralCode}`,
      createdAt: user.createdAt,
      totalReferrals: (user as any).totalReferrals || 0
    });
    
  } catch (error) {
    console.error('Error fetching referral code:', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Failed to fetch referral code';
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        message: 'An error occurred while fetching your referral code'
      },
      { status: 500}
    );
  }
}
