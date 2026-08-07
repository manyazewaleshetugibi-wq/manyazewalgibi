import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    
    const query: any = {};
    if (isActive !== null) {
      query.isActive = isActive === 'true';
    }
    
    const expenses = await prisma.commonExpense.findMany({
      where: query,
      orderBy: { createdAt: 'desc' },
    });
    
    const formattedExpenses = expenses.map(expense => {
      // Helper function to safely convert to ISO string
      const safeToISOString = (dateValue: any): string | null => {
        if (!dateValue) return null;
        
        // If it's already a Date object
        if (dateValue instanceof Date) {
          return dateValue.toISOString();
        }
        
        // If it's a string, try to convert to Date first
        if (typeof dateValue === 'string') {
          try {
            const date = new Date(dateValue);
            // Check if the date is valid
            if (!isNaN(date.getTime())) {
              return date.toISOString();
            }
          } catch (e) {
            console.warn('Invalid date string:', dateValue);
          }
        }
        
        // If it's a number (timestamp), convert to Date
        if (typeof dateValue === 'number') {
          try {
            const date = new Date(dateValue);
            if (!isNaN(date.getTime())) {
              return date.toISOString();
            }
          } catch (e) {
            console.warn('Invalid timestamp:', dateValue);
          }
        }
        
        // Return as string if all else fails, or null
        return String(dateValue) || null;
      };

      return {
        ...expense,
        _id: expense.id,
        // Safely convert dates to ISO strings
        startDate: safeToISOString(expense.startDate),
        endDate: safeToISOString(expense.endDate),
        createdAt: safeToISOString(expense.createdAt),
        updatedAt: safeToISOString(expense.updatedAt)
      };
    });
    
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
      isActive: body.isActive !== undefined ? (body.isActive === true || body.isActive === 'true') : true,
      priority: body.priority || 'Medium',
      notes: body.notes || '',
      createdBy: body.createdBy || 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const created = await prisma.commonExpense.create({
      data: { id: randomUUID(), ...newExpense },
    });
    
    // Helper function for date conversion
    const safeToISOString = (dateValue: any): string | null => {
      if (!dateValue) return null;
      if (dateValue instanceof Date) {
        return dateValue.toISOString();
      }
      if (typeof dateValue === 'string' || typeof dateValue === 'number') {
        try {
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) {
            return date.toISOString();
          }
        } catch (e) {
          console.warn('Invalid date:', dateValue);
        }
      }
      return String(dateValue) || null;
    };
    
    const insertedExpense = {
      ...newExpense,
      _id: created.id,
      startDate: safeToISOString(newExpense.startDate),
      endDate: safeToISOString(newExpense.endDate),
      createdAt: safeToISOString(newExpense.createdAt),
      updatedAt: safeToISOString(newExpense.updatedAt)
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
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
      isActive: body.isActive !== undefined ? (body.isActive === true || body.isActive === 'true') : true,
      priority: body.priority || 'Medium',
      notes: body.notes || '',
      updatedAt: new Date(),
    };

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
    
    // Helper function for date conversion
    const safeToISOString = (dateValue: any): string | null => {
      if (!dateValue) return null;
      if (dateValue instanceof Date) {
        return dateValue.toISOString();
      }
      if (typeof dateValue === 'string' || typeof dateValue === 'number') {
        try {
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) {
            return date.toISOString();
          }
        } catch (e) {
          console.warn('Invalid date:', dateValue);
        }
      }
      return String(dateValue) || null;
    };
    
    return NextResponse.json({ 
      success: true, 
      data: { 
        ...updatedExpense, 
        _id: updatedExpense.id,
        startDate: safeToISOString(updatedExpense.startDate),
        endDate: safeToISOString(updatedExpense.endDate),
        createdAt: safeToISOString(updatedExpense.createdAt),
        updatedAt: safeToISOString(updatedExpense.updatedAt)
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
        { status: 400 }
      );
    }
    
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
export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID is required' },
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
    if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null;
    if (processedTags !== undefined) updateData.tags = processedTags;
    if (body.isActive !== undefined) updateData.isActive = body.isActive === true || body.isActive === 'true';
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.createdBy !== undefined) updateData.createdBy = body.createdBy;

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
    
    // Helper function for date conversion
    const safeToISOString = (dateValue: any): string | null => {
      if (!dateValue) return null;
      if (dateValue instanceof Date) {
        return dateValue.toISOString();
      }
      if (typeof dateValue === 'string' || typeof dateValue === 'number') {
        try {
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) {
            return date.toISOString();
          }
        } catch (e) {
          console.warn('Invalid date:', dateValue);
        }
      }
      return String(dateValue) || null;
    };
    
    return NextResponse.json({ 
      success: true, 
      data: { 
        ...updatedExpense, 
        _id: updatedExpense.id,
        startDate: safeToISOString(updatedExpense.startDate),
        endDate: safeToISOString(updatedExpense.endDate),
        createdAt: safeToISOString(updatedExpense.createdAt),
        updatedAt: safeToISOString(updatedExpense.updatedAt)
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
