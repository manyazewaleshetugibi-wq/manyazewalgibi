import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export interface AuditEntry {
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'PAY' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'APPROVE' | 'REJECT' | 'CANCEL'
  entity: string
  entityId?: string
  userId?: string
  userName?: string
  userRole?: string
  description: string
  changes?: Record<string, { from: any; to: any }>
  metadata?: Record<string, any>
  ip?: string
  userAgent?: string
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.audit.create({
      data: {
        id: randomUUID(),
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        userId: entry.userId,
        userName: entry.userName,
        userRole: entry.userRole,
        description: entry.description,
        changes: entry.changes ? (entry.changes as Prisma.InputJsonValue) : Prisma.DbNull,
        createdAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
}

export function extractChanges(before: Record<string, any> | null, after: Record<string, any>): Record<string, { from: any; to: any }> {
  const changes: Record<string, { from: any; to: any }> = {};
  if (!before) return changes;
  for (const key of Object.keys(after)) {
    if (key === '_id' || key === 'createdAt' || key === 'updatedAt' || key === 'history' || key === 'password' || key === 'pin') continue;
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changes[key] = { from: before[key], to: after[key] };
    }
  }
  return changes;
}
