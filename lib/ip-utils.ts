// lib/ip-utils.ts
import { NextRequest } from 'next/server';

// Trusted proxy headers in order of trust
const TRUSTED_HEADERS = [
  'cf-connecting-ip',        // Cloudflare
  'x-forwarded-for',          // Standard proxy
  'x-real-ip',                // Nginx/Apache
  'x-original-forwarded-for',
  'x-cluster-client-ip',
  'true-client-ip',
  'x-forwarded',
  'forwarded-for',
  'forwarded',
];

// Private IP ranges to exclude
const PRIVATE_IP_PATTERNS = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^127\./,
  /^::1$/,
  /^fe80:/,
  /^fc00:/,
  /^0\.0\.0\.0$/,
];

export function getClientIP(req: NextRequest): string {
  // Try each trusted header
  for (const header of TRUSTED_HEADERS) {
    const value = req.headers.get(header);
    if (value) {
      // x-forwarded-for can be comma-separated list
      const ips = value.split(',').map(ip => ip.trim());
      // Find first non-private IP
      for (const ip of ips) {
        if (ip && !isPrivateIP(ip)) {
          return ip;
        }
      }
      // If all are private, return the first one
      if (ips.length > 0 && ips[0]) {
        return ips[0];
      }
    }
  }

  // Fallback: Try to get from NextRequest properties
  // Note: In Next.js App Router, you need to use headers
  const ip = req.headers.get('x-real-ip') || 
             req.headers.get('x-forwarded-for')?.split(',')[0] || 
             'unknown';
  
  return ip;
}

export function isPrivateIP(ip: string): boolean {
  if (!ip || ip === 'unknown') return true;
  return PRIVATE_IP_PATTERNS.some(pattern => pattern.test(ip));
}

export function getIPInfo(ip: string): { isPrivate: boolean; isLocal: boolean; isValid: boolean } {
  const isValid = ip !== 'unknown' && ip !== '::1' && ip !== '127.0.0.1';
  return {
    isPrivate: isPrivateIP(ip),
    isLocal: ip === '127.0.0.1' || ip === '::1' || ip === 'localhost',
    isValid,
  };
}

// For logging - anonymize IP for GDPR compliance
export function anonymizeIP(ip: string): string {
  if (ip === 'unknown' || !ip) return 'unknown';
  // IPv4: last octet to 0
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      parts[3] = '0';
      return parts.join('.');
    }
  }
  // IPv6: last group to 0
  if (ip.includes(':')) {
    const parts = ip.split(':');
    if (parts.length >= 4) {
      parts[parts.length - 1] = '0';
      return parts.join(':');
    }
  }
  return ip;
}