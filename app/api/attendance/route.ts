import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const OFFICE_LAT = Number(process.env.OFFICE_LAT) || 8.99410;
const OFFICE_LNG = Number(process.env.OFFICE_LNG) || 38.79260;
const RADIUS_METERS = Number(process.env.ATTENDANCE_RADIUS_METERS) || 5;

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function verifyLocation(latitude: number, longitude: number): { valid: boolean; distance: number } {
  const distance = haversineDistance(latitude, longitude, OFFICE_LAT, OFFICE_LNG);
  return { valid: distance <= RADIUS_METERS, distance };
}

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('gold');
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const userId = searchParams.get('userId');

    let query: any = {};
    if (date) {
      query.date = date;
    } else if (from && to) {
      query.date = { $gte: from, $lte: to };
    } else {
      query.date = new Date().toISOString().split('T')[0];
    }
    if (userId) query.userId = userId;

    const records = await db.collection('attendance').find(query).toArray();
    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('gold');
    const body = await request.json();
    const { userId, action, latitude, longitude } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
    }

    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json({ success: false, error: 'Location is required. Enable GPS and try again.' }, { status: 400 });
    }

    const locationCheck = verifyLocation(Number(latitude), Number(longitude));
    if (!locationCheck.valid) {
      return NextResponse.json({
        success: false,
        error: `You are ${Math.round(locationCheck.distance)}m away. Must be within ${RADIUS_METERS}m of the office to clock in/out.`
      }, { status: 403 });
    }

    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (user.status !== 'active') {
      return NextResponse.json({ success: false, error: 'Account is not active' }, { status: 403 });
    }

    const today = new Date().toISOString().split('T')[0];
    const attendanceCollection = db.collection('attendance');
    const existing = await attendanceCollection.findOne({ userId, date: today });

    if (action === 'clock-out') {
      if (!existing || !existing.clockIn) {
        return NextResponse.json({ success: false, error: 'No clock-in found for today' }, { status: 400 });
      }
      if (existing.clockOut) {
        return NextResponse.json({ success: false, error: 'Already clocked out today' }, { status: 400 });
      }
      const clockOut = new Date().toISOString();
      await attendanceCollection.updateOne(
        { _id: existing._id },
        { $set: { clockOut, pinVerified: true, updatedAt: new Date().toISOString(), locationLat: latitude, locationLng: longitude } }
      );
      return NextResponse.json({
        success: true,
        data: { type: 'CLOCK_OUT', userName: user.name, time: clockOut }
      });
    }

    if (existing) {
      if (existing.clockIn && !existing.clockOut) {
        const clockOut = new Date().toISOString();
        await attendanceCollection.updateOne(
          { _id: existing._id },
          { $set: { clockOut, pinVerified: true, updatedAt: new Date().toISOString(), locationLat: latitude, locationLng: longitude } }
        );
        return NextResponse.json({
          success: true,
          data: { type: 'CLOCK_OUT', userName: user.name, time: clockOut }
        });
      }
      return NextResponse.json({ success: false, error: 'Already completed today' }, { status: 400 });
    }

    const now = new Date();
    const clockIn = now.toISOString();
    const shiftHour = now.getHours();
    let shift = 'MORNING';
    if (shiftHour >= 12 && shiftHour < 17) shift = 'AFTERNOON';
    else if (shiftHour >= 17) shift = 'EVENING';

    let status = 'present';
    if (user.shift === 'MORNING' && shiftHour >= 9) status = 'late';
    else if (user.shift === 'AFTERNOON' && shiftHour >= 13) status = 'late';
    else if (user.shift === 'EVENING' && shiftHour >= 18) status = 'late';

    const lateMinutes = status === 'late' ? (shiftHour - (user.shift === 'MORNING' ? 8 : user.shift === 'AFTERNOON' ? 12 : 17)) * 60 : 0;

    await attendanceCollection.insertOne({
      userId,
      date: today,
      clockIn,
      clockOut: null,
      status,
      shift,
      lateMinutes,
      overtimeMinutes: 0,
      pinVerified: true,
      note: '',
      restaurantId: user.restaurantId || '',
      locationLat: latitude,
      locationLng: longitude,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      data: { type: 'CLOCK_IN', userName: user.name, time: clockIn, status }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
