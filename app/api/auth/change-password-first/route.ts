import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import bcrypt from 'bcrypt';
import { getToken } from 'next-auth/jwt';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  console.log('🔐 Change password API called');
  
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET || '',
      secureCookie: isProduction,
      cookieName: isProduction
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
    });

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('👤 User ID from token:', token.id);
    console.log('📧 User email from token:', token.email);
    console.log('🔑 Current requiresPasswordChange in token:', token.requiresPasswordChange);

    const client = await clientPromise;
    const db = client.db('gold');
    
    const body = await request.json();
    const { currentPassword, newPassword } = body;
    
    console.log('📝 Password change request received');
    
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Current password and new password are required' },
        { status: 400 }
      );
    }
    
    // Convert string ID to ObjectId
    let userId;
    try {
      userId = new ObjectId(token.id);
      console.log('✅ User ID converted to ObjectId:', userId);
    } catch (error) {
      console.error('❌ Invalid user ID format:', error);
      return NextResponse.json(
        { success: false, message: 'Invalid user ID format' },
        { status: 400 }
      );
    }
    
    // Find user - search in users collection
    const user = await db.collection("users").findOne({ _id: userId });
    
    if (!user) {
      console.log('❌ User not found with ID:', token.id);
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    console.log('✅ User found:', user.email);
    console.log('📋 Current user data:', {
      requiresPasswordChange: user.requiresPasswordChange,
      hasField: 'requiresPasswordChange' in user,
      employeeId: user.employeeId
    });
    
    // IMPORTANT: Check if password change is required
    const requiresChange = user.requiresPasswordChange ?? true; // Default to true if field doesn't exist
    
    console.log('🔑 Password change required?', requiresChange);
    
    if (!requiresChange) {
      console.log('ℹ️ Password change not required for this user');
      return NextResponse.json(
        { 
          success: false, 
          message: 'Password change is not required for your account. You can access the system directly.',
          code: 'NO_CHANGE_REQUIRED'
        },
        { status: 400 }
      );
    }
    
    // Verify current password
    console.log('🔐 Verifying current password...');
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    
    if (!isPasswordValid) {
      console.log('❌ Current password is incorrect');
      return NextResponse.json(
        { success: false, message: 'Current password is incorrect' },
        { status: 401 }
      );
    }
    
    console.log('✅ Current password verified');
    
    // Validate new password strength
    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, message: 'New password must be at least 8 characters long' },
        { status: 400 }
      );
    }
    
    // Check password complexity
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~]/.test(newPassword);
    
    console.log('📊 Password complexity check:', {
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar
    });
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'New password must contain uppercase, lowercase, number, and special character' 
        },
        { status: 400 }
      );
    }
    
    // Check if new password is different from current password
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { success: false, message: 'New password must be different from current password' },
        { status: 400 }
      );
    }
    
    // Hash new password
    console.log('🔐 Hashing new password...');
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Determine collection name based on user data
    const collectionName = "users";
    console.log('📁 Using collection:', collectionName);
    
    // CRITICAL: Update BOTH password AND requiresPasswordChange field to false
    console.log('💾 Updating user in database...');
    const updateResult = await db.collection(collectionName).updateOne(
      { _id: userId },
      { 
        $set: { 
          password: hashedNewPassword,
          requiresPasswordChange: false, // ← SET TO FALSE
          lastPasswordChange: new Date(),
          updatedAt: new Date()
        } 
      }
    );
    
    console.log('📊 Database update result:', {
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount,
      acknowledged: updateResult.acknowledged
    });
    
    if (updateResult.modifiedCount === 0) {
      console.error('❌ Failed to update user in database');
      return NextResponse.json(
        { success: false, message: 'Failed to update password' },
        { status: 500 }
      );
    }
    
    console.log('✅ Password updated successfully, requiresPasswordChange set to false');
    
    // 🔴 CRITICAL: Set a cookie that middleware can use to refresh the session
    // This tells the client that password was changed and session needs refresh
    const response = NextResponse.json({
      success: true,
      message: 'Password changed successfully. Please wait while we update your session...',
      data: { 
        requiresPasswordChange: false,
        // Add refresh instructions for frontend
        refreshSession: true,
        redirectTo: '/api/auth/session?refresh=true'
      }
    });
    
    // Set a cookie that will be checked by middleware
    response.cookies.set('password-changed', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 // 30 seconds - short-lived cookie
    });
    
    // Also set a flag for the frontend
    response.cookies.set('password-change-complete', 'true', {
      httpOnly: false, // Allow frontend to read this
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30
    });
    
    // Set a secure flag for the frontend to detect immediate session refresh
    response.cookies.set('force-session-refresh', 'true', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 // 5 seconds - very short-lived
    });
    
    return response;
    
  } catch (error: any) {
    console.error('🔥 Change password error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to change password', error: error.message },
      { status: 500 }
    );
  }
}
