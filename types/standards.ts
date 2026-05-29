// types/standards.ts

export type DepartmentRole = 
  | "admin" 
  | "pos" 
  | "kitchen" 
  | "fb" 
  | "marketing" 
  | "finance" 
  | "stockmanager";

export interface StandardSubItem {
  id: string;
  number: string;
  title: string;
  description: string;
  isRequired: boolean;
  checklist?: string[];
  penalty?: string; // penalty for violation
  points?: number; // points for compliance
}

export interface StandardItem {
  id: string;
  number: string;
  title: string;
  description: string;
  subItems: StandardSubItem[];
  category?: string;
}

export interface Standard {
  _id?: string;
  role: DepartmentRole;
  roleDisplayName: string;
  department: string;
  standards: StandardItem[];
  createdBy: string;
  createdByRole?: string;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  description?: string;
  effectiveFrom?: Date;
  reviewDate?: Date;
}

export interface CreateStandardRequest {
  role: DepartmentRole;
  standards: StandardItem[];
  description?: string;
  effectiveFrom?: Date;
  reviewDate?: Date;
}

export interface StandardApiResponse {
  success: boolean;
  standards?: Standard[];
  standard?: Standard;
  count?: number;
  message?: string;
  error?: string;
  exists?: boolean;
  standardId?: string;
  modifiedCount?: number;
  version?: number;
}

// Helper function to generate unique ID
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Department/Role options with display names and descriptions
export const departmentOptions = [
  { 
    value: "admin", 
    label: "Administration", 
    icon: "👔", 
    color: "bg-purple-100 text-purple-800 border-purple-200",
    description: "Administrative policies, procedures, and management standards"
  },
  { 
    value: "pos", 
    label: "Point of Sale", 
    icon: "💳", 
    color: "bg-blue-100 text-blue-800 border-blue-200",
    description: "POS operations, cash handling, transaction procedures"
  },
  { 
    value: "kitchen", 
    label: "Kitchen", 
    icon: "👨‍🍳", 
    color: "bg-green-100 text-green-800 border-green-200",
    description: "Kitchen hygiene, food safety, preparation standards"
  },
  { 
    value: "fb", 
    label: "Food & Beverage", 
    icon: "🍽️", 
    color: "bg-orange-100 text-orange-800 border-orange-200",
    description: "Service standards, customer interaction, F&B protocols"
  },
  { 
    value: "marketing", 
    label: "Marketing", 
    icon: "📢", 
    color: "bg-pink-100 text-pink-800 border-pink-200",
    description: "Brand guidelines, promotional standards, social media rules"
  },
  { 
    value: "finance", 
    label: "Finance", 
    icon: "💰", 
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
    description: "Financial procedures, reporting standards, compliance"
  },
  { 
    value: "stockmanager", 
    label: "Stock Management", 
    icon: "📦", 
    color: "bg-cyan-100 text-cyan-800 border-cyan-200",
    description: "Inventory control, stock handling, warehouse standards"
  },
];