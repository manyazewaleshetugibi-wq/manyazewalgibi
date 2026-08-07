import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/api-auth';

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
    const { response } = await requireRole(["admin", "manager"]);
    if (response) return response;

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
    const subscriptions = await prisma.subscription.findMany({});

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active subscriptions found',
        sentCount: 0
      });
    }



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
        if (!subDoc.subscription || !(subDoc.subscription as any).endpoint) {
          console.warn(`[Push] Invalid subscription: ${subDoc.id}`);
          return null;
        }

        await webpush.sendNotification(subDoc.subscription as any, payload);

        
        return { success: true, id: subDoc.id };

      } catch (error: any) {
        // Handle subscription errors
        if (error.statusCode === 410 || error.statusCode === 404) {
          // Subscription expired or revoked - remove from database

          await prisma.subscription.delete({ where: { id: subDoc.id } });
          return { success: false, id: subDoc.id, removed: true, error: 'Subscription expired' };
        }

        console.error(`[Push] ❌ Failed to send to ${subDoc.id}:`, error.message);
        return { success: false, id: subDoc.id, error: error.message };
      }
    });

    const results = await Promise.all(sendPromises);

    const successful = results.filter(r => r?.success).length;
    const removed = results.filter(r => r?.removed).length;
    const failed = results.filter(r => r && !r.success && !r.removed).length;



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
    const count = await prisma.subscription.count();

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