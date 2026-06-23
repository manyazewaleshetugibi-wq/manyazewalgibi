import { NextResponse } from 'next/server';
import webpush from 'web-push';
import clientPromise from '@/lib/mongodb';

// Configure VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT;

// Validate environment variables (but don't throw during build)
if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️ VAPID keys are not configured. Push notifications will not work.');
  }
}

// Only set VAPID details if keys are available
if (vapidPublicKey && vapidPrivateKey && vapidSubject) {
  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );
}

export async function POST(req: Request) {
  try {
    // Check if VAPID is configured
    if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Push notifications are not configured. Please set VAPID keys in environment variables.' 
        },
        { status: 503 }
      );
    }

    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db('gold');
    const subscriptionsCollection = db.collection('subscriptions');

    // Parse request body
    const body = await req.json();
    const { title, body: messageBody, url, icon, badge } = body;

    // Validate required fields
    if (!title || !messageBody) {
      return NextResponse.json(
        { success: false, error: 'Title and body are required' },
        { status: 400 }
      );
    }

    // Fetch all active subscriptions
    const subscriptions = await subscriptionsCollection.find({}).toArray();

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active subscriptions found',
        sentCount: 0
      });
    }

    console.log(`[Push Notification] Sending to ${subscriptions.length} subscribers`);

    // Prepare notification payload
    const payload = JSON.stringify({
      title,
      body: messageBody,
      url: url || '/',
      icon: icon || '/icons/icon-192x192.png',
      badge: badge || '/icons/badge-icon.png',
      timestamp: Date.now()
    });

    // Send notifications to all subscribers
    const sendPromises = subscriptions.map(async (subDoc) => {
      try {
        if (!subDoc.subscription || !subDoc.subscription.endpoint) {
          console.warn(`[Push] Invalid subscription: ${subDoc._id}`);
          return null;
        }

        await webpush.sendNotification(subDoc.subscription, payload);
        console.log(`[Push] ✅ Sent to: ${subDoc.subscription.endpoint}`);
        
        return { success: true, id: subDoc._id };

      } catch (error: any) {
        // Handle subscription errors
        if (error.statusCode === 410 || error.statusCode === 404) {
          // Subscription expired or revoked - remove from database
          console.log(`[Push] 🗑️ Removing invalid subscription: ${subDoc._id}`);
          await subscriptionsCollection.deleteOne({ _id: subDoc._id });
          return { success: false, id: subDoc._id, removed: true, error: 'Subscription expired' };
        }

        console.error(`[Push] ❌ Failed to send to ${subDoc._id}:`, error.message);
        return { success: false, id: subDoc._id, error: error.message };
      }
    });

    const results = await Promise.all(sendPromises);

    const successful = results.filter(r => r?.success).length;
    const removed = results.filter(r => r?.removed).length;
    const failed = results.filter(r => r && !r.success && !r.removed).length;

    console.log(`[Push] Summary: ✅ ${successful} sent, 🗑️ ${removed} removed, ❌ ${failed} failed`);

    return NextResponse.json({
      success: true,
      message: `Notifications sent!`,
      summary: {
        total: subscriptions.length,
        successful,
        removed,
        failed
      },
      results: results.filter(r => r !== null)
    });

  } catch (error) {
    console.error('[Push] Error sending notifications:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send notifications'
      },
      { status: 500 }
    );
  }
}

// GET: Get notification status and stats
export async function GET(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db('gold');
    const subscriptionsCollection = db.collection('subscriptions');

    const count = await subscriptionsCollection.countDocuments();

    return NextResponse.json({
      success: true,
      vapidConfigured: !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
      totalSubscriptions: count,
      publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.substring(0, 20) + '...' || null,
      vapidSubject: process.env.VAPID_SUBJECT || null
    });

  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to get status' },
      { status: 500 }
    );
  }
}