import clientPromise from '@/lib/mongodb';

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
    const client = await clientPromise;
    const db = client.db('gold');
    await db.collection('audit').insertOne({
      ...entry,
      createdAt: new Date().toISOString(),
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
