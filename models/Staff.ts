import mongoose, { Schema, Document } from 'mongoose';

export interface IStaff extends Document {
  name: string;
  email: string;
  password: string;
  phone: string;
  employeeId: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended';
  permissions: string[];
  requiresPasswordChange: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StaffSchema: Schema = new Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  employeeId: {
    type: String,
    required: [true, 'Employee ID is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: ['admin', 'kitchen', 'stock_manager', 'fb', 'marketing', 'finance', 'pos', 'other'],
    default: 'pos'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  permissions: {
    type: [String],
    default: []
  },
  requiresPasswordChange: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update the updatedAt field before saving
StaffSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Remove password when converting to JSON
StaffSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.models.Staff || mongoose.model<IStaff>('Staff', StaffSchema);
