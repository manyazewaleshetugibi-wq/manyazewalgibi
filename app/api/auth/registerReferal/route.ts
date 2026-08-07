import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { nanoid } from 'nanoid';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const { success } = await rateLimit(ip, "register-referral", 10, 3600);
  if (!success) {
    return NextResponse.json(
      { error: 'Too many registration attempts. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { name, email, password, referralCode } = body;

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate user ID and referral code
    const userId = nanoid();
    const userReferralCode = `REF-${nanoid(8).toUpperCase()}`;

    // Hash password
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    const hashedPassword = `${salt}:${hash}`;

    // In a real app, save user to database
    // const user = {
    //   _id: userId,
    //   name,
    //   email,
    //   password: hashedPassword,
    //   referralCode: userReferralCode,
    //   referredBy: referralCode || null,
    //   points: 0,
    //   createdAt: new Date(),
    //   updatedAt: new Date()
    // };
    // await db.collection('users').insertOne(user);

    // If referral code provided, track it
    if (referralCode) {
      // Find referrer by code
      // const referrer = await db.collection('users').findOne({ referralCode });
      
      // if (referrer) {
        // Create referral record
        // const referral = {
        //   referrerId: referrer._id,
        //   referredUserId: userId,
        //   referralCode,
        //   status: 'pending',
        //   createdAt: new Date()
        // };
        // await db.collection('referrals').insertOne(referral);
        
        // Award points when referred user makes first order
        // Points will be awarded via order API
      // }
    }

    return NextResponse.json({
      message: 'User registered successfully',
      userId,
      referralCode: userReferralCode
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
