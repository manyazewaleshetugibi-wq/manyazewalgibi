export interface Staff {
  _id: string;
  name: string;
  email: string;
  phone: string;
  employeeId: string;
  role: 'admin' | 'kitchen' | 'stock_manager' | 'fb' | 'marketing' | 'finance' | 'pos';
  status: 'active' | 'inactive' | 'suspended';
  requiresPasswordChange: boolean;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface StaffCreateRequest {
  name: string;
  email: string;
  phone: string;
  employeeId: string;
  role: Staff['role'];
  password: string;
  status?: Staff['status'];
  permissions?: string[];
  requiresPasswordChange?: boolean;
}

export interface StaffUpdateRequest {
  name?: string;
  email?: string;
  phone?: string;
  employeeId?: string;
  role?: Staff['role'];
  password?: string;
  status?: Staff['status'];
  permissions?: string[];
  requiresPasswordChange?: boolean;
}