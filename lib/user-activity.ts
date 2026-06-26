// lib/user-activity.ts
import { NextRequest } from 'next/server';
import { getClientIP } from './ip-utils';
import clientPromise from './mongodb';
import { ObjectId } from 'mongodb';

export async function trackUserActivity(
  req: NextRequest,
  userId: string,
  action: string,
  details: Record<string, any> = {}
): Promise<void> {
  try {
    const client = await clientPromise;
    if (!client || !client.db) return;

    const db = client.db(process.env.MONGODB_DB || 'gold');
    
    await db.collection('user_activity').insertOne({
      userId,
      action,
      details,
      ip: getClientIP(req),
      userAgent: req.headers.get('user-agent'),
      timestamp: new Date(),
      path: req.nextUrl.pathname,
      method: req.method,
    });

    // Update last activity using string ID
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          lastActivity: new Date(),
          lastIP: getClientIP(req),
          lastUserAgent: req.headers.get('user-agent'),
        }
      }
    );
  } catch (error) {
    console.error('Error tracking user activity:', error);
  }
}

export async function getUserActivityHistory(
  userId: string,
  limit: number = 50
): Promise<any[]> {
  try {
    const client = await clientPromise;
    if (!client || !client.db) return [];

    const db = client.db(process.env.MONGODB_DB || 'gold');
    return await db.collection('user_activity')
      .find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  } catch (error) {
    console.error('Error fetching user activity:', error);
    return [];
  }
}

export async function getOnlineUsers(): Promise<any[]> {
  try {
    const client = await clientPromise;
    if (!client || !client.db) return [];

    const db = client.db(process.env.MONGODB_DB || 'gold');
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    return await db.collection('users')
      .find({
        lastActivity: { $gte: fiveMinutesAgo },
      })
      .project({
        _id: 1,
        firstName: 1,
        lastName: 1,
        email: 1,
        role: 1,
        lastActivity: 1,
        lastIP: 1,
      })
      .toArray();
  } catch (error) {
    console.error('Error fetching online users:', error);
    return [];
  }
}