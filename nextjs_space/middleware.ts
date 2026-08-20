import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory rate limiter. For production, replace with Redis-based solution
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = {
  default: 100,
  api: 30,
  auth: 5,
  llm: 10,
};

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

function getRateLimit(identifier: string, limit: number): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || entry.resetTime < now) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return { allowed: true, remaining: limit - 1, resetTime: now + RATE_LIMIT_WINDOW };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetTime: entry.resetTime };
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');

  return forwarded?.split(',')[0]?.trim() ||
         realIP ||
         'unknown';
}

function getRateLimitConfig(path: string): { limit: number; type: string } {
  if (path.includes('/api/signup') || path.includes('/api/auth')) {
    return { limit: RATE_LIMIT_MAX.auth, type: 'auth' };
  }
  if (
    path.includes('generate-') ||
    path.includes('fetch-sources') ||
    path.includes('process-url') ||
    path.includes('/api/admin/morning')
  ) {
    return { limit: RATE_LIMIT_MAX.llm, type: 'llm' };
  }
  if (path.startsWith('/api/')) {
    return { limit: RATE_LIMIT_MAX.api, type: 'api' };
  }
  return { limit: RATE_LIMIT_MAX.default, type: 'default' };
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Skip rate limiting for static files
  if (path.match(/\.(jpg|jpeg|png|gif|svg|css|js|woff|woff2|ttf)$/)) {
    return NextResponse.next();
  }

  const { limit, type } = getRateLimitConfig(path);
  const clientIP = getClientIP(request);
  const identifier = `${clientIP}:${type}`;

  const { allowed, remaining, resetTime } = getRateLimit(identifier, limit);

  const response = allowed
    ? NextResponse.next()
    : NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );

  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://s.ytimg.com; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://*; font-src 'self'; connect-src 'self' https://openrouter.ai; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
    );
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json).*)',
  ],
};
