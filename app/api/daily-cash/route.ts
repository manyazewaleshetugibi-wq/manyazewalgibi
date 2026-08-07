import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (date) {
      // Get entry for specific date
      const entry = await prisma.dailyCash.findFirst({ where: { date } });

      return NextResponse.json({ 
        success: true, 
        data: entry ? {
          ...entry,
          _id: entry.id,
          createdAt: entry.createdAt?.toISOString(),
          updatedAt: entry.updatedAt?.toISOString()
        } : null 
      });
    } else {
      // Get all entries
      const entries = await prisma.dailyCash.findMany({
        orderBy: { date: 'desc' },
        take: limit,
      });

      const formattedEntries = entries.map(entry => ({
        ...entry,
        _id: entry.id,
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
    const body = await request.json();

    // Validate required fields - Updated to match frontend
    if (!body.date) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: date' },
        { status: 400 }
      );
    }

    // Check if entry already exists for this date
    const existingEntry = await prisma.dailyCash.findFirst({ where: { date: body.date } });

    if (existingEntry) {
      return NextResponse.json(
        { success: false, error: 'Entry already exists for this date' },
        { status: 409 }
      );
    }

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
      transferAmount: transferAmount || bankAmount,
      totalAmount: totalAmount,
      zReportNumber: zReportNumber,
      notes: body.notes || '',
      createdBy: body.createdBy || 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const created = await prisma.dailyCash.create({
      data: { id: randomUUID(), ...newEntry },
    });

    const insertedEntry = {
      ...newEntry,
      _id: created.id,
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
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
      transferAmount: transferAmount || bankAmount,
      totalAmount: totalAmount,
      notes: body.notes || '',
      updatedAt: new Date(),
    };

    if (body.zReportNumber !== undefined) {
      updateData.zReportNumber = body.zReportNumber;
    }

    let updatedEntry: any;
    try {
      updatedEntry = await prisma.dailyCash.update({
        where: { id },
        data: updateData,
      });
    } catch (e: any) {
      if (e?.code === 'P2025') {
        return NextResponse.json(
          { success: false, error: 'Entry not found' },
          { status: 404 }
        );
      }
      throw e;
    }

    return NextResponse.json({ 
      success: true, 
      data: { 
        ...updatedEntry, 
        _id: updatedEntry.id,
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }

    const result = await prisma.dailyCash.deleteMany({ where: { id } });

    if (result.count === 0) {
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
