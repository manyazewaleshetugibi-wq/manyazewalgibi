import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db('gold'); // Use the correct database name
    const staffCollection = db.collection('users'); // Using users collection
    
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Find staff by email
    const staff = await staffCollection.findOne({ 
      email: email.toLowerCase().trim(),
      status: 'active' // Only allow active staff
    });
    
    if (!staff) {
      return NextResponse.json(
        { success: false, message: 'Invalid credentials or account inactive' },
        { status: 401 }
      );
    }
    
    // Check if account is locked due to too many failed attempts
    if (staff.loginAttempts >= 5 && staff.lastLogin) {
      const lockDuration = 15 * 60 * 1000; // 15 minutes in milliseconds
      const timeSinceLastAttempt = Date.now() - staff.lastLogin.getTime();
      
      if (timeSinceLastAttempt < lockDuration) {
        const remainingTime = Math.ceil((lockDuration - timeSinceLastAttempt) / 60000);
        return NextResponse.json(
          { 
            success: false, 
            message: `Account is temporarily locked. Try again in ${remainingTime} minutes.` 
          },
          { status: 423 }
        );
      }
    }
    
    // Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, staff.password);
    
    // Update login attempts
    if (!isPasswordValid) {
      const attempts = (staff.loginAttempts || 0) + 1;
      await staffCollection.updateOne(
        { _id: staff._id },
        { 
          $set: { 
            loginAttempts: attempts,
            lastLogin: new Date()
          } 
        }
      );
      
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // IMPORTANT: Check if this is a new user who needs to set their password
    // If password field doesn't exist or is empty/null, force password change
    const requiresPasswordChange = !staff.password || staff.password.trim() === '' || 
                                 staff.requiresPasswordChange === true;
    
    // Reset login attempts on successful login
    await staffCollection.updateOne(
      { _id: staff._id },
      { 
        $set: { 
          loginAttempts: 0,
          lastLogin: new Date(),
          // Update requiresPasswordChange field if it doesn't exist
          ...(staff.requiresPasswordChange === undefined && { 
            requiresPasswordChange: requiresPasswordChange 
          })
        } 
      }
    );
    
    // Generate JWT token
    const token = jwt.sign(
      {
        userId: staff._id.toString(),
        email: staff.email,
        name: staff.name,
        role: staff.role,
        permissions: staff.permissions,
        requiresPasswordChange: requiresPasswordChange, // Use the calculated value
        employeeId: staff.employeeId
      },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '8h' }
    );
    
   
    const { password: _, ...staffWithoutPassword } = staff;
    
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        user: staffWithoutPassword,
        token,
        requiresPasswordChange: requiresPasswordChange 
      }
    });
    
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Login failed', error: error.message },
      { status: 500 }
    );
  }
}

