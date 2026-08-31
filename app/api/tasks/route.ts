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

// Permission may be stored as an array of strings or an object (legacy)
const hasCanAssignPermission = (permissions: any): boolean => {
  if (!permissions) return false;
  if (Array.isArray(permissions)) return permissions.includes("canAssignTasks");
  return permissions.canAssignTasks === true;
};

// Helper to check if user can assign tasks (case-insensitive)
const canUserAssignTasks = (user: any): boolean => {
  if (!user) return false;
  const role = user.role || user.userRole;
  if (isAdminRole(role)) return true;
  return hasCanAssignPermission(user.permissions);
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
    
    const canViewAllTasks = isAdminRole(userRole) || hasCanAssignPermission(userPermissions);
    
    let query: any = {};

    // Exact-match a JSON path value using only operators supported by the running
    // Prisma client. `assignedTo` is a JSON object, so we match the email stored
    // inside it via starts_with + ends_with on the 'email' path.
    const emailJsonFilter = (email: string) => ({
      AND: [
        { assignedTo: { path: ['email'], string_starts_with: email } },
        { assignedTo: { path: ['email'], string_ends_with: email } },
      ],
    });

    if (!canViewAllTasks) {
      query.AND = emailJsonFilter(userEmail).AND;
    } else {
      const assignedToEmail = searchParams.get('assignedTo');
      if (assignedToEmail && assignedToEmail !== '') {
        query.AND = emailJsonFilter(assignedToEmail).AND;
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
    
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (from) {
      const fromDate = new Date(from);
      if (!isNaN(fromDate.getTime())) {
        query.startTime = { ...(query.startTime || {}), gte: fromDate };
      }
    }
    if (to) {
      const toDate = new Date(to);
      if (!isNaN(toDate.getTime())) {
        query.startTime = { ...(query.startTime || {}), lte: toDate };
      }
    }
    
    // Soft-deleted tasks are hidden from active lists but kept for the report.
    // The report passes includeDeleted=1 to still see them.
    const includeDeleted = searchParams.get('includeDeleted') === '1';
    if (!includeDeleted) {
      query.deletedAt = null;
    }
    
    // Pagination for performance
    const limitRaw = searchParams.get('limit');
    const offsetRaw = searchParams.get('offset');
    const limit = limitRaw ? Math.min(Math.max(parseInt(limitRaw) || 100, 1), 500) : 100;
    const offset = offsetRaw ? Math.max(parseInt(offsetRaw) || 0, 0) : 0;
    
    const [total, tasks] = await Promise.all([
      prisma.task.count({ where: query }),
      prisma.task.findMany({
        where: query,
        orderBy: { startTime: 'desc' },
        take: limit,
        skip: offset,
      }),
    ]);
    
    return NextResponse.json({
      success: true,
      tasks: tasks.map(t => ({ ...t, _id: t.id })),
      total,
      limit,
      offset,
      hasMore: offset + tasks.length < total,
    });
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
      estimatedHours,
      voiceNote,
      repeat
    } = body;
    
    // Title & description are optional when a voice note is provided.
    const hasVoice = !!voiceNote;
    if ((!title || !description) && !hasVoice) {
      return NextResponse.json({ 
        error: 'Missing required fields: title, description (or a voice note), assignedToEmail, startTime, endTime' 
      }, { status: 400 });
    }
    
    if (!assignedToEmail || !startTime || !endTime) {
      return NextResponse.json({ 
        error: 'Missing required fields: assignedToEmail, startTime, endTime' 
      }, { status: 400 });
    }
    
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }
    
    const durationMs = endDate.getTime() - startDate.getTime();
    if (durationMs <= 0) {
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

    // How many times to repeat the task daily. `repeat` is a day count.
    // "" (or invalid) = single occurrence. Otherwise repeat every day for N days.
    const repeatDays = parseInt(repeat, 10);
    const count = Number.isFinite(repeatDays) && repeatDays > 1 && repeatDays <= 60
      ? repeatDays
      : 1;

    const cleanTitle = (title || "Voice Task").trim();
    const cleanDescription = (description || "Task created from a voice instruction.").trim();

    const taskInstances: any[] = [];
    for (let i = 0; i < count; i++) {
      const occStart = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const occEnd = new Date(occStart.getTime() + durationMs);
      taskInstances.push({
        title: cleanTitle,
        description: cleanDescription,
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
        startTime: occStart,
        endTime: occEnd,
        priority: priority || 'medium',
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
        status: 'pending',
        notes: voiceNote ? { voice: voiceNote } : Prisma.DbNull,
        actualHours: Prisma.DbNull,
        actualStartTime: null,
        actualCompletedTime: null,
        completedAt: null,
        notifiedOverdue: false,
        notifiedDeadline: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    const created = await prisma.task.createMany({
      data: taskInstances.map((t) => ({ id: randomUUID(), ...t })),
    });
    
    return NextResponse.json({ 
      success: true, 
      count: created.count,
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
    
    const now = new Date();
    
    const updateData: any = {
      updatedAt: now
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
    
    // Update notes, preserving any existing voice instruction
    if (notes !== undefined) {
      const existingNotes = existingTask.notes as any;
      const existingVoice =
        existingNotes && typeof existingNotes === 'object' && existingNotes.voice
          ? existingNotes.voice
          : null;

      if (notes === null) {
        updateData.notes = existingVoice ? { voice: existingVoice } : Prisma.DbNull;
      } else if (typeof notes === 'string') {
        updateData.notes = existingVoice ? { voice: existingVoice, text: notes } : notes;
      } else {
        updateData.notes = notes;
      }
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
    
    if (taskToDelete.deletedAt) {
      return NextResponse.json({ 
        success: true, 
        message: 'Task already deleted' 
      });
    }
    
    // Soft-delete: keep the row for reporting but free the audio.
    // The voice note is removed from `notes` so the stored audio is released
    // while the task's history stays available in the report.
    const existingNotes = taskToDelete.notes as any;
    const reportNotes =
      existingNotes && typeof existingNotes === "object"
        ? (typeof existingNotes.text === "string" ? existingNotes.text : null)
        : (typeof existingNotes === "string" ? existingNotes : null);

    await prisma.task.updateMany({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: sessionUser?.email || null,
        notes: reportNotes ? { text: reportNotes } : Prisma.DbNull,
        updatedAt: new Date(),
      },
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
