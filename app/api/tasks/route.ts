import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { auth } from '@/auth';
import { ObjectId } from 'mongodb';

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
const getUserDetails = async (db: any, email: string) => {
  let user = await db.collection('staff').findOne({ email });
  if (!user) {
    user = await db.collection('users').findOne({ email });
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
    
    const client = await clientPromise;
    const db = client.db();
    
    const currentStaff = await getUserDetails(db, sessionUser.email);
    
    const userRole = currentStaff?.role || sessionUser?.role || 'STAFF';
    const userPermissions = currentStaff?.permissions || {};
    const userEmail = sessionUser?.email;
    
    const canViewAllTasks = isAdminRole(userRole) || userPermissions.canAssignTasks === true;
    
    let query: any = {};
    
    if (!canViewAllTasks) {
      query['assignedTo.email'] = userEmail;
    } else {
      const assignedToEmail = searchParams.get('assignedTo');
      if (assignedToEmail && assignedToEmail !== '') {
        query['assignedTo.email'] = assignedToEmail;
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
    
    const tasks = await db.collection('tasks')
      .find(query)
      .sort({ startTime: -1 })
      .toArray();
    
    return NextResponse.json({ success: true, tasks });
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
    const client = await clientPromise;
    const db = client.db();
    
    const currentStaff = await getUserDetails(db, sessionUser.email);
    
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
    
    let assignedUser = await db.collection('staff').findOne({ 
      $or: [{ _id: new ObjectId(assignedToId) }, { email: assignedToEmail }] 
    });
    
    if (!assignedUser) {
      assignedUser = await db.collection('users').findOne({ 
        $or: [{ _id: assignedToId }, { email: assignedToEmail }] 
      });
    }
    
    if (!assignedUser) {
      return NextResponse.json({ error: 'Assigned user not found' }, { status: 404 });
    }
    
    const task = {
      title: title.trim(),
      description: description.trim(),
      assignedTo: {
        userId: assignedUser._id.toString(),
        name: assignedUser.name,
        email: assignedUser.email,
      },
      assignedBy: {
        userId: currentStaff?._id?.toString() || sessionUser?.email,
        name: currentStaff?.name || sessionUser?.name || 'Unknown',
        email: sessionUser?.email,
        role: userRole
      },
      startTime: startDate,
      endTime: endDate,
      priority: priority || 'medium',
      estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
      status: 'pending',
      notes: null,
      actualHours: null,
      actualStartTime: null,
      actualCompletedTime: null,
      completedAt: null,
      notifiedOverdue: false,
      notifiedDeadline: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('tasks').insertOne(task);
    const createdTask = { ...task, _id: result.insertedId };
    
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
    const client = await clientPromise;
    const db = client.db();
    
    const currentStaff = await getUserDetails(db, sessionUser.email);
    const userRole = currentStaff?.role || sessionUser?.role || 'STAFF';
    const userEmail = sessionUser?.email;
    
    const existingTask = await db.collection('tasks').findOne({ 
      _id: new ObjectId(id) 
    });
    
    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    
    const canUpdateAnyTask = isAdminRole(userRole);
    const isAssignedToUser = existingTask.assignedTo.email === userEmail;
    
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
      updateData.notes = notes;
    }
    
    // Update actual hours manually
    if (actualHours !== undefined) {
      updateData.actualHours = parseFloat(actualHours);
    }
    
    const result = await db.collection('tasks').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    
    const updatedTask = await db.collection('tasks').findOne({ 
      _id: new ObjectId(id) 
    });
    
    return NextResponse.json({ 
      success: true, 
      message: 'Task updated successfully',
      task: updatedTask
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
    const client = await clientPromise;
    const db = client.db();
    
    const currentStaff = await getUserDetails(db, sessionUser.email);
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
    
    const taskToDelete = await db.collection('tasks').findOne({ 
      _id: new ObjectId(id) 
    });
    
    if (!taskToDelete) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    
    const result = await db.collection('tasks').deleteOne({ 
      _id: new ObjectId(id) 
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