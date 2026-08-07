import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    // Get all prizes
    const prizes = await prisma.prize.findMany({ where: { isActive: true } });

    // Calculate statistics
    const totalPrizes = prizes.length;
    const totalValue = prizes.reduce((sum, p) => sum + (p.value || 0), 0);
    const totalProbability = prizes.reduce((sum, p) => sum + (p.probability || 0), 0);
    
    const rarityCounts = {
      common: prizes.filter(p => p.rarity === 'common').length,
      rare: prizes.filter(p => p.rarity === 'rare').length,
      epic: prizes.filter(p => p.rarity === 'epic').length,
      legendary: prizes.filter(p => p.rarity === 'legendary').length
    };

    const mostValuable = prizes.sort((a, b) => (b.value || 0) - (a.value || 0))[0];
    const mostCommon = prizes.sort((a, b) => (b.probability || 0) - (a.probability || 0))[0];

    return NextResponse.json({
      success: true,
      data: {
        totalPrizes,
        totalValue,
        totalProbability,
        rarityCounts,
        mostValuable: mostValuable ? {
          name: mostValuable.name,
          value: mostValuable.value
        } : null,
        mostCommon: mostCommon ? {
          name: mostCommon.name,
          probability: mostCommon.probability
        } : null,
        prizesByRarity: rarityCounts
      }
    });

  } catch (error: any) {
    console.error('Error fetching prize stats:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch prize statistics' },
      { status: 500 }
    );
  }
}
