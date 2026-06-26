// components/SecurityLogger.tsx
'use client';

import { useSecurityLogger } from '@/lib/useSecurityLogger';

export default function SecurityLogger() {
  useSecurityLogger();
  return null;
}