import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth';

export async function GET(request: NextRequest) {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Not authenticated' 
        },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    // Get user ID from session
    const userId = (session.user as any).id;

    if (!userId || !ObjectId.isValid(userId)) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid user ID format' 
        },
        { status: 400 }
      );
    }

    // Find user by ID - return ALL fields exactly as stored in database
    const user = await db.collection('users').findOne({ 
      _id: new ObjectId(userId) 
    });

    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'User not found' 
        },
        { status: 404 }
      );
    }

    // Remove sensitive information but keep all other fields
    const { password, ...userWithoutPassword } = user;

    // Log the user data to debug (remove in production)
    console.log('User data fetched from DB:', {
      _id: userWithoutPassword._id,
      firstName: userWithoutPassword.firstName,
      lastName: userWithoutPassword.lastName,
      email: userWithoutPassword.email,
      phone: userWithoutPassword.phone,
      address: userWithoutPassword.address,
      location: userWithoutPassword.location,
    });

    // Extract city from address
    const extractCityFromAddress = (address: string): string => {
      if (!address) return 'Addis Ababa';
      
      const addressParts = address.split(',');
      
      // Look for common Ethiopian cities
      const cityKeywords = [
        'addis ababa', 'bole', 'kazanchis', 'megenagna', 'piassa',
        'merkato', 'sarbet', 'cazanchis', 'old airport', 'new airport',
        'ayertena', 'summit', 'gerji', 'atlas', 'gotera', 'lafto',
        'mexico', 'saris', 'kera', 'akaki', 'kality', 'kaliti'
      ];
      
      // Check each part for city keywords
      for (const part of addressParts) {
        const trimmedPart = part.trim().toLowerCase();
        if (cityKeywords.some(keyword => trimmedPart.includes(keyword))) {
          return part.trim();
        }
      }
      
      // If address has multiple parts, use the second last part as city
      if (addressParts.length > 1) {
        return addressParts[addressParts.length - 2]?.trim() || 'Addis Ababa';
      }
      
      return 'Addis Ababa';
    };

    // Return the complete user data structure EXACTLY as stored in database
    return NextResponse.json({
      success: true,
      data: {
        // Keep the original _id for MongoDB compatibility
        _id: userWithoutPassword._id.toString(),
        // Also include id for frontend convenience
        id: userWithoutPassword._id.toString(),
        
        // Personal Information
        firstName: userWithoutPassword.firstName || '',
        lastName: userWithoutPassword.lastName || '',
        email: userWithoutPassword.email || '',
        phone: userWithoutPassword.phone || '', // This will be "0989898989"
        
        // Dates
        birthDate: userWithoutPassword.birthDate || null,
        
        // Demographics
        gender: userWithoutPassword.gender || '',
        
        // Address Information
        address: userWithoutPassword.address || '', // Full address string
        city: extractCityFromAddress(userWithoutPassword.address || ''),
        
        // Location Data (GeoJSON format)
        location: userWithoutPassword.location || {
          type: 'Point',
          coordinates: [0, 0]
        },
        
        // Account Information
        role: userWithoutPassword.role || 'user',
        registrationSource: userWithoutPassword.registrationSource || 'website',
        locationConsent: userWithoutPassword.locationConsent || false,
        
        // Timestamps
        createdAt: userWithoutPassword.createdAt,
        updatedAt: userWithoutPassword.updatedAt,
        lastLogin: userWithoutPassword.lastLogin || null,
        
        // Security
        loginAttempts: userWithoutPassword.loginAttempts || 0,
        __v: userWithoutPassword.__v,
        
        // Additional fields that might exist
        image: userWithoutPassword.image,
        employeeId: userWithoutPassword.employeeId,
        permissions: userWithoutPassword.permissions,
        status: userWithoutPassword.status,
        requiresPasswordChange: userWithoutPassword.requiresPasswordChange,
        googleId: userWithoutPassword.googleId,
        emailVerified: userWithoutPassword.emailVerified,
        specialization: userWithoutPassword.specialization,
        shift: userWithoutPassword.shift
      }
    });

  } catch (error: any) {
    console.error('Error fetching current user:', error);

    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch user data',
        error: error.message 
      },
      { status: 500 }
    );
  }
}