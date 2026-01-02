import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../api//auth/[...nextauth]/auth';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    
    const referralCode = `REF-${nanoid(8).toUpperCase()}`;
    
    
    return NextResponse.json({
      referralCode,
      referralLink: `${process.env.NEXTAUTH_URL}/register?ref=${referralCode}`,
      message: 'Referral code generated successfully'
    });
  } catch (error) {
    console.error('Error generating referral code:', error);
    return NextResponse.json(
      { error: 'Failed to generate referral code' },
      { status: 500 }
    );
  }
}