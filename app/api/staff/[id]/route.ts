import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import { requireAdmin } from '@/lib/api-auth';

// Define role-based permissions
const rolePermissions: Record<string, string[]> = {
  admin: [
    'manage_users',
    'view_dashboard',
    'manage_inventory',
    'view_stock',
    'manage_purchases',
    'view_reports',
    'manage_suppliers',
    'manage_orders',
    'view_orders',
    'update_order_status',
    'manage_kitchen',
    'view_menu',
    'manage_menu',
    'manage_finance',
    'view_finance',
    'manage_marketing',
    'view_marketing',
    'manage_settings'
  ],
  kitchen: [
    'view_orders',
    'update_order_status',
    'manage_kitchen',
    'view_menu',
    'view_inventory'
  ],
  stock_manager: [
    'manage_inventory',
    'view_stock',
    'manage_purchases',
    'view_reports',
    'manage_suppliers'
  ],
  purchasing: [
    'manage_purchases',
    'view_purchases',
    'create_purchase_orders',
    'view_suppliers',
    'manage_suppliers',
    'view_stock',
    'manage_purchase_requests',
    'view_reports'
  ],
  delivery: [
    'view_delivery_orders',
    'update_delivery_status',
    'track_deliveries',
    'view_assigned_orders',
    'update_order_delivery'
  ],
  fb: [
    'manage_menu',
    'view_menu',
    'manage_categories',
    'view_orders'
  ],
  marketing: [
    'manage_marketing',
    'view_marketing',
    'create_content',
    'manage_blog'
  ],
  finance: [
    'manage_finance',
    'view_finance',
    'view_reports',
    'manage_expenses'
  ],
  pos: [
    'manage_orders',
    'view_orders',
    'create_orders',
    'process_payments'
  ],
  waitress: [
    'view_orders',
    'create_orders',
    'update_order_status',
    'view_menu'
  ],
  other: [
    'view_attendance'
  ]
};

// Password hashing utility with bcrypt
const hashPassword = async (password: string): Promise<string> => {
  try {
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const hash = await bcrypt.hash(password, salt);
    return hash;
  } catch (error) {
    console.error('Error hashing password:', error);
    throw new Error('Failed to hash password');
  }
};

// Check if password is already hashed with bcrypt format
const isAlreadyHashed = (password: string): boolean => {
  const bcryptRegex = /^\$2[ayb]\$\d{2}\$[A-Za-z0-9./]{53}$/;
  return bcryptRegex.test(password);
};

// GET single user by ID - Returns only text message
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const { id } = await params;
    
    const client = await clientPromise;
    const db = client.db('gold');
    const usersCollection = db.collection('users');
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'Invalid user ID format' }, { status: 400 });
    }
    
    const user = await usersCollection.findOne(
      { _id: new ObjectId(id) },
      { projection: { password: 0 } }
    );
    
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, message: `Staff member: ${user.name}`, user }, { status: 200 });
    
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch staff member' }, { status: 500 });
  }
}

