import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

const DB_NAME = process.env.DATABASE_NAME || 'gold';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    const { id } = await params;
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID format' },
        { status: 400 }
      );
    }
    
    const expense = await db
      .collection('commonExpenses')
      .findOne({ _id: new ObjectId(id) });
    
    if (!expense) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      data: { ...expense, _id: expense._id.toString() } 
    });
  } catch (error: any) {
    console.error('Error fetching common expense:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    const { id } = await params;
    const body = await request.json();
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID format' },
        { status: 400 }
      );
    }
    
    // Prepare update data with proper type conversions
    const updateData: any = {
      ...body,
      updatedAt: new Date(),
    };
    
    // Convert amount to number if present
    if (body.amount !== undefined) {
      updateData.amount = parseFloat(body.amount);
    }
    
    // Convert date to Date object if present
    if (body.date) {
      updateData.date = new Date(body.date);
    }
    
    // Handle isActive as boolean if present
    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive === true || body.isActive === 'true';
    }
    
    const result = await db
      .collection('commonExpenses')
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );
    
    // Check if the document was found and updated
    if (!result || !result.value) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }
    
    // Get the updated document from result.value
    const updatedExpense = result.value;
    
    // Ensure isActive has a default value if missing
    if (updatedExpense.isActive === undefined) {
      updatedExpense.isActive = true;
    }
    
    return NextResponse.json({ 
      success: true, 
      data: { 
        ...updatedExpense, 
        _id: updatedExpense._id.toString(),
        // Ensure date is properly formatted
        date: updatedExpense.date ? new Date(updatedExpense.date).toISOString() : new Date().toISOString()
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

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    const { id } = await params;
    
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
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    
    const { id } = await params;
    const body = await request.json();
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID format' },
        { status: 400 }
      );
    }
    
    // Prepare update data with proper type conversions
    const updateData: any = {
      ...body,
      updatedAt: new Date(),
    };
    
    // Convert amount to number if present
    if (body.amount !== undefined) {
      updateData.amount = parseFloat(body.amount);
    }
    
    // Convert date to Date object if present
    if (body.date) {
      updateData.date = new Date(body.date);
    }
    
    // Handle isActive as boolean if present
    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive === true || body.isActive === 'true';
    }
    
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
        date: updatedExpense.date ? new Date(updatedExpense.date).toISOString() : new Date().toISOString()
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