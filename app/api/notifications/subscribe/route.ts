import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(req: Request) {
  try {
    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db('gold');
    const subscriptionsCollection = db.collection('subscriptions');

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
    const result = await subscriptionsCollection.findOneAndUpdate(
      { 'subscription.endpoint': subscription.endpoint },
      { 
        $set: { 
          subscription: subscription,
          userId: userId || null,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { 
        upsert: true, 
        returnDocument: 'after'
      }
    );

    console.log(`[Subscription] ${result ? 'Updated' : 'Created'} subscription for endpoint: ${subscription.endpoint}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Subscribed successfully.',
      data: result
    });

  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to subscribe'
      }, 
      { status: 500 }
    );
  }
}

// GET: Check subscription status
export async function GET(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db('gold');
    const subscriptionsCollection = db.collection('subscriptions');

    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint');

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: 'Endpoint parameter required' },
        { status: 400 }
      );
    }

    const subscription = await subscriptionsCollection.findOne({
      'subscription.endpoint': endpoint
    });

    return NextResponse.json({
      success: true,
      subscribed: !!subscription,
      data: subscription
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
    const client = await clientPromise;
    const db = client.db('gold');
    const subscriptionsCollection = db.collection('subscriptions');

    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: 'Endpoint required' },
        { status: 400 }
      );
    }

    const result = await subscriptionsCollection.deleteOne({
      'subscription.endpoint': endpoint
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Subscription not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Unsubscribed successfully'
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to unsubscribe' },
      { status: 500 }
    );
  }
}