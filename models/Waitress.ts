// In @/models/Waitress.ts
import { ObjectId } from "mongodb";

export enum ShiftType {
    MORNING = "MORNING",
    AFTERNOON = "AFTERNOON",
    EVENING = "EVENING"
}

export interface Waitress {
    _id: ObjectId;
    name: string;
    phone: string;
    shift: ShiftType;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    
    // New optional fields for POS user registration
    userId?: ObjectId;
    email?: string;
    role?: string;
    registeredFromUser?: boolean;
    registrationDate?: Date;
}