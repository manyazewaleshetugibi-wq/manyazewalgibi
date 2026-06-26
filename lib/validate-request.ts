// lib/validate-request.ts
import { NextRequest } from 'next/server';

// Suspicious user agents to block
const SUSPICIOUS_AGENTS = [
  'curl', 'wget', 'python-requests', 'postman', 'insomnia',
  'scrapy', 'http-client', 'nikto', 'sqlmap', 'nmap',
  'masscan', 'hydra', 'medusa', 'metasploit', 'burp',
  'zap', 'owasp', 'dirbuster', 'gobuster', 'ffuf',
  'wfuzz', 'aircrack', 'john', 'hashcat', 'exploit',
];

// SQL injection patterns (compiled for performance)
const SQL_PATTERNS = [
  /\b(select|insert|update|delete|drop|alter|create|truncate|union|exec|execute)\b/i,
  /('.*--)/i,
  /('.*;)/i,
  /\b(and|or)\s+\d+\s*=\s*\d+/i,
  /\b(and|or)\s+'.*'\s*=\s*'.*'/i,
  /\b(union\s+select|union\s+all\s+select)\b/i,
  /\b(load_file|outfile|dumpfile)\b/i,
  /--\s*$/m,
  /\/\*.*\*\//,
  /\b(if|case)\s*\(/i,
  /\bsleep\s*\(/i,
  /\bbenchmark\s*\(/i,
];

// XSS patterns
const XSS_PATTERNS = [
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
  /\.cookie\s*=/i,
  /\.localStorage\s*=/i,
  /\.sessionStorage\s*=/i,
  /atob\s*\(/i,
  /btoa\s*\(/i,
];

// ✅ ALLOWED static file extensions (NOT suspicious)
const ALLOWED_EXTENSIONS = [
  '.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico', '.webp', '.avif',
  '.mp4', '.webm', '.mov', '.avi',
  '.mp3', '.wav', '.ogg',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.css', '.js', '.json', '.xml',
];

// ⚠️ Suspicious file extensions (block these)
const SUSPICIOUS_EXTENSIONS = [
  '.php', '.asp', '.aspx', '.jsp', '.cgi', '.pl', '.py', '.rb',
  '.exe', '.dll', '.sh', '.bat', '.cmd', '.htaccess', '.htpasswd',
  '.env', '.git', '.svn', '.bak', '.backup', '.config',
  '.json.bak', '.yml.bak', '.yaml.bak',
  '.sql', '.dump', '.sqlite', '.db',
];

export function validateRequest(req: NextRequest): { valid: boolean; reason?: string; details?: string } {
  const userAgent = req.headers.get('user-agent') || '';
  const method = req.method;
  const pathname = req.nextUrl.pathname;
  const isApiRoute = pathname.startsWith('/api/');
  
  // ============================================
  // 1. SKIP VALIDATION FOR STATIC ASSETS
  // ============================================
  // Check if this is a static asset request
  const isStaticAsset = 
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/public/') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/img/') ||
    pathname.startsWith('/fonts/') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/manifest.json') ||
    pathname.startsWith('/robots.txt') ||
    pathname.startsWith('/sitemap.xml');
  
  // Check if it's a known file extension
  const hasAllowedExtension = ALLOWED_EXTENSIONS.some(ext => pathname.toLowerCase().endsWith(ext));
  
  // Skip validation for static assets and allowed extensions
  if (isStaticAsset || hasAllowedExtension) {
    return { valid: true };
  }

  // ============================================
  // 2. CHECK FOR MISSING USER AGENT
  // ============================================
  if (!userAgent && process.env.NODE_ENV === 'production') {
    return { valid: false, reason: 'Missing user agent' };
  }

  // ============================================
  // 3. BLOCK OBVIOUS BOTS AND AUTOMATED TOOLS
  // ============================================
  // Skip user-agent blocking for API routes in development
  if (process.env.NODE_ENV === 'production' || !isApiRoute) {
    const lowerUserAgent = userAgent.toLowerCase();
    if (SUSPICIOUS_AGENTS.some(agent => lowerUserAgent.includes(agent))) {
      return { valid: false, reason: 'Suspicious user agent', details: userAgent };
    }
  }

  // ============================================
  // 4. CHECK FOR SQL INJECTION
  // ============================================
  // Check URL parameters
  const searchParams = req.nextUrl.searchParams;
  for (const [key, value] of searchParams.entries()) {
    const decodedValue = decodeURIComponent(value);
    if (SQL_PATTERNS.some(pattern => pattern.test(decodedValue))) {
      return { valid: false, reason: `SQL injection detected in parameter: ${key}`, details: decodedValue };
    }
  }

  // Check path for SQL patterns
  if (SQL_PATTERNS.some(pattern => pattern.test(pathname))) {
    return { valid: false, reason: 'SQL injection detected in path', details: pathname };
  }

  // ============================================
  // 5. CHECK FOR XSS
  // ============================================
  const fullUrl = req.nextUrl.toString();
  const decodedUrl = decodeURIComponent(fullUrl);
  if (XSS_PATTERNS.some(pattern => pattern.test(decodedUrl))) {
    return { valid: false, reason: 'XSS attack detected', details: decodedUrl };
  }

  // ============================================
  // 6. CHECK FOR PATH TRAVERSAL
  // ============================================
  if (/\.\.\//.test(decodedUrl) || /\.\.\\/.test(decodedUrl)) {
    return { valid: false, reason: 'Path traversal attempt' };
  }

  // ============================================
  // 7. CHECK FOR SUSPICIOUS FILE EXTENSIONS
  // ============================================
  // Only check if it's NOT an allowed extension
  if (!hasAllowedExtension) {
    if (SUSPICIOUS_EXTENSIONS.some(ext => pathname.toLowerCase().endsWith(ext))) {
      return { valid: false, reason: 'Suspicious file extension', details: pathname };
    }
  }

  // ============================================
  // 8. CHECK FOR NULL BYTE INJECTION
  // ============================================
  if (decodedUrl.includes('%00') || decodedUrl.includes('\x00')) {
    return { valid: false, reason: 'Null byte injection attempt' };
  }

  // ============================================
  // 9. CHECK FOR LARGE PAYLOADS (DoS prevention)
  // ============================================
  const contentLength = req.headers.get('content-length');
  if (contentLength) {
    const size = parseInt(contentLength);
    if (size > 10 * 1024 * 1024) { // 10MB max
      return { valid: false, reason: 'Payload too large', details: `${size} bytes` };
    }
  }

  return { valid: true };
}

// Validate request body (for API routes)
export function validateRequestBody(body: any, schema: Record<string, any>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Invalid request body'] };
  }

  // Check for injection in body values
  const bodyString = JSON.stringify(body);
  if (SQL_PATTERNS.some(p => p.test(bodyString))) {
    errors.push('SQL injection detected in request body');
  }
  if (XSS_PATTERNS.some(p => p.test(bodyString))) {
    errors.push('XSS attack detected in request body');
  }

  // Check required fields
  for (const [key, config] of Object.entries(schema)) {
    const { required, type, minLength, maxLength, pattern } = config as any;
    
    if (required && (body[key] === undefined || body[key] === null || body[key] === '')) {
      errors.push(`Missing required field: ${key}`);
      continue;
    }
    
    if (body[key] !== undefined && body[key] !== null) {
      const value = body[key];
      
      if (type === 'string' && typeof value !== 'string') {
        errors.push(`Field ${key} must be a string`);
      } else if (type === 'string') {
        if (minLength && value.length < minLength) {
          errors.push(`Field ${key} must be at least ${minLength} characters`);
        }
        if (maxLength && value.length > maxLength) {
          errors.push(`Field ${key} must be at most ${maxLength} characters`);
        }
        if (pattern && !new RegExp(pattern).test(value)) {
          errors.push(`Field ${key} has invalid format`);
        }
        // Check for injection in string values
        const safeValue = decodeURIComponent(value);
        if (SQL_PATTERNS.some(p => p.test(safeValue)) || XSS_PATTERNS.some(p => p.test(safeValue))) {
          errors.push(`Potential injection detected in field: ${key}`);
        }
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
}