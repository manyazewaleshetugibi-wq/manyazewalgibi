import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { getToken } from 'next-auth/jwt';

export async function POST(request: NextRequest) {

  
  try {
    // Identity comes exclusively from the signed session cookie (never from request headers)
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const userId = token.id as string;
    const userEmail = token.email as string;




    const body = await request.json();
    const { currentPassword, newPassword } = body;
    

    
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Current password and new password are required' },
        { status: 400 }
      );
    }
    
    // Find user
    const user = await prisma.user.findUnique({ where: { id: token.id as string } });
    
    if (!user) {

      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    


    
    // IMPORTANT: Check if password change is required
    const requiresChange = user.requiresPasswordChange ?? true; // Default to true if field doesn't exist
    

    
    if (!requiresChange) {

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

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password || '');
    
    if (!isPasswordValid) {

      return NextResponse.json(
        { success: false, message: 'Current password is incorrect' },
        { status: 401 }
      );
    }
    

    
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

    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
    
    const collectionName = "users";

    
    // CRITICAL: Update BOTH password AND requiresPasswordChange field to false

    const updateResult = await prisma.user.updateMany(
      { 
        where: { id: token.id as string },
        data: { 
          password: hashedNewPassword,
          requiresPasswordChange: false,
          lastPasswordChange: new Date(),
          updatedAt: new Date()
        }
      }
    );
    

    
    if (updateResult.count === 0) {
      console.error('❌ Failed to update user in database');
      return NextResponse.json(
        { success: false, message: 'Failed to update password' },
        { status: 500 }
      );
    }
    

    
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
      maxAge: 120
    });
    
    // Set a secure flag for the frontend to detect immediate session refresh
    response.cookies.set('force-session-refresh', 'true', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30
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
