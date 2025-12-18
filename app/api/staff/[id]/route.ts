import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';

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
  ]
};

// Password hashing utility with PBKDF2
const hashPassword = (password: string): string => {
  const salt = crypto.randomBytes(16).toString('hex');
  const iterations = 100000;
  const keylen = 64;
  const digest = 'sha512';
  
  const hash = crypto.pbkdf2Sync(password, salt, iterations, keylen, digest).toString('hex');
  return `${salt}:${iterations}:${keylen}:${digest}:${hash}`;
};

// Check if password is already hashed (for backward compatibility)
const isAlreadyHashed = (password: string): boolean => {
  const parts = password.split(':');
  return parts.length === 5 && 
         !!parts[1]?.match(/^\d+$/) && 
         !!parts[2]?.match(/^\d+$/);
};

// Password verification utility
const verifyPassword = (password: string, storedHash: string): boolean => {
  try {
    const [salt, iterationsStr, keylenStr, digest, originalHash] = storedHash.split(':');
    const iterations = parseInt(iterationsStr, 10);
    const keylen = parseInt(keylenStr, 10);
    
    const hash = crypto.pbkdf2Sync(password, salt, iterations, keylen, digest).toString('hex');
    return hash === originalHash;
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
};

// GET single user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db('gold');
    const usersCollection = db.collection('users'); // Changed to 'users'
    
    // Validate ObjectId
    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid user ID format' },
        { status: 400 }
      );
    }
    
    const user = await usersCollection.findOne(
      { _id: new ObjectId(params.id) },
      { projection: { password: 0 } } // Exclude password
    );
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: user
    });
    
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch user', error: error.message },
      { status: 500 }
    );
  }
}

// PUT update user
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db('gold');
    const usersCollection = db.collection('users'); // Changed to 'users'
    
    // Validate ObjectId
    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid user ID format' },
        { status: 400 }
      );
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
    const existingUser = await usersCollection.findOne({ _id: new ObjectId(params.id) });
    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if email is being changed and already exists
    if (email && email !== existingUser.email) {
      const emailExists = await usersCollection.findOne({
        email: email.toLowerCase(),
        _id: { $ne: new ObjectId(params.id) }
      });
      if (emailExists) {
        return NextResponse.json(
          { success: false, message: 'Email already in use' },
          { status: 400 }
        );
      }
    }
    
    // Check if employeeId is being changed and already exists
    if (employeeId && employeeId !== existingUser.employeeId) {
      const employeeIdExists = await usersCollection.findOne({ 
        employeeId,
        _id: { $ne: new ObjectId(params.id) }
      });
      if (employeeIdExists) {
        return NextResponse.json(
          { success: false, message: 'Employee ID already exists' },
          { status: 400 }
        );
      }
    }
    
    // Validate role if provided
    if (role) {
      const validRoles = ['admin', 'kitchen', 'stock_manager', 'fb', 'marketing', 'finance', 'pos', 'waitress'];
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { success: false, message: 'Invalid role' },
          { status: 400 }
        );
      }
    }
    
    // Validate status if provided
    if (status) {
      const validStatuses = ['active', 'inactive', 'suspended'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, message: 'Invalid status' },
          { status: 400 }
        );
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
    
    // Hash password if provided and not already hashed
    if (password !== undefined) {
      if (isAlreadyHashed(password)) {
        // If it's already hashed (for backward compatibility or migration)
        updateData.password = password;
      } else {
        // Hash the new password
        updateData.password = hashPassword(password);
      }
    }
    
    // Update user
    const result = await usersCollection.findOneAndUpdate(
      { _id: new ObjectId(params.id) },
      { $set: updateData },
      { 
        returnDocument: 'after',
        projection: { password: 0 } // Exclude password from response
      }
    );
    
    if (!result) {
      return NextResponse.json(
        { success: false, message: 'Failed to update user' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      data: result
    });
    
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update user', error: error.message },
      { status: 500 }
    );
  }
}

// DELETE user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db('gold');
    const usersCollection = db.collection('users'); // Changed to 'users'
    
    // Validate ObjectId
    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid user ID format' },
        { status: 400 }
      );
    }
    
    const user = await usersCollection.findOne({ _id: new ObjectId(params.id) });
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Prevent deleting admin users (optional)
    if (user.role === 'admin') {
      // Check if this is the last admin
      const adminCount = await usersCollection.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return NextResponse.json(
          { success: false, message: 'Cannot delete the last admin user' },
          { status: 400 }
        );
      }
    }
    
    await usersCollection.deleteOne({ _id: new ObjectId(params.id) });
    
    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });
    
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete user', error: error.message },
      { status: 500 }
    );
  }
}

// PATCH endpoint for password change with verification
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db('gold');
    const usersCollection = db.collection('users'); // Changed to 'users'
    
    // Validate ObjectId
    if (!ObjectId.isValid(params.id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid user ID format' },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { currentPassword, newPassword } = body;
    
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Current password and new password are required' },
        { status: 400 }
      );
    }
    
    // Get user with password
    const user = await usersCollection.findOne({ _id: new ObjectId(params.id) });
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    // Verify current password
    const isPasswordValid = verifyPassword(currentPassword, user.password);
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, message: 'Current password is incorrect' },
        { status: 401 }
      );
    }
    
    // Hash new password
    const hashedNewPassword = hashPassword(newPassword);
    
    // Update password
    await usersCollection.updateOne(
      { _id: new ObjectId(params.id) },
      { 
        $set: { 
          password: hashedNewPassword,
          updatedAt: new Date()
        } 
      }
    );
    
    return NextResponse.json({
      success: true,
      message: 'Password updated successfully'
    });
    
  } catch (error: any) {
    console.error('Error updating password:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update password', error: error.message },
      { status: 500 }
    );
  }
}