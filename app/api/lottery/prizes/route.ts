import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { requireAdmin } from '@/lib/api-auth';

// Define the constants directly in the file since the import is failing
const DEFAULT_COLORS = {
  common: 'from-gray-400 to-gray-600',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-yellow-400 to-orange-500'
};

const DEFAULT_GRADIENTS = {
  common: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
  rare: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
  epic: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
  legendary: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
};

export async function GET(request: NextRequest) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    const rarity = searchParams.get('rarity');

    const query: any = {};
    
    if (active === 'true') {
      query.isActive = true;
    }
    
    if (rarity) {
      query.rarity = rarity;
    }

    const prizes = await prisma.prize.findMany({
      where: query,
      orderBy: [{ probability: 'desc' }, { value: 'desc' }]
    });

    const mappedPrizes = prizes.map(prize => ({
      ...prize,
      id: prize.id,
      _id: undefined
    }));

    return NextResponse.json({
      success: true,
      data: mappedPrizes,
      total: mappedPrizes.length
    });

  } catch (error: any) {
    console.error('Error fetching prizes:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch prizes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const prizeData = await request.json();

    // Validate required fields
    if (!prizeData.name || !prizeData.value || !prizeData.rarity) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate probability
    if (prizeData.probability < 0 || prizeData.probability > 100) {
      return NextResponse.json(
        { success: false, message: 'Probability must be between 0 and 100' },
        { status: 400 }
      );
    }

    // Ensure rarity is valid
    const validRarities = ['common', 'rare', 'epic', 'legendary'];
    if (!validRarities.includes(prizeData.rarity)) {
      return NextResponse.json(
        { success: false, message: 'Invalid rarity value' },
        { status: 400 }
      );
    }

    const prize: any = {
      ...prizeData,
      icon: prizeData.icon || 'Gift',
      color: prizeData.color || DEFAULT_COLORS[prizeData.rarity as keyof typeof DEFAULT_COLORS],
      gradient: prizeData.gradient || DEFAULT_GRADIENTS[prizeData.rarity as keyof typeof DEFAULT_GRADIENTS],
      textColor: prizeData.textColor || 'text-white',
      isActive: prizeData.isActive !== undefined ? prizeData.isActive : true,
      totalWon: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await prisma.prize.create({
      data: { id: randomUUID(), ...prize }
    });

    return NextResponse.json({
      success: true,
      data: { id: result.id, ...prize }
    });

  } catch (error: any) {
    console.error('Error creating prize:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create prize' },
      { status: 500 }
    );
  }
}
