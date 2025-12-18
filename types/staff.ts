export interface Staff {
  _id: string;
  name: string;
  email: string;
  phone: string;
  employeeId: string;
  role: 'admin' | 'kitchen' | 'stock_manager' | 'fb' | 'marketing' | 'finance' | 'pos' | 'waitress';
  status: 'active' | 'inactive' | 'suspended';
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
}