import { NextRequest } from "next/server";

export function validateRequest(req: NextRequest): boolean {
  // Validate user agent (prevent automated attacks)
  const userAgent = req.headers.get('user-agent');
  if (!userAgent || userAgent.length < 5) {
    return false;
  }

  // Check for common attack patterns
  const url = req.url || '';
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /onclick=/i,
    /onerror=/i,
    /--/,
    /'/,
    /"/
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url)) {
      return false;
    }
  }

  // Validate content length (prevent DoS)
  const contentLength = parseInt(req.headers.get('content-length') || '0');
  if (contentLength > 1024 * 1024) { // 1MB max
    return false;
  }

  return true;
}