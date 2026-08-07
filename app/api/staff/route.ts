import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';
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
  barista: [
    'view_orders',
    'update_order_status',
    'view_menu',
    'view_inventory'
  ],
  coffee_maker: [
    'view_orders',
    'update_order_status',
    'view_menu',
    'view_inventory'
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

// GET all staff - Returns only text message
export async function GET(request: NextRequest) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    
    let query: any = {
      role: { not: 'user' }
    };
    
    if (role) {
      if (role === 'user') {
        return new NextResponse('No staff users found', { status: 200 });
      }
      query.role = role;
    }
    
    if (status) {
      query.status = status;
    }
    
    const users = await prisma.user.findMany({
      where: query,
      orderBy: { createdAt: 'desc' },
    });
    
    const sanitizedUsers = users.map((u: any) => {
      const { password, ...rest } = u;
      return { ...rest, _id: u.id };
    });
    
    return NextResponse.json({ success: true, data: sanitizedUsers }, { status: 200 });
    
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return new NextResponse('Failed to fetch staff', { status: 500 });
  }
}

// POST create new user - Returns only text message
export async function POST(request: NextRequest) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const body = await request.json();
    
    const {
      name,
      email,
      phone,
      employeeId,
      role,
      password,
      status = 'active',
      permissions = [],
      requiresPasswordChange = true
    } = body;
    
    // Validation
    const missingFields = [];
    if (!name) missingFields.push('name');
    if (!email) missingFields.push('email');
    if (!phone) missingFields.push('phone');
    if (!employeeId) missingFields.push('employeeId');
    if (!role) missingFields.push('role');
    if (!password) missingFields.push('password');
    
    if (missingFields.length > 0) {
      return new NextResponse(`Missing required fields: ${missingFields.join(', ')}`, { status: 400 });
    }
    
    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return new NextResponse('Invalid email format', { status: 400 });
    }
    
    // Check if email already exists
    const existingUserByEmail = await prisma.user.findFirst({ where: { email: email.toLowerCase() } });
    if (existingUserByEmail) {
      return new NextResponse('Email already registered', { status: 400 });
    }
    
    // Check if employeeId already exists
    const existingUserById = await prisma.user.findFirst({ where: { employeeId: employeeId.toUpperCase() } });
    if (existingUserById) {
      return new NextResponse('Employee ID already exists', { status: 400 });
    }
    
    // Validate role
    const validRoles = ['admin', 'kitchen', 'stock_manager', 'purchasing', 'delivery', 'fb', 'marketing', 'finance', 'pos', 'waitress', 'barista', 'coffee_maker', 'other'];
    if (!validRoles.includes(role)) {
      return new NextResponse(`Invalid role. Must be one of: ${validRoles.join(', ')}`, { status: 400 });
    }
    
    // Validate status
    const validStatuses = ['active', 'inactive', 'suspended'];
    if (status && !validStatuses.includes(status)) {
      return new NextResponse('Invalid status', { status: 400 });
    }
    
    // Get permissions based on role
    const rolePerms = rolePermissions[role] || [];
    const finalPermissions = permissions.length > 0 ? permissions : rolePerms;
    
    // Hash password
    let hashedPassword;
    try {
      hashedPassword = await hashPassword(password);
    } catch (hashError) {
      return new NextResponse('Failed to secure password', { status: 500 });
    }
    
    // Create new user document
    const newUser = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      employeeId: employeeId.toUpperCase().trim(),
      role,
      password: hashedPassword,
      status,
      permissions: finalPermissions,
      requiresPasswordChange: requiresPasswordChange,
      loginAttempts: 0,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await prisma.user.create({
      data: { id: randomUUID(), ...newUser }
    });
    
    // Return ONLY text message - NO JSON data
    return new NextResponse('Staff registered successfully', { status: 201 });
    
  } catch (error: any) {
    console.error('Error creating user:', error);
    return new NextResponse('Failed to create staff member', { status: 500 });
  }
}

// PUT update user - Returns only text message
export async function PUT(request: NextRequest) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return new NextResponse('User ID is required', { status: 400 });
    }
    
    // Remove sensitive fields
    delete updateData.password;
    delete updateData.createdAt;
    delete updateData._id;
    
    // If role is being updated, update permissions too
    if (updateData.role && rolePermissions[updateData.role]) {
      updateData.permissions = rolePermissions[updateData.role];
    }
    
    updateData.updatedAt = new Date();
    
    const result = await prisma.user.updateMany({ where: { id }, data: updateData });
    
    if (result.count === 0) {
      return new NextResponse('User not found', { status: 404 });
    }
    
    // Return ONLY text message - NO JSON data
    return new NextResponse('Staff member updated successfully', { status: 200 });
    
  } catch (error: any) {
    console.error('Error updating user:', error);
    return new NextResponse('Failed to update staff member', { status: 500 });
  }
}

// DELETE user - Returns only text message
export async function DELETE(request: NextRequest) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return new NextResponse('User ID is required', { status: 400 });
    }
    
    const user = await prisma.user.findUnique({ where: { id } });
    
    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }
    
    // Prevent deleting the last admin user
    if (user.role === 'admin') {
      const adminCount = await prisma.user.count({ where: { role: 'admin' } });
      if (adminCount <= 1) {
        return new NextResponse('Cannot delete the last admin user', { status: 400 });
      }
    }
    
    const result = await prisma.user.deleteMany({ where: { id } });
    
    if (result.count === 0) {
      return new NextResponse('User not found', { status: 404 });
    }
    
    // Return ONLY text message - NO JSON data
    return new NextResponse('Staff member deleted successfully', { status: 200 });
    
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return new NextResponse('Failed to delete staff member', { status: 500 });
  }
}