// PUT update user - Returns only text message
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const { id } = await params;
    
    const client = await clientPromise;
    const db = client.db('gold');
    const usersCollection = db.collection('users');
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'Invalid user ID format' }, { status: 400 });
    }
    
    const body = await request.json();
    const {
      name,
      email,
      phone,
      employeeId,
      role,
      password,
      status,
      permissions
    } = body;
    
    // Check if user exists
    const existingUser = await usersCollection.findOne({ _id: new ObjectId(id) });
    if (!existingUser) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }
    
    // Check if email is being changed and already exists
    if (email && email !== existingUser.email) {
      const emailExists = await usersCollection.findOne({
        email: email.toLowerCase(),
        _id: { $ne: new ObjectId(id) }
      });
      if (emailExists) {
        return NextResponse.json({ success: false, message: 'Email already in use' }, { status: 400 });
      }
    }
    
    // Check if employeeId is being changed and already exists
    if (employeeId && employeeId !== existingUser.employeeId) {
      const employeeIdExists = await usersCollection.findOne({ 
        employeeId,
        _id: { $ne: new ObjectId(id) }
      });
      if (employeeIdExists) {
        return NextResponse.json({ success: false, message: 'Employee ID already exists' }, { status: 400 });
      }
    }
    
    // Validate role if provided
    if (role) {
      const validRoles = ['admin', 'kitchen', 'stock_manager', 'purchasing', 'delivery', 'fb', 'marketing', 'finance', 'pos', 'waitress', 'other'];
      if (!validRoles.includes(role)) {
        return NextResponse.json({ success: false, message: 'Invalid role' }, { status: 400 });
      }
    }
    
    // Validate status if provided
    if (status) {
      const validStatuses = ['active', 'inactive', 'suspended'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ success: false, message: 'Invalid status' }, { status: 400 });
      }
    }
    
    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    };
    
    if (name !== undefined) updateData.name = name.trim();
    if (email !== undefined) updateData.email = email.toLowerCase().trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (employeeId !== undefined) updateData.employeeId = employeeId.toUpperCase().trim();
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
    if (permissions !== undefined) updateData.permissions = permissions;
    
    // If role is being updated, update permissions automatically
    if (role !== undefined && rolePermissions[role]) {
      updateData.permissions = rolePermissions[role];
    }
    
    // Hash password if provided and not already hashed
    if (password !== undefined && password !== '') {
      if (isAlreadyHashed(password)) {
        updateData.password = password;
      } else {
        updateData.password = await hashPassword(password);
      }
    }
    
    // Update user
    const result = await usersCollection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { 
        returnDocument: 'after',
        projection: { password: 0 }
      }
    );
    
    if (!result) {
      return NextResponse.json({ success: false, message: 'Failed to update user' }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, message: 'Staff member updated successfully' }, { status: 200 });
    
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json({ success: false, message: 'Failed to update staff member' }, { status: 500 });
  }
}

// DELETE user - Returns only text message
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const { id } = await params;
    
    const client = await clientPromise;
    const db = client.db('gold');
    const usersCollection = db.collection('users');
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'Invalid user ID format' }, { status: 400 });
    }
    
    const user = await usersCollection.findOne({ _id: new ObjectId(id) });
    
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }
    
    // Prevent deleting the last admin user
    if (user.role === 'admin') {
      const adminCount = await usersCollection.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return NextResponse.json({ success: false, message: 'Cannot delete the last admin user' }, { status: 400 });
      }
    }
    
    await usersCollection.deleteOne({ _id: new ObjectId(id) });
    
    return NextResponse.json({ success: true, message: 'Staff member deleted successfully' }, { status: 200 });
    
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ success: false, message: 'Failed to delete staff member' }, { status: 500 });
  }
}

// PATCH endpoint for password change - Returns only text message
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const { id } = await params;
    
    const client = await clientPromise;
    const db = client.db('gold');
    const usersCollection = db.collection('users');
    
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: 'Invalid user ID format' }, { status: 400 });
    }
    
    const body = await request.json();
    
    // Handle PIN update
    if (body.pin !== undefined) {
      const { pin } = body;
      if (!/^\d{4}$/.test(pin)) {
        return NextResponse.json({ success: false, message: 'PIN must be exactly 4 digits' }, { status: 400 });
      }
      const hashedPin = await bcrypt.hash(pin, 10);
      await usersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { pin: hashedPin, updatedAt: new Date() } }
      );
      return NextResponse.json({ success: true, message: 'PIN updated successfully' }, { status: 200 });
    }
    
    // Handle password update
    const { currentPassword, newPassword } = body;
    
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ success: false, message: 'Current password and new password are required' }, { status: 400 });
    }
    
    // Validate new password strength
    if (newPassword.length < 8) {
      return NextResponse.json({ success: false, message: 'New password must be at least 8 characters long' }, { status: 400 });
    }
    
    // Get user with password
    const user = await usersCollection.findOne({ _id: new ObjectId(id) });
    
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }
    
    // Verify current password using bcrypt
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      return NextResponse.json({ success: false, message: 'Current password is incorrect' }, { status: 401 });
    }
    
    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);
    
    // Update password
    await usersCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          password: hashedNewPassword,
          requiresPasswordChange: false,
          updatedAt: new Date()
        } 
      }
    );
    
    return NextResponse.json({ success: true, message: 'Password updated successfully' }, { status: 200 });
    
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json({ success: false, message: 'Failed to update user' }, { status: 500 });
  }
}
