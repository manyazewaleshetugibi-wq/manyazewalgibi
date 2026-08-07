import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const { response } = await requireAdmin();
    if (response) return response;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const active = searchParams.get('active');

    // Build query to get users with role "user"
    const query: any = {
      role: 'user'
    };
    
    // Filter by active status if specified (users are always active unless specified)
    if (active === 'true') {
      // You might want to add an isActive field or consider users with loginAttempts < 5 as active
      query.loginAttempts = { lt: 5 };
    }

    // Fetch all users with role "user" from database
    const users = await prisma.user.findMany({ where: query });



    // Map users to Employee interface format with ALL fields
    const participants = users.map(user => {
      // Extract birth month and day from birthDate
      let birthMonth = null;
      let birthDay = null;
      let birthDate = null;
      let formattedBirthDate = '';
      
      if (user.birthDate) {
        try {
          const date = new Date(user.birthDate);
          // Check if valid date
          if (!isNaN(date.getTime())) {
            birthMonth = date.getMonth() + 1; // JavaScript months are 0-indexed
            birthDay = date.getDate();
            birthDate = user.birthDate;
            
            // Format date for display
            formattedBirthDate = date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
          }
        } catch (error) {
          console.error('Error parsing birth date for user:', user.id, error);
        }
      }

      // Generate initials from firstName and lastName
      const firstName = user.firstName || '';
      const lastName = user.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      
      const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || 'U';

      // Extract city from address if available
      let city = '';
      let extractedAddress = user.address || '';
      
      if (extractedAddress) {
        const addressParts = extractedAddress.split(',');
        // Look for city in address (usually the second last or last part)
        if (addressParts.length > 1) {
          // Try to find a part that looks like a city (not containing numbers/zip codes)
          for (let i = addressParts.length - 1; i >= 0; i--) {
            const part = addressParts[i].trim();
            // If it doesn't look like a zip code (contains letters and maybe numbers)
            if (part && !/^\d+$/.test(part) && part.length > 2) {
              city = part;
              break;
            }
          }
          // Fallback to second last part
          if (!city && addressParts.length > 1) {
            city = addressParts[addressParts.length - 2]?.trim() || '';
          }
        }
      }

      // Determine if user is active based on loginAttempts or other criteria
      const isActive = (user.loginAttempts || 0) < 5; // Consider active if less than 5 failed attempts

      return {
        id: user.id,
        firstName: firstName,
        lastName: lastName,
        name: fullName || 'Unknown User',
        email: user.email || '',
        phone: user.phone || '',
        birthDate: birthDate,
        birthMonth: birthMonth,
        birthDay: birthDay,
        formattedBirthDate: formattedBirthDate,
        gender: user.gender || '',
        address: extractedAddress,
        city: city,
        location: user.location || null,
        locationConsent: user.locationConsent || false,
        avatar: user.image || user.avatar || '',
        initials: initials,
        department: user.department || 'General',
        joinDate: user.createdAt || new Date().toISOString(),
        isActive: isActive,
        lotteryTickets: user.lotteryTickets || 1,
        hasWonThisMonth: user.hasWonThisMonth || false,
        lastWinDate: user.lastWinDate || null,
        totalWins: user.totalWins || 0,
        points: user.points || 0,
        registrationSource: user.registrationSource || 'website',
        lastLogin: user.lastLogin || null,
        loginAttempts: user.loginAttempts || 0,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    });

    // Log sample data to verify
    if (participants.length > 0) {

    }

    // Filter by month if specified
    const filteredParticipants = month 
      ? participants.filter(p => p.birthMonth === parseInt(month))
      : participants;

    // Sort by birth day for better display
    if (month) {
      filteredParticipants.sort((a, b) => (a.birthDay || 0) - (b.birthDay || 0));
    }

    return NextResponse.json({
      success: true,
      data: filteredParticipants,
      total: filteredParticipants.length,
      allTotal: participants.length,
      month: month ? parseInt(month) : null
    });

  } catch (error: any) {
    console.error('Error fetching lottery participants:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch lottery participants',
        error: error.message 
      },
      { status: 500 }
    );
  }
}
