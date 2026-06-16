import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const DB_NAME = process.env.DB_NAME || 'gold';

export async function GET(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (date) {
      // Get entry for specific date
      const entry = await db
        .collection('dailyCash')
        .findOne({ date });

      return NextResponse.json({ 
        success: true, 
        data: entry ? {
          ...entry,
          _id: entry._id.toString(),
          createdAt: entry.createdAt?.toISOString(),
          updatedAt: entry.updatedAt?.toISOString()
        } : null 
      });
    } else {
      // Get all entries
      const entries = await db
        .collection('dailyCash')
        .find({})
        .sort({ date: -1 })
        .limit(limit)
        .toArray();

      const formattedEntries = entries.map(entry => ({
        ...entry,
        _id: entry._id.toString(),
        createdAt: entry.createdAt?.toISOString(),
        updatedAt: entry.updatedAt?.toISOString()
      }));

      return NextResponse.json({ success: true, data: formattedEntries });
    }
  } catch (error: any) {
    console.error('Error fetching daily cash:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const body = await request.json();

    // Validate required fields - Updated to match frontend
    if (!body.date) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: date' },
        { status: 400 }
      );
    }

    // Check if entry already exists for this date
    const existingEntry = await db
      .collection('dailyCash')
      .findOne({ date: body.date });

    if (existingEntry) {
      return NextResponse.json(
        { success: false, error: 'Entry already exists for this date' },
        { status: 409 }
      );
    }

    // Parse amounts - Supporting both field naming conventions
    const cashAmount = parseFloat(body.cashAmount) || 0;
    const bankAmount = parseFloat(body.bankAmount) || 0;
    const transferAmount = parseFloat(body.transferAmount) || 0;
    const zedAmount = parseFloat(body.zedAmount) || 0;
    
    // Calculate total - use bankAmount or transferAmount whichever is provided
    const totalAmount = cashAmount + (bankAmount || transferAmount);
    
    // Generate Z-Report number if not provided
    const zReportNumber = body.zReportNumber || `ZR-${body.date.replace(/-/g, '')}-${Date.now()}`;

    const newEntry = {
      date: body.date,
      // Store all amount fields
      cashAmount: cashAmount,
      bankAmount: bankAmount || transferAmount, // Support both field names
      transferAmount: transferAmount || bankAmount,
      zedAmount: zedAmount,
      totalAmount: totalAmount,
      zReportNumber: zReportNumber,
      notes: body.notes || '',
      createdBy: body.createdBy || 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('dailyCash').insertOne(newEntry);

    const insertedEntry = {
      ...newEntry,
      _id: result.insertedId.toString(),
      createdAt: newEntry.createdAt.toISOString(),
      updatedAt: newEntry.updatedAt.toISOString()
    };

    return NextResponse.json({ success: true, data: insertedEntry }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating daily cash entry:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    // Parse amounts
    const cashAmount = parseFloat(body.cashAmount) || 0;
    const bankAmount = parseFloat(body.bankAmount) || 0;
    const transferAmount = parseFloat(body.transferAmount) || 0;
    const zedAmount = parseFloat(body.zedAmount) || 0;
    
    const totalAmount = cashAmount + (bankAmount || transferAmount);

    const updateData: any = {
      cashAmount: cashAmount,
      bankAmount: bankAmount || transferAmount,
      transferAmount: transferAmount || bankAmount,
      zedAmount: zedAmount,
      totalAmount: totalAmount,
      notes: body.notes || '',
      updatedAt: new Date(),
    };

    if (body.zReportNumber !== undefined) {
      updateData.zReportNumber = body.zReportNumber;
    }

    const result = await db
      .collection('dailyCash')
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );

    if (!result || !result.value) {
      return NextResponse.json(
        { success: false, error: 'Entry not found' },
        { status: 404 }
      );
    }

    const updatedEntry = result.value;

    return NextResponse.json({ 
      success: true, 
      data: { 
        ...updatedEntry, 
        _id: updatedEntry._id.toString(),
        createdAt: updatedEntry.createdAt?.toISOString(),
        updatedAt: updatedEntry.updatedAt?.toISOString()
      } 
    });
  } catch (error: any) {
    console.error('Error updating daily cash entry:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    const result = await db
      .collection('dailyCash')
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Entry deleted successfully' 
    });
  } catch (error: any) {
    console.error('Error deleting daily cash entry:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}