import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';

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
  // BCrypt hash format: $2a$[cost]$[salt][hash]
  // Example: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
  const bcryptRegex = /^\$2[ayb]\$\d{2}\$[A-Za-z0-9./]{53}$/;
  return bcryptRegex.test(password);
};

// Password verification utility with bcrypt
const verifyPassword = async (password: string, storedHash: string): Promise<boolean> => {
  try {
    const isMatch = await bcrypt.compare(password, storedHash);
    return isMatch;
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
};

// GET all staff
export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('gold');
    const usersCollection = db.collection('users');
    
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    
    let query: any = {
      role: { $ne: 'user' }
    };
    
    if (role) {
      if (role === 'user') {
        return NextResponse.json({
          success: true,
          data: [],
          count: 0
        });
      }
      query.role = role;
    }
    
    if (status) {
      query.status = status;
    }
    
    const users = await usersCollection.find(query).sort({ createdAt: -1 }).toArray();
    
    // Remove passwords from response
    const usersWithoutPasswords = users.map(({ password, ...rest }) => rest);
    
    return NextResponse.json({
      success: true,
      data: usersWithoutPasswords,
      count: usersWithoutPasswords.length
    });
    
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch users', error: error.message },
      { status: 500 }
    );
  }
}

// POST create new user
export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('gold');
    const usersCollection = db.collection('users');
    
    const body = await request.json();
    const {
      name,
      email,
      phone,
      employeeId,
      role,
      password,
      status = 'active',
      permissions = []
    } = body;
    
    // Validation
    if (!name || !email || !phone || !employeeId || !role || !password) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Check if email already exists
    const existingUserByEmail = await usersCollection.findOne({ email: email.toLowerCase() });
    if (existingUserByEmail) {
      return NextResponse.json(
        { success: false, message: 'Email already registered' },
        { status: 400 }
      );
    }
    
    // Check if employeeId already exists
    const existingUserById = await usersCollection.findOne({ employeeId });
    if (existingUserById) {
      return NextResponse.json(
        { success: false, message: 'Employee ID already exists' },
        { status: 400 }
      );
    }
    
    // Validate role
    const validRoles = ['admin', 'kitchen', 'stock_manager', 'fb', 'marketing', 'finance', 'pos', 'waitress'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, message: 'Invalid role' },
        { status: 400 }
      );
    }
    
    // Validate status
    const validStatuses = ['active', 'inactive', 'suspended'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Invalid status' },
        { status: 400 }
      );
    }
    
    // Get permissions based on role, or use provided ones
    const rolePerms = rolePermissions[role] || [];
    const finalPermissions = permissions.length > 0 ? permissions : rolePerms;
    
    // Hash password using bcrypt
    const hashedPassword = await hashPassword(password);
    
    // Create new user document - ADD requiresPasswordChange: true
    const newUser = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      employeeId: employeeId.toUpperCase().trim(),
      role,
      password: hashedPassword,
      status,
      permissions: finalPermissions,
      requiresPasswordChange: true, // ← CRITICAL: Force password change on first login
      loginAttempts: 0,
      lastLogin: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await usersCollection.insertOne(newUser);
    
    // Remove password from response
    const { password: _, ...userResponse } = newUser;
    
    return NextResponse.json({
      success: true,
      message: 'User registered successfully. User will be required to change password on first login.',
      data: {
        _id: result.insertedId,
        ...userResponse
      }
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create user', error: error.message },
      { status: 500 }
    );
  }
}