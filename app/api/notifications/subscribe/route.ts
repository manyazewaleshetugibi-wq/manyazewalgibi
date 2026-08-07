import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { subscription, userId } = body;

    // Validate required fields
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { success: false, error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    // Prevent duplicate entries using the unique endpoint
    const existing = await prisma.subscription.findFirst({
      where: { endpoint: subscription.endpoint },
    });

    let result;
    if (existing) {
      result = await prisma.subscription.update({
        where: { id: existing.id },
        data: {
          subscription,
          userId: userId || null,
          updatedAt: new Date(),
        },
      });
    } else {
      result = await prisma.subscription.create({
        data: {
          id: randomUUID(),
          subscription,
          endpoint: subscription.endpoint,
          userId: userId || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }



    return NextResponse.json({
      success: true,
      message: 'Subscribed successfully.',
      data: result,
    });
  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to subscribe',
      },
      { status: 500 }
    );
  }
}

// GET: Check subscription status
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint');

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: 'Endpoint parameter required' },
        { status: 400 }
      );
    }

    const subscription = await prisma.subscription.findFirst({
      where: { endpoint },
    });

    return NextResponse.json({
      success: true,
      subscribed: !!subscription,
      data: subscription,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to check subscription' },
      { status: 500 }
    );
  }
}

// DELETE: Unsubscribe
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: 'Endpoint required' },
        { status: 400 }
      );
    }

    const result = await prisma.subscription.deleteMany({
      where: { endpoint },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Subscription not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Unsubscribed successfully',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to unsubscribe' },
      { status: 500 }
    );
  }
}
