import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { nanoid } from 'nanoid';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

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
    
    console.log('Generating referral code for user:', userId);
    
    // Connect to database
    const client = await clientPromise;
    const db = client.db();
    
    // Check if user already has a referral code
    const existingUser = await db.collection('users').findOne({ 
      $or: [
        { _id: new ObjectId(userId) },
        { email: userEmail }
      ]
    });
    
    if (!existingUser) {
      console.log('User not found:', userId);
      return NextResponse.json(
        { 
          success: false,
          error: 'User not found' 
        },
        { status: 404 }
      );
    }
    
    // Check if user already has a referral code
    const existingCode = existingUser.referralCode || existingUser.profile?.referralCode;
    if (existingCode) {
      const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      
      console.log('User already has referral code:', existingCode);
      
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
        const existingUserWithCode = await db.collection('users').findOne({ 
          $or: [
            { referralCode: code },
            { 'profile.referralCode': code }
          ]
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
    console.log('Generated new referral code:', referralCode);
    
    // Update user document with referral code
    const updateResult = await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          referralCode: referralCode,
          updatedAt: new Date()
        }
      }
    );
    
    if (updateResult.modifiedCount === 0 && updateResult.matchedCount === 0) {
      // Try updating by email if ID update failed
      const emailUpdateResult = await db.collection('users').updateOne(
        { email: userEmail },
        {
          $set: {
            referralCode: referralCode,
            updatedAt: new Date()
          }
        }
      );
      
      if (emailUpdateResult.modifiedCount === 0 && emailUpdateResult.matchedCount === 0) {
        throw new Error('Failed to update user with referral code');
      }
    }
    
    console.log('Updated user with referral code');
    
    // Create or update referral tracking record
    try {
      const referralsCollection = db.collection('referrals');
      
      const existingReferralRecord = await referralsCollection.findOne({ userId });
      
      if (!existingReferralRecord) {
        await referralsCollection.insertOne({
          userId,
          userEmail,
          referralCode,
          createdAt: new Date(),
          updatedAt: new Date(),
          totalReferrals: 0,
          successfulReferrals: 0,
          pendingReferrals: 0,
          referralHistory: []
        });
        console.log('Created referral tracking record');
      } else {
        await referralsCollection.updateOne(
          { userId },
          {
            $set: {
              referralCode,
              updatedAt: new Date()
            }
          }
        );
        console.log('Updated referral tracking record');
      }
    } catch (referralError) {
      console.error('Error updating referral tracking:', referralError);
      // Don't fail the whole request if referral tracking fails
    }
    
    // Update points system if it exists
    try {
      const pointsCollection = db.collection('userPoints');
      const userPoints = await pointsCollection.findOne({ userId });
      
      if (userPoints) {
        await pointsCollection.updateOne(
          { userId },
          {
            $set: {
              referralCode,
              updatedAt: new Date()
            }
          }
        );
        console.log('Updated points record with referral code');
      } else {
        // Create points record if it doesn't exist
        await pointsCollection.insertOne({
          userId,
          referralCode,
          totalPoints: 0,
          availablePoints: 0,
          transactions: [],
          orderIdsWithPoints: [],
          referralIdsWithPoints: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log('Created points record with referral code');
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
    
    console.log('Fetching referral code for user:', userId);
    
    const client = await clientPromise;
    const db = client.db();
    
    // Find user and get their referral code
    const user = await db.collection('users').findOne({ 
      $or: [
        { _id: new ObjectId(userId) },
        { email: userEmail }
      ]
    });
    
    if (!user) {
      console.log('User not found:', userId);
      return NextResponse.json(
        { 
          success: false,
          error: 'User not found' 
        },
        { status: 404 }
      );
    }
    
    // Check for referral code in different possible locations
    const referralCode = user.referralCode || user.profile?.referralCode || null;
    
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    if (!referralCode) {
      console.log('No referral code found for user:', userId);
      return NextResponse.json({
        success: true,
        hasReferralCode: false,
        message: 'No referral code found for this user'
      });
    }
    
    console.log('Found referral code for user:', referralCode);
    
    return NextResponse.json({
      success: true,
      hasReferralCode: true,
      referralCode,
      referralLink: `${baseUrl}/register?ref=${referralCode}`,
      createdAt: user.createdAt,
      totalReferrals: user.totalReferrals || 0
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
