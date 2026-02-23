import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const DB_NAME = process.env.DB_NAME || 'gold';

export async function GET(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    
    const query: any = {};
    if (isActive !== null) {
      query.isActive = isActive === 'true';
    }
    
    const expenses = await db
      .collection('commonExpenses')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();
    
    const formattedExpenses = expenses.map(expense => ({
      ...expense,
      _id: expense._id.toString(),
      // Convert dates to ISO strings for consistent handling
      startDate: expense.startDate?.toISOString(),
      endDate: expense.endDate?.toISOString(),
      createdAt: expense.createdAt?.toISOString(),
      updatedAt: expense.updatedAt?.toISOString()
    }));
    
    return NextResponse.json({ success: true, data: formattedExpenses });
  } catch (error: any) {
    console.error('Error fetching common expenses:', error);
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
    
    if (!body.title || !body.amount || !body.frequency || !body.startDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Process tags - handle both string and array formats
    let processedTags: string[] = [];
    if (body.tags) {
      if (Array.isArray(body.tags)) {
        // If tags is already an array, use it directly
        processedTags = body.tags;
      } else if (typeof body.tags === 'string') {
        // If tags is a string, split it
        processedTags = body.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
      }
    }

    const newExpense = {
      title: body.title,
      description: body.description || '',
      amount: parseFloat(body.amount),
      category: body.category || 'Other',
      frequency: body.frequency,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : null,
      tags: processedTags,
      isActive: body.isActive !== undefined ? body.isActive : true,
      priority: body.priority || 'Medium',
      notes: body.notes || '',
      createdBy: body.createdBy || 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('commonExpenses').insertOne(newExpense);
    
    const insertedExpense = {
      ...newExpense,
      _id: result.insertedId.toString(),
      startDate: newExpense.startDate.toISOString(),
      endDate: newExpense.endDate?.toISOString() || null,
      createdAt: newExpense.createdAt.toISOString(),
      updatedAt: newExpense.updatedAt.toISOString()
    };
    
    return NextResponse.json({ success: true, data: insertedExpense }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating common expense:', error);
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
    
    const body = await request.json();

    // Process tags - handle both string and array formats
    let processedTags: string[] = [];
    if (body.tags) {
      if (Array.isArray(body.tags)) {
        // If tags is already an array, use it directly
        processedTags = body.tags;
      } else if (typeof body.tags === 'string') {
        // If tags is a string, split it
        processedTags = body.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
      }
    }

    // Prepare update data
    const updateData: any = {
      title: body.title,
      description: body.description || '',
      amount: parseFloat(body.amount),
      category: body.category || 'Other',
      frequency: body.frequency,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : null,
      tags: processedTags,
      isActive: body.isActive !== undefined ? body.isActive : true,
      priority: body.priority || 'Medium',
      notes: body.notes || '',
      updatedAt: new Date(),
    };

    const result = await db
      .collection('commonExpenses')
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );

    if (!result || !result.value) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }

    const updatedExpense = result.value;
    
    return NextResponse.json({ 
      success: true, 
      data: { 
        ...updatedExpense, 
        _id: updatedExpense._id.toString(),
        startDate: updatedExpense.startDate?.toISOString(),
        endDate: updatedExpense.endDate?.toISOString(),
        createdAt: updatedExpense.createdAt?.toISOString(),
        updatedAt: updatedExpense.updatedAt?.toISOString()
      } 
    });
  } catch (error: any) {
    console.error('Error updating common expense:', error);
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
      .collection('commonExpenses')
      .deleteOne({ _id: new ObjectId(id) });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Expense deleted successfully' 
    });
  } catch (error: any) {
    console.error('Error deleting common expense:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Optional: Add PATCH method for partial updates
export async function PATCH(request: Request) {
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
    
    const body = await request.json();

    // Process tags if present - handle both string and array formats
    let processedTags: string[] | undefined = undefined;
    if (body.tags !== undefined) {
      if (Array.isArray(body.tags)) {
        processedTags = body.tags;
      } else if (typeof body.tags === 'string') {
        processedTags = body.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
      }
    }

    // Prepare update data (only include fields that are present)
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Only add fields that are provided in the request
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.amount !== undefined) updateData.amount = parseFloat(body.amount);
    if (body.category !== undefined) updateData.category = body.category;
    if (body.frequency !== undefined) updateData.frequency = body.frequency;
    if (body.startDate !== undefined) updateData.startDate = new Date(body.startDate);
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    if (processedTags !== undefined) updateData.tags = processedTags;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.notes !== undefined) updateData.notes = body.notes;

    const result = await db
      .collection('commonExpenses')
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );

    if (!result || !result.value) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }

    const updatedExpense = result.value;
    
    return NextResponse.json({ 
      success: true, 
      data: { 
        ...updatedExpense, 
        _id: updatedExpense._id.toString(),
        startDate: updatedExpense.startDate?.toISOString(),
        endDate: updatedExpense.endDate?.toISOString(),
        createdAt: updatedExpense.createdAt?.toISOString(),
        updatedAt: updatedExpense.updatedAt?.toISOString()
      } 
    });
  } catch (error: any) {
    console.error('Error patching common expense:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}