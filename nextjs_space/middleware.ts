import { NextRequest, NextResponse } from 'next/server';

const PRIVATE_PATHS = ['/admin', '/auth/login'];
const PUBLIC_HOSTS = new Set(['phipi.me', 'www.phipi.me']);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host')?.split(':')[0]?.toLowerCase() || '';

  if (PUBLIC_HOSTS.has(host) && PRIVATE_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return new NextResponse('Not Found', {
      status: 404,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/auth/login/:path*'],
};
