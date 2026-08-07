import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { randomUUID } from 'crypto';

// Helper function for case-insensitive role check
const isAdminRole = (role: string | undefined): boolean => {
  if (!role) return false;
  return role.toUpperCase() === "ADMIN";
};

// Helper to check if user can assign tasks (case-insensitive)
const canUserAssignTasks = (user: any): boolean => {
  if (!user) return false;
  const role = user.role || user.userRole;
  if (isAdminRole(role)) return true;
  return user.permissions?.canAssignTasks === true;
};

// Helper to calculate actual hours worked
const calculateActualHours = (startTime: string, completedTime: string): number => {
  const start = new Date(startTime);
  const end = new Date(completedTime);
  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  return Math.round(hours * 10) / 10;
};

// Helper to get user details
const getUserDetails = async (email: string) => {
  let user = await prisma.staff.findFirst({ where: { email } });
  if (!user) {
    user = await prisma.user.findFirst({ where: { email } });
  }
  return user;
};

// GET - Fetch tasks (filtered by user role/permissions)
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionUser = session.user as any;
    
    const currentStaff = await getUserDetails(sessionUser.email);
    
    const userRole = currentStaff?.role || sessionUser?.role || 'STAFF';
    const userPermissions = currentStaff?.permissions || {};
    const userEmail = sessionUser?.email;
    
    const canViewAllTasks = isAdminRole(userRole) || (userPermissions as any).canAssignTasks === true;
    
    let query: any = {};
    
    if (!canViewAllTasks) {
      query.assignedTo = { path: ['email'], string_equals: userEmail };
    } else {
      const assignedToEmail = searchParams.get('assignedTo');
      if (assignedToEmail && assignedToEmail !== '') {
        query.assignedTo = { path: ['email'], string_equals: assignedToEmail };
      }
    }
    
    const status = searchParams.get('status');
    if (status && status !== '') {
      query.status = status;
    }
    
    const priority = searchParams.get('priority');
    if (priority && priority !== '') {
      query.priority = priority;
    }
    
    const tasks = await prisma.task.findMany({
      where: query,
      orderBy: { startTime: 'desc' },
    });
    
    return NextResponse.json({ success: true, tasks: tasks.map(t => ({ ...t, _id: t.id })) });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST - Create new task (requires permission)
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessionUser = session.user as any;
    
    const currentStaff = await getUserDetails(sessionUser.email);
    
    const userRole = currentStaff?.role || sessionUser?.role || 'STAFF';
    const userPermissions = currentStaff?.permissions || {};
    
    const hasPermission = canUserAssignTasks({ role: userRole, permissions: userPermissions });
    
    if (!hasPermission) {
      return NextResponse.json({ 
        error: 'You do not have permission to assign tasks. Only administrators and users with "canAssignTasks" permission can assign tasks.' 
      }, { status: 403 });
    }
    
    const body = await request.json();
    const { 
      title, 
      description, 
      assignedToId, 
      assignedToName, 
      assignedToEmail, 
      startTime, 
      endTime, 
      priority, 
      estimatedHours 
    } = body;
    
    if (!title || !description || !assignedToEmail || !startTime || !endTime) {
      return NextResponse.json({ 
        error: 'Missing required fields: title, description, assignedToEmail, startTime, endTime' 
      }, { status: 400 });
    }
    
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }
    
    if (startDate >= endDate) {
      return NextResponse.json({ 
        error: 'End time must be after start time' 
      }, { status: 400 });
    }
    
    let assignedUser = await prisma.staff.findFirst({ 
      where: {
        OR: [{ id: assignedToId }, { email: assignedToEmail }]
      }
    });
    
    if (!assignedUser) {
      assignedUser = await prisma.user.findFirst({ 
        where: {
          OR: [{ id: assignedToId }, { email: assignedToEmail }]
        }
      });
    }
    
    if (!assignedUser) {
      return NextResponse.json({ error: 'Assigned user not found' }, { status: 404 });
    }
    
    const task: any = {
      title: title.trim(),
      description: description.trim(),
      assignedTo: {
        userId: assignedUser.id,
        name: assignedUser.name,
        email: assignedUser.email,
      },
      assignedBy: {
        userId: currentStaff?.id || sessionUser?.email,
        name: currentStaff?.name || sessionUser?.name || 'Unknown',
        email: sessionUser?.email,
        role: userRole
      },
      startTime: startDate,
      endTime: endDate,
      priority: priority || 'medium',
      estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
      status: 'pending',
      notes: Prisma.DbNull,
      actualHours: Prisma.DbNull,
      actualStartTime: null,
      actualCompletedTime: null,
      completedAt: null,
      notifiedOverdue: false,
      notifiedDeadline: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const created = await prisma.task.create({ data: { id: randomUUID(), ...task } });
    const createdTask = { ...created, _id: created.id };
    
    return NextResponse.json({ 
      success: true, 
      task: createdTask,
      message: 'Task assigned successfully'
    });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

// PUT - Update task (status, notes, start time, completion time)
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { 
      id, 
      status, 
      notes, 
      actualHours,
      actualStartTime,
      actualCompletedTime
    } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }
    
    const sessionUser = session.user as any;
    
    const currentStaff = await getUserDetails(sessionUser.email);
    const userRole = currentStaff?.role || sessionUser?.role || 'STAFF';
    const userEmail = sessionUser?.email;
    
    const existingTask = await prisma.task.findFirst({ 
      where: { id }
    });
    
    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    
    const canUpdateAnyTask = isAdminRole(userRole);
    const isAssignedToUser = (existingTask.assignedTo as any)?.email === userEmail;
    
    if (!canUpdateAnyTask && !isAssignedToUser) {
      return NextResponse.json({ 
        error: 'You do not have permission to update this task' 
      }, { status: 403 });
    }
    
    const updateData: any = {
      updatedAt: new Date()
    };
    
    // Update status and track times
    if (status) {
      updateData.status = status;
      
      // If status is changing to 'in-progress', record actual start time
      if (status === 'in-progress' && !existingTask.actualStartTime) {
        updateData.actualStartTime = actualStartTime || new Date().toISOString();
      }
      
      // If status is changing to 'completed', record completion time and calculate actual hours
      if (status === 'completed' && !existingTask.actualCompletedTime) {
        const completionTime = actualCompletedTime || new Date().toISOString();
        updateData.actualCompletedTime = completionTime;
        updateData.completedAt = completionTime;
        
        const startTimeToUse = existingTask.actualStartTime || updateData.actualStartTime;
        if (startTimeToUse) {
          updateData.actualHours = calculateActualHours(startTimeToUse, completionTime);
        }
      }
    }
    
    // Handle manual actualStartTime update
    if (actualStartTime !== undefined && !existingTask.actualStartTime) {
      updateData.actualStartTime = actualStartTime;
    }
    
    // Handle manual actualCompletedTime update
    if (actualCompletedTime !== undefined && !existingTask.actualCompletedTime) {
      updateData.actualCompletedTime = actualCompletedTime;
      updateData.completedAt = actualCompletedTime;
      
      const startTimeToUse = existingTask.actualStartTime || updateData.actualStartTime;
      if (startTimeToUse) {
        updateData.actualHours = calculateActualHours(startTimeToUse, actualCompletedTime);
      }
    }
    
    // Update notes
    if (notes !== undefined) {
      updateData.notes = notes === null ? Prisma.DbNull : notes;
    }
    
    // Update actual hours manually
    if (actualHours !== undefined) {
      updateData.actualHours = parseFloat(actualHours);
    }
    
    const result = await prisma.task.updateMany(
      { where: { id }, data: updateData }
    );
    
    if (result.count === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    
    const updatedTask = await prisma.task.findFirst({ 
      where: { id }
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Task updated successfully',
      task: updatedTask ? { ...updatedTask, _id: updatedTask.id } : updatedTask
    });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

// DELETE - Delete task (Admin only)
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const sessionUser = session.user as any;
    
    const currentStaff = await getUserDetails(sessionUser.email);
    const userRole = currentStaff?.role || sessionUser?.role || 'STAFF';
    
    if (!isAdminRole(userRole)) {
      return NextResponse.json({ 
        error: 'Only administrators can delete tasks' 
      }, { status: 403 });
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }
    
    const taskToDelete = await prisma.task.findFirst({ 
      where: { id }
    });
    
    if (!taskToDelete) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    
    await prisma.task.deleteMany({ 
      where: { id }
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Task deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
