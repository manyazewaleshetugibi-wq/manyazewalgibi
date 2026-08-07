import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    const expense = await prisma.commonExpense.findUnique({ where: { id } });
    
    if (!expense) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      data: { ...expense, _id: expense.id } 
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
    const { id } = await params;
    const body = await request.json();
    
    // Prepare update data with proper type conversions
    const { _id, date, ...restBody } = body;
    const updateData: any = {
      ...restBody,
      updatedAt: new Date(),
    };
    
    // Convert amount to number if present
    if (body.amount !== undefined) {
      updateData.amount = parseFloat(body.amount);
    }
    
    // Convert startDate/endDate to Date objects if present
    if (body.startDate !== undefined) {
      updateData.startDate = body.startDate ? new Date(body.startDate) : null;
    }
    
    if (body.endDate !== undefined) {
      updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    }
    
    // Handle tags if present
    if (body.tags !== undefined) {
      if (Array.isArray(body.tags)) {
        updateData.tags = body.tags;
      } else if (typeof body.tags === 'string') {
        updateData.tags = body.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
      }
    }
    
    // Handle isActive as boolean if present
    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive === true || body.isActive === 'true';
    }
    
    let updatedExpense: any;
    try {
      updatedExpense = await prisma.commonExpense.update({
        where: { id },
        data: updateData,
      });
    } catch (e: any) {
      if (e?.code === 'P2025') {
        return NextResponse.json(
          { success: false, error: 'Expense not found' },
          { status: 404 }
        );
      }
      throw e;
    }
    
    // Ensure isActive has a default value if missing
    if (updatedExpense.isActive === undefined) {
      updatedExpense.isActive = true;
    }
    
    return NextResponse.json({ 
      success: true, 
      data: { 
        ...updatedExpense, 
        _id: updatedExpense.id,
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
    const { id } = await params;
    
    const result = await prisma.commonExpense.deleteMany({ where: { id } });
    
    if (result.count === 0) {
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
    const { id } = await params;
    const body = await request.json();
    
    // Prepare update data with proper type conversions
    const { _id, date, ...restBody } = body;
    const updateData: any = {
      ...restBody,
      updatedAt: new Date(),
    };
    
    // Convert amount to number if present
    if (body.amount !== undefined) {
      updateData.amount = parseFloat(body.amount);
    }
    
    // Convert startDate/endDate to Date objects if present
    if (body.startDate !== undefined) {
      updateData.startDate = body.startDate ? new Date(body.startDate) : null;
    }
    
    if (body.endDate !== undefined) {
      updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    }
    
    // Handle tags if present
    if (body.tags !== undefined) {
      if (Array.isArray(body.tags)) {
        updateData.tags = body.tags;
      } else if (typeof body.tags === 'string') {
        updateData.tags = body.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
      }
    }
    
    // Handle isActive as boolean if present
    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive === true || body.isActive === 'true';
    }
    
    let updatedExpense: any;
    try {
      updatedExpense = await prisma.commonExpense.update({
        where: { id },
        data: updateData,
      });
    } catch (e: any) {
      if (e?.code === 'P2025') {
        return NextResponse.json(
          { success: false, error: 'Expense not found' },
          { status: 404 }
        );
      }
      throw e;
    }
    
    return NextResponse.json({ 
      success: true, 
      data: { 
        ...updatedExpense, 
        _id: updatedExpense.id,
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
