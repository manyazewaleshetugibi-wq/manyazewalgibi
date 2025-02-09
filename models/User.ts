import { ObjectId } from 'mongodb'


export enum UserRole {
  KITCHEN = 'KITCHEN',
  FB = 'FB',
  MARKETING = 'MARKETING',
  ADMIN = 'ADMIN',
  CUSTOMER = 'CUSTOMER',
  FINANCE = 'FINANCE',
  STOCK_MANAGER = 'STOCK_MANAGER',
  POS ='POS'

}

export interface User {
  _id: ObjectId;
  name: string;
  email: string;
  image?: string;
  role: UserRole;
  createdAt: Date;
  lastLogin: Date;
  googleId?: string;
  emailVerified?: Date | null;
}

export interface UserWithoutId extends Omit<User, '_id'> {}

export const createUser = (userData: UserWithoutId): User => {
  return {
    _id: new ObjectId(),
    ...userData,
  }
}

export const validateUser = (user: Partial<User>): boolean => {
  if (!user.name || typeof user.name !== 'string') return false;
  if (!user.email || typeof user.email !== 'string') return false;
  if (!user.role || !Object.values(UserRole).includes(user.role)) return false;
  if (!user.createdAt || !(user.createdAt instanceof Date)) return false;
  if (!user.lastLogin || !(user.lastLogin instanceof Date)) return false;

  return true;
}

export const sanitizeUser = (user: User): Omit<User, 'googleId' | 'emailVerified'> => {
  const { googleId, emailVerified, ...sanitizedUser } = user;
  return sanitizedUser;
}
