// app/api/tables/available/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { TableArrangement, ITable } from '@/models/TableArrangement';
import clientPromise from '@/lib/mongodb';
import mongoose from 'mongoose';

async function ensureConnection() {
  if (mongoose.connection.readyState === 0) {
    const client = await clientPromise;
    await mongoose.connect(process.env.MONGODB_URI!);
  }
  return mongoose.connection;
}

export async function GET(req: NextRequest) {
  try {
    await ensureConnection();
    
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId') || 'manyazewal1';
    const floor = searchParams.get('floor') || 'Ground Floor';
    const status = searchParams.get('status') || 'available'; // available, occupied, reserved, all

    const query: any = { 
      restaurantId,
      floor,
      isActive: true 
    };

    const arrangement = await TableArrangement.findOne(query).sort({ updatedAt: -1 });

    if (!arrangement) {
      return NextResponse.json({ 
        data: [],
        message: 'No tables found' 
      });
    }

    let tables = arrangement.tables;
    
    // Filter by status if not 'all'
    if (status !== 'all') {
      tables = tables.filter((t: ITable) => t.status === status);
    }

    // Return simplified table data for menu page
    const simplifiedTables = tables.map((table: ITable) => ({
      id: table.id,
      number: table.number,
      capacity: table.capacity,
      status: table.status,
      shape: table.shape,
      location: table.location || '',
      description: table.description || '',
      features: table.features || [],
      tags: table.tags || [],
      section: table.section || '',
      x: table.x,
      y: table.y,
      width: table.width,
      height: table.height,
    }));

    return NextResponse.json({ 
      data: simplifiedTables,
      total: simplifiedTables.length,
      floor: arrangement.floor,
      restaurantName: arrangement.restaurantName
    });
  } catch (error) {
    console.error('Error fetching available tables:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tables' },
      { status: 500 }
    );
  }
}
