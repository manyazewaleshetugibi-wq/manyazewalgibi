// app/api/auth/user-permissions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/auth";
import clientPromise from "@/lib/mongodb";

// ============================================
// 1. ALL ROLES FROM SIDEBAR
// ============================================
type UserRole = 
  | 'ADMIN' 
  | 'SUPER_ADMIN' 
  | 'KITCHEN' 
  | 'FB' 
  | 'MARKETING' 
  | 'FINANCE' 
  | 'STOCK_MANAGER' 
  | 'PURCHASING' 
  | 'DELIVERY' 
  | 'POS' 
  | 'WAITRESS' 
  | 'DEFAULT';

// ============================================
// 2. PROTECTED SIDEBAR PAGES ONLY
// ============================================
const ROUTE_PERMISSIONS = new Map([
  // Dashboard
  ['/dashboard', ['ADMIN']],
  
  // Stock Management
  ['/stock', ['ADMIN', 'FINANCE', 'STOCK_MANAGER', 'PURCHASING']],
  ['/scategory', ['ADMIN', 'FINANCE', 'STOCK_MANAGER']],
  ['/stockReport', ['ADMIN', 'FINANCE', 'STOCK_MANAGER', 'PURCHASING']],
  ['/purchase-request', ['ADMIN', 'FINANCE', 'STOCK_MANAGER', 'PURCHASING']],
  
  // Menu Management
  ['/items', ['ADMIN', 'FB']],
  ['/catagory', ['ADMIN', 'FB']],
  ['/healthy-menu', ['ADMIN']],
  ['/menu-profitability', ['ADMIN', 'FB']],
  
  // Orders
  ['/orders', ['ADMIN', 'KITCHEN']],
  ['/delivery', ['ADMIN', 'KITCHEN', 'DELIVERY']],
  
  // Marketing
  ['/blog', ['ADMIN', 'MARKETING']],
  ['/contents', ['ADMIN', 'MARKETING']],
  ['/applications', ['ADMIN', 'MARKETING']],
  
  // Finance
  ['/sales', ['ADMIN', 'FINANCE']],
  ['/expe', ['ADMIN', 'FINANCE']],
  ['/profit', ['ADMIN', 'FINANCE']],
  ['/expenses', ['FINANCE']],
  
  // HR & Training
  ['/training', ['ADMIN', 'KITCHEN', 'FB', 'MARKETING', 'FINANCE', 'STOCK_MANAGER', 'PURCHASING', 'DELIVERY', 'POS', 'WAITRESS']],
  ['/Pregister', ['ADMIN', 'FB']],
  ['/preparation', ['ADMIN', 'KITCHEN', 'FB']],
  ['/Sregister', ['ADMIN', 'FB']],
  ['/standards', ['ADMIN', 'KITCHEN', 'FB', 'MARKETING', 'FINANCE', 'STOCK_MANAGER', 'PURCHASING', 'DELIVERY', 'POS']],
  ['/staffregister', ['ADMIN']],
  ['/waitress', ['ADMIN']],
  ['/restaurants', ['ADMIN']],
  
  // POS & Tables
  ['/pos', ['ADMIN', 'POS', 'WAITRESS']],
  ['/edit', ['POS']],
  ['/myorders', ['POS', 'WAITRESS']],
  ['/table-arrangement', ['ADMIN', 'POS', 'WAITRESS']],
  
  // User
  ['/profile', ['ADMIN', 'KITCHEN', 'FB', 'MARKETING', 'FINANCE', 'STOCK_MANAGER', 'PURCHASING', 'DELIVERY', 'POS', 'WAITRESS']],
  
  // Tasks
  ['/daily-tasks', ['ADMIN', 'KITCHEN', 'FB', 'MARKETING', 'FINANCE', 'STOCK_MANAGER', 'PURCHASING', 'DELIVERY', 'POS', 'WAITRESS']],
  ['/feedback', ['MARKETING']],
  ['/search', ['ADMIN']],
  
  // Birthday
  ['/BirthDate', ['ADMIN']],
  ['/prizes', ['ADMIN']],
]);

// ============================================
// 3. HELPER FUNCTIONS
// ============================================

// Helper to get all routes
function getAllRoutes(): string[] {
  const routes: string[] = [];
  for (const [route] of ROUTE_PERMISSIONS) {
    routes.push(route);
  }
  return routes;
}

// Helper: Get default permissions based on role
function getDefaultPermissions(role: UserRole): string[] {
  const defaultPermissions: Record<UserRole, string[]> = {
    'ADMIN': getAllRoutes(),
    'SUPER_ADMIN': getAllRoutes(),
    
    'FINANCE': [
     
      '/stock',
      '/stockReport',
      '/purchase-request',
      '/sales',
      '/expe',
      '/profit',
      '/expenses',
      '/profile',
      '/daily-tasks',
    ],
    
    'STOCK_MANAGER': [
      
      '/stock',
      '/scategory',
      '/stockReport',
      '/purchase-request',
      '/profile',
      '/daily-tasks',
    ],
    
    'PURCHASING': [
      
      '/stock',
      '/stockReport',
      '/purchase-request',
      '/profile',
      '/daily-tasks',
    ],
    
    'DELIVERY': [
     
      '/delivery',
      '/profile',
      '/daily-tasks',
    ],
    
    'KITCHEN': [
     
      '/orders',
      '/delivery',
      '/training',
      '/preparation',
      '/standards',
      '/profile',
      '/daily-tasks',
    ],
    
    'FB': [
    
      '/items',
      '/catagory',
      '/menu-profitability',
      '/training',
      '/Pregister',
      '/preparation',
      '/Sregister',
      '/standards',
      '/profile',
      '/daily-tasks',
    ],
    
    'MARKETING': [
    
      '/blog',
      '/contents',
      '/training',
      '/standards',
      '/feedback',
      '/profile',
      '/daily-tasks',
    ],
    
    'POS': [
     
      '/pos',
      '/edit',
      '/myorders',
      '/table-arrangement',
      '/training',
      '/standards',
      '/profile',
      '/daily-tasks',
    ],
    
    'WAITRESS': [
     
      '/pos',
      '/myorders',
      '/table-arrangement',
      '/training',
      '/profile',
      '/daily-tasks',
    ],
    
    'DEFAULT': [
     
      '/profile',
      '/daily-tasks',
    ],
  };

  return defaultPermissions[role] || defaultPermissions['DEFAULT'];
}

// Helper to normalize role string
function normalizeRole(role: string | undefined): UserRole {
  if (!role) return 'DEFAULT';
  const upperRole = role.toUpperCase();
  // Check if it's a valid role
  const validRoles: UserRole[] = [
    'ADMIN', 'SUPER_ADMIN', 'KITCHEN', 'FB', 'MARKETING', 
    'FINANCE', 'STOCK_MANAGER', 'PURCHASING', 'DELIVERY', 
    'POS', 'WAITRESS', 'DEFAULT'
  ];
  return validRoles.includes(upperRole as UserRole) ? (upperRole as UserRole) : 'DEFAULT';
}

// ============================================
// 4. POST Handler - Get User Permissions
// ============================================
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          message: "Not authenticated",
        },
        { status: 401 }
      );
    }

    const { userId, role } = await request.json();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          message: "User ID is required",
        },
        { status: 400 }
      );
    }

    // ✅ Fix: Normalize roles for comparison
    const sessionRole = normalizeRole(session.user.role);
    const userRole = normalizeRole(role || session.user.role || 'DEFAULT');

    // Verify the requesting user is the same as the one being queried
    if (session.user.id !== userId && sessionRole !== 'ADMIN' && sessionRole !== 'SUPER_ADMIN') {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized to view this user's permissions",
        },
        { status: 403 }
      );
    }

    // Try to fetch from MongoDB
    let permissions: string[] = [];

    try {
      const client = await clientPromise;
      
      if (client && client.db) {
        const db = client.db(process.env.MONGODB_DB || 'gold');
        
        // Check if user has custom permissions in a permissions collection
        const userPermissions = await db.collection('user_permissions').findOne({
          userId: userId,
        });

        if (userPermissions && userPermissions.permissions) {
          permissions = userPermissions.permissions;
        }

        // If no custom permissions, check role-based permissions
        if (permissions.length === 0) {
          const rolePermissions = await db.collection('role_permissions').findOne({
            role: userRole,
          });
          
          if (rolePermissions && rolePermissions.permissions) {
            permissions = rolePermissions.permissions;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching permissions from MongoDB:', error);
    }

    // If no permissions found in DB, use default role-based permissions
    if (permissions.length === 0) {
      permissions = getDefaultPermissions(userRole);
    }

    // If user is ADMIN, give all permissions
    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
      permissions = getAllRoutes();
    }

    // Remove duplicates
    permissions = [...new Set(permissions)];

    return NextResponse.json({
      success: true,
      permissions,
      role: userRole,
      userId: userId,
    });

  } catch (error: any) {
    console.error('Error fetching user permissions:', error);
    return NextResponse.json(
      { 
        success: false,
        message: "Failed to fetch permissions",
        permissions: getDefaultPermissions('DEFAULT'),
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

// ============================================
// 5. GET Handler - Admin View Permissions
// ============================================
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          message: "Not authenticated",
        },
        { status: 401 }
      );
    }

    // ✅ Fix: Normalize role for comparison
    const sessionRole = normalizeRole(session.user.role);

    // Only admins can view all permissions
    if (sessionRole !== 'ADMIN' && sessionRole !== 'SUPER_ADMIN') {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized - Admin access required",
        },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'gold');

    let permissions: string[] = [];

    if (userId) {
      const userPermissions = await db.collection('user_permissions').findOne({
        userId: userId,
      });
      
      if (userPermissions && userPermissions.permissions) {
        permissions = userPermissions.permissions;
      }
    }

    if (permissions.length === 0 && role) {
      const normalizedRole = normalizeRole(role);
      const rolePermissions = await db.collection('role_permissions').findOne({
        role: normalizedRole,
      });
      
      if (rolePermissions && rolePermissions.permissions) {
        permissions = rolePermissions.permissions;
      }
    }

    if (permissions.length === 0 && role) {
      const normalizedRole = normalizeRole(role);
      permissions = getDefaultPermissions(normalizedRole);
    }

    return NextResponse.json({
      success: true,
      permissions,
      userId: userId || 'all',
      role: role || 'all',
    });
  } catch (error: any) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch permissions",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}