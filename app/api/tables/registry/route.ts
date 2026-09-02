// app/api/tables/registry/route.ts
// Lightweight persisted table registry used by the QR code generator.
// Replaces the table arrangement system: admins define a flat table list
// (restaurant + floor + number + capacity) from which QR codes are produced.
// Data is stored in the SystemSetting collection under the "table_registry" key.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomUUID } from 'crypto';
import { requireAuth, requireAdmin } from '@/lib/api-auth';
import type { Prisma } from '@prisma/client';

const REGISTRY_KEY = 'table_registry';

interface TableRegistryRecord {
  id: string;
  restaurantId: string;
  restaurantName?: string;
  floor: string;
  number: number;
  capacity: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

async function readRegistry(): Promise<TableRegistryRecord[]> {
  const setting = await prisma.systemSetting.findFirst({ where: { key: REGISTRY_KEY } });
  if (!setting || !Array.isArray(setting.value)) return [];
  return setting.value as unknown as TableRegistryRecord[];
}

async function writeRegistry(records: TableRegistryRecord[]) {
  const setting = await prisma.systemSetting.findFirst({ where: { key: REGISTRY_KEY } });
  const data = {
    value: records as unknown as Prisma.InputJsonValue,
    updatedAt: new Date(),
  };
  if (setting) {
    await prisma.systemSetting.update({ where: { id: setting.id }, data });
  } else {
    await prisma.systemSetting.create({
      data: { id: randomUUID(), key: REGISTRY_KEY, value: records as unknown as Prisma.InputJsonValue, createdAt: new Date(), updatedAt: new Date() },
    });
  }
}

// ─── GET ────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { response } = await requireAuth();
  if (response) return response;

  try {
    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get('restaurantId');
    const floor = searchParams.get('floor');

    const records = await readRegistry();
    let result = records;
    if (restaurantId) result = result.filter((r) => r.restaurantId === restaurantId);
    if (floor) result = result.filter((r) => r.floor === floor);

    return NextResponse.json({
      success: true,
      data: result.sort((a, b) => a.number - b.number),
    });
  } catch (error) {
    console.error('Error fetching table registry:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch table registry' }, { status: 500 });
  }
}

// ─── POST (create or update one record) ──────────────────────────────────────
export async function POST(req: NextRequest) {
  const { user, response } = await requireAdmin();
  if (response) return response;

  try {
    const body = await req.json();
    const record = body?.record as Partial<TableRegistryRecord> | undefined;
    if (!record || !record.restaurantId || !record.floor || !record.number || record.number <= 0) {
      return NextResponse.json({ success: false, error: 'restaurantId, floor and a valid table number are required' }, { status: 400 });
    }

    const capacity = Math.max(1, Number(record.capacity) || 4);
    const now = new Date().toISOString();
    const records = await readRegistry();
    const existingIndex = records.findIndex((r) => r.id === (record.id || ''));

    let saved: TableRegistryRecord;
    if (existingIndex !== -1) {
      saved = { ...records[existingIndex], ...record, capacity, updatedAt: now };
      records[existingIndex] = saved;
    } else {
      saved = {
        id: record.id || `T-${randomUUID()}`,
        restaurantId: record.restaurantId,
        restaurantName: record.restaurantName || record.restaurantId,
        floor: record.floor,
        number: Number(record.number),
        capacity,
        status: 'available',
        createdAt: now,
        updatedAt: now,
      };
      records.push(saved);
    }

    await writeRegistry(records);

    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error('Error saving table registry:', error);
    return NextResponse.json({ success: false, error: 'Failed to save table registry' }, { status: 500 });
  }
}

// ─── DELETE (remove one record) ──────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    const records = await readRegistry();
    const next = records.filter((r) => r.id !== id);
    if (next.length === records.length) {
      return NextResponse.json({ success: false, error: 'Table not found' }, { status: 404 });
    }

    await writeRegistry(next);
    return NextResponse.json({ success: true, message: 'Table removed' });
  } catch (error) {
    console.error('Error deleting table from registry:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete table from registry' }, { status: 500 });
  }
}