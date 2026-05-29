export interface CommonExpense {
  _id?: string;
  title: string;
  description?: string;
  amount: number;
  category: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'one-time';
  startDate: Date;
  endDate?: Date | null;
  isActive: boolean;
  tags: string[];
  priority: 'High' | 'Medium' | 'Low';
  notes?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export const CommonExpenseSchema = {
  title: { type: 'string', required: true },
  description: { type: 'string', default: '' },
  amount: { type: 'number', required: true, min: 0 },
  category: { 
    type: 'string', 
    required: true,
    enum: ['Rent', 'Utilities', 'Salaries', 'Ingredients', 'Equipment', 'Maintenance', 
           'Marketing', 'Insurance', 'Licenses', 'Transportation', 'Packaging', 
           'Cleaning', 'Software', 'Training', 'Other']
  },
  frequency: {
    type: 'string',
    required: true,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'one-time'],
    default: 'monthly'
  },
  startDate: { type: 'date', required: true },
  endDate: { type: 'date', default: null },
  isActive: { type: 'boolean', default: true },
  tags: { type: 'array', default: [] },
  priority: { 
    type: 'string', 
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium'
  },
  notes: { type: 'string', default: '' },
  createdBy: { type: 'string', required: true },
  createdAt: { type: 'date', default: Date.now },
  updatedAt: { type: 'date', default: Date.now },
};
