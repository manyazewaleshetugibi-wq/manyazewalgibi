import { ObjectId } from 'mongodb'

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
  _id: ObjectId;
  name: string;
  email: string;
  password: string;
  image?: string;
  role: UserRole;
  employeeId?: string;
  permissions: string[];
  status: 'active' | 'inactive' | 'suspended';
  requiresPasswordChange: boolean;
  loginAttempts: number;
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
  googleId?: string;
  emailVerified?: Date | null;
  phone?: string;
  address?: string;
  city?: string;
  birthDate?: Date;
  gender?: 'male' | 'female' | 'other';
  location?: {
    type?: string;
    coordinates?: number[];
  };
  registrationSource?: 'website' | 'mobile' | 'google';
  locationConsent?: boolean;
  specialization?: string;
  shift?: string;
}

export interface UserDocument {
  _id: ObjectId;
  name: string;
  email: string;
  password: string;
  image?: string;
  role: string;
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
  address?: string;
  city?: string;
  birthDate?: Date;
  gender?: string;
  location?: {
    type?: string;
    coordinates?: number[];
  };
  registrationSource?: string;
  locationConsent?: boolean;
  specialization?: string;
  shift?: string;
}

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
    address: doc.address,
    city: doc.city,
    birthDate: doc.birthDate,
    gender: doc.gender as 'male' | 'female' | 'other',
    location: doc.location,
    registrationSource: doc.registrationSource as 'website' | 'mobile' | 'google',
    locationConsent: doc.locationConsent,
    specialization: doc.specialization,
    shift: doc.shift
  };
}

export const sanitizeUser = (user: User): Omit<User, 'password' | 'googleId' | 'emailVerified'> => {
  const { password, googleId, emailVerified, ...sanitizedUser } = user;
  return sanitizedUser;
}