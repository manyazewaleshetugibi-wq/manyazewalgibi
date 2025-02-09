import { ObjectId } from "mongodb";

export enum ShiftType {
    MORNING = "Morning",
    EVENING = "Evening",
    FULL_DAY = "Full Day",
}

export interface Waitress {
    _id: ObjectId;
    name: string;
    phone: string;
    shift: ShiftType;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
