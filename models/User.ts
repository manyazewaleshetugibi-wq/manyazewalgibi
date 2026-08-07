export enum UserRole {
  ADMIN = 'admin',
  KITCHEN = 'kitchen',
  FB = 'fb',
  MARKETING = 'marketing',
  FINANCE = 'finance',
  STOCK_MANAGER = 'stock_manager',
  POS = 'pos',
  CUSTOMER = 'customer',
  BARISTA = 'barista',
  COFFEE_MAKER = 'coffee_maker',
  OTHER = 'other'
}

export interface User {
  _id: string;
  name: string;
  email: string;
  password: string; // Add password field
  image?: string;
  role: UserRole;
  employeeId?: string; // Add employeeId for staff
  permissions: string[]; // Add permissions array
  status: 'active' | 'inactive' | 'suspended'; // Add status field
  requiresPasswordChange: boolean; // Add this field for force password change
  loginAttempts: number; // Track failed login attempts
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
  googleId?: string;
  emailVerified?: Date | null;
  phone?: string; // Add phone field
  specialization?: string; // Add specialization field
  shift?: string; // Add shift field
  pin?: string; // Hashed 4-digit PIN for attendance
}

// For database queries
export interface UserDocument {
  _id: string;
  name: string;
  email: string;
  password: string;
  image?: string;
  role: string; // In DB it might be stored as string
  employeeId?: string;
  permissions: string[];
  status: string;
  requiresPasswordChange: boolean;
  loginAttempts: number;
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
  googleId?: string;
  emailVerified?: Date | null;
  phone?: string;
  specialization?: string;
  shift?: string;
  pin?: string;
}

export interface UserWithoutId extends Omit<User, '_id'> {}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  employeeId?: string;
  phone?: string;
  status?: 'active' | 'inactive' | 'suspended';
  permissions?: string[];
  requiresPasswordChange?: boolean;
  image?: string;
}

export const createUser = (userData: CreateUserInput): User => {
  return {
    _id: crypto.randomUUID(),
    name: userData.name,
    email: userData.email.toLowerCase(),
    password: userData.password,
    role: userData.role,
    employeeId: userData.employeeId,
    permissions: userData.permissions || [],
    status: userData.status || 'active',
    requiresPasswordChange: userData.requiresPasswordChange ?? true, // Default to true for new users
    loginAttempts: 0,
    lastLogin: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    phone: userData.phone,
    image: userData.image,
  }
}

export const validateUser = (user: Partial<User>): boolean => {
  if (!user.name || typeof user.name !== 'string') return false;
  if (!user.email || typeof user.email !== 'string') return false;
  if (!user.password || typeof user.password !== 'string') return false;
  if (!user.role || !Object.values(UserRole).includes(user.role)) return false;
  if (!user.createdAt || !(user.createdAt instanceof Date)) return false;
  if (!user.lastLogin || !(user.lastLogin instanceof Date)) return false;
  
  // Validate status if provided
  if (user.status && !['active', 'inactive', 'suspended'].includes(user.status)) return false;
  
  return true;
}

export const sanitizeUser = (user: User): Omit<User, 'password' | 'googleId' | 'emailVerified'> => {
  const { password, googleId, emailVerified, ...sanitizedUser } = user;
  return sanitizedUser;
}

// Helper function to check if password change is required
export const requiresPasswordChange = (user: User): boolean => {
  return user.requiresPasswordChange === true;
}

// Helper function to mark password as changed
export const markPasswordChanged = (user: User): User => {
  return {
    ...user,
    requiresPasswordChange: false,
    updatedAt: new Date()
  };
}

// Helper function to update login attempts
export const updateLoginAttempts = (user: User, increment: boolean = true): User => {
  const attempts = increment ? user.loginAttempts + 1 : 0;
  return {
    ...user,
    loginAttempts: attempts,
    lastLogin: new Date(),
    updatedAt: new Date()
  };
}

// Helper to check if account is locked
export const isAccountLocked = (user: User): boolean => {
  if (user.loginAttempts < 5) return false;
  
  // Check if 15 minutes have passed since last attempt
  const lockDuration = 15 * 60 * 1000; // 15 minutes
  const timeSinceLastAttempt = Date.now() - user.lastLogin.getTime();
  
  return timeSinceLastAttempt < lockDuration;
}

// Helper to get remaining lock time in minutes
export const getRemainingLockTime = (user: User): number => {
  if (user.loginAttempts < 5) return 0;
  
  const lockDuration = 15 * 60 * 1000; // 15 minutes
  const timeSinceLastAttempt = Date.now() - user.lastLogin.getTime();
  
  if (timeSinceLastAttempt >= lockDuration) return 0;
  
  return Math.ceil((lockDuration - timeSinceLastAttempt) / 60000); // Convert to minutes
}

// Convert database document to User type
export const documentToUser = (doc: UserDocument): User => {
  return {
    _id: doc._id,
    name: doc.name,
    email: doc.email,
    password: doc.password,
    image: doc.image,
    role: doc.role as UserRole,
    employeeId: doc.employeeId,
    permissions: doc.permissions,
    status: doc.status as 'active' | 'inactive' | 'suspended',
    requiresPasswordChange: doc.requiresPasswordChange,
    loginAttempts: doc.loginAttempts,
    lastLogin: doc.lastLogin,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    googleId: doc.googleId,
    emailVerified: doc.emailVerified,
    phone: doc.phone,
    specialization: doc.specialization,
    shift: doc.shift
  };
}

// Convert User type to database document
export const userToDocument = (user: User): UserDocument => {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    password: user.password,
    image: user.image,
    role: user.role,
    employeeId: user.employeeId,
    permissions: user.permissions,
    status: user.status,
    requiresPasswordChange: user.requiresPasswordChange,
    loginAttempts: user.loginAttempts,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    googleId: user.googleId,
    emailVerified: user.emailVerified,
    phone: user.phone,
    specialization: user.specialization,
    shift: user.shift
  };
}

// Check if user is staff (not customer)
export const isStaff = (user: User): boolean => {
  return user.role !== UserRole.CUSTOMER;
}

// Get role permissions (you can expand this based on your needs)
export const getDefaultPermissions = (role: UserRole): string[] => {
  switch (role) {
    case UserRole.ADMIN:
      return [
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
      ];
    case UserRole.KITCHEN:
      return [
        'view_orders',
        'update_order_status',
        'manage_kitchen',
        'view_menu',
        'view_inventory'
      ];
    case UserRole.STOCK_MANAGER:
      return [
        'manage_inventory',
        'view_stock',
        'manage_purchases',
        'view_reports',
        'manage_suppliers'
      ];
    case UserRole.FB:
      return [
        'manage_menu',
        'view_menu',
        'manage_categories',
        'view_orders'
      ];
    case UserRole.MARKETING:
      return [
        'manage_marketing',
        'view_marketing',
        'create_content',
        'manage_blog'
      ];
    case UserRole.FINANCE:
      return [
        'manage_finance',
        'view_finance',
        'view_reports',
        'manage_expenses'
      ];
    case UserRole.POS:
      return [
        'manage_orders',
        'view_orders',
        'create_orders',
        'process_payments'
      ];
    case UserRole.CUSTOMER:
      return [
        'view_menu',
        'place_orders',
        'view_own_orders'
      ];
    case UserRole.BARISTA:
      return [
        'view_orders',
        'update_order_status',
        'view_menu',
        'view_inventory'
      ];
    case UserRole.COFFEE_MAKER:
      return [
        'view_orders',
        'update_order_status',
        'view_menu',
        'view_inventory'
      ];
    case UserRole.OTHER:
      return ['view_attendance'];
    default:
      return [];
  }
}
