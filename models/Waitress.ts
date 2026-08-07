// In @/models/Waitress.ts

export enum ShiftType {
    MORNING = "MORNING",
    AFTERNOON = "AFTERNOON",
    EVENING = "EVENING"
}

export interface Waitress {
    _id: string;
    name: string;
    phone: string;
    shift: ShiftType;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    
    // New optional fields for POS user registration
    userId?: string;
    email?: string;
    role?: string;
    registeredFromUser?: boolean;
    registrationDate?: Date;
}
