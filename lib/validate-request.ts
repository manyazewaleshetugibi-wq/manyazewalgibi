// lib/validate-request.ts
import { NextRequest } from 'next/server';

export function validateRequest(req: NextRequest): { valid: boolean; reason?: string } {
  const userAgent = req.headers.get('user-agent') || '';
  
  // ============================================
  // 1. CHECK FOR MISSING USER AGENT
  // ============================================
  if (!userAgent) {
    return { valid: false, reason: 'Missing user agent' };
  }

  // ============================================
  // 2. BLOCK OBVIOUS BOTS AND AUTOMATED TOOLS
  // ============================================
  const suspiciousAgents = [
    'curl',
    'wget',
    'python-requests',
    'postman',
    'insomnia',
    'scrapy',
    'http-client',
    'nikto',
    'sqlmap',
    'nmap',
    'masscan',
    'hydra',
    'medusa',
    'metasploit',
  ];
  
  // Allow API routes to be tested with curl (for development)
  const isApiRoute = req.nextUrl.pathname.startsWith('/api/');
  
  // Only block suspicious agents for non-API routes in production
  if (process.env.NODE_ENV === 'production' || !isApiRoute) {
    const lowerUserAgent = userAgent.toLowerCase();
    if (suspiciousAgents.some(agent => lowerUserAgent.includes(agent))) {
      return { valid: false, reason: 'Suspicious user agent' };
    }
  }

  // ============================================
  // 3. CHECK FOR SECURITY ATTACK PATTERNS
  // ============================================
  const searchParams = req.nextUrl.searchParams;
  
  // SQL injection patterns
  const sqlPatterns = [
    /(\b(select|insert|update|delete|drop|alter|create|truncate|union|exec|execute)\b)/i,
    /('.*--)/i,
    /('.*;)/i,
    /(\b(and|or)\s+\d+\s*=\s*\d+)/i,
    /(\b(and|or)\s+'.*'\s*=\s*'.*')/i,
    /(\b(union\s+select|union\s+all\s+select)\b)/i,
    /(\b(load_file|outfile|dumpfile)\b)/i,
    /--\s*$/m,
    /\/\*.*\*\//,
  ];
  
  // Check all query parameters
  for (const [key, value] of searchParams.entries()) {
    const decodedValue = decodeURIComponent(value);
    
    if (sqlPatterns.some(pattern => pattern.test(decodedValue))) {
      return { valid: false, reason: `Potential SQL injection in parameter: ${key}` };
    }
    
    // Check for path traversal
    if (/\.\.\//.test(decodedValue) || /\.\.\\/.test(decodedValue)) {
      return { valid: false, reason: `Path traversal attempt in parameter: ${key}` };
    }
  }
  
  // ============================================
  // 4. CHECK FOR XSS PATTERNS
  // ============================================
  const xssPatterns = [
    /<script\b[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<.*?>/i,
    /alert\s*\(/i,
    /eval\s*\(/i,
    /document\./i,
    /window\./i,
    /console\./i,
    /\.innerHTML\s*=/i,
    /\.outerHTML\s*=/i,
  ];
  
  const fullUrl = req.nextUrl.toString();
  const decodedUrl = decodeURIComponent(fullUrl);
  
  if (xssPatterns.some(pattern => pattern.test(decodedUrl))) {
    return { valid: false, reason: 'Potential XSS attack' };
  }
  
  // ============================================
  // 5. CHECK FOR SUSPICIOUS FILE EXTENSIONS
  // ============================================
  const suspiciousExtensions = [
    '.php',
    '.asp',
    '.aspx',
    '.jsp',
    '.cgi',
    '.pl',
    '.py',
    '.rb',
    '.exe',
    '.dll',
    '.sh',
    '.bat',
    '.cmd',
    '.htaccess',
    '.htpasswd',
  ];
  
  if (suspiciousExtensions.some(ext => req.nextUrl.pathname.toLowerCase().endsWith(ext))) {
    return { valid: false, reason: 'Suspicious file extension' };
  }
  
  // ============================================
  // 6. CHECK FOR NULL BYTE INJECTION
  // ============================================
  if (req.nextUrl.toString().includes('%00')) {
    return { valid: false, reason: 'Null byte injection attempt' };
  }
  
  return { valid: true };
}