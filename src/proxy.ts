import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { buildCsp } from './server/security/csp-artifact.mjs';
import { initializeCsp } from './server/security/csp';

const isDev = process.env.NODE_ENV === 'development';

export function proxy(request: NextRequest) {
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const hashes = process.env.NODE_ENV === 'production' ? initializeCsp() : [];
  if (!hashes) {
    return new NextResponse('Showtape is temporarily unavailable. Please try again later.', {
      status: 503,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'private, no-store, max-age=0',
        'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }
  const csp = buildCsp(nonce, [...hashes], isDev);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('x-nonce', nonce);
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  response.headers.set('CDN-Cache-Control', 'no-store');
  response.headers.set('Vercel-CDN-Cache-Control', 'no-store');

  return response;
}

export const config = {
  matcher: [
    // Only exclude non-document Next endpoints and the three known API routes.
    '/((?!_next/static/|_next/image$|api/(?:apple/dev-token|health|setlist/proxy)/?$).*)',
  ],
};
