import { NextRequest, NextResponse } from 'next/server';
import { API_ERROR, type ApiErrorPayload } from '@repo/shared';
import { corsHeadersForOptions } from '@/lib/cors';
import { jsonResponse } from '@/lib/api-response';
import {
  extractClientKeyFromHeaders,
  type InMemoryRateLimiter,
  rateLimitHeaders,
} from '@/lib/rate-limit';

interface RateLimitCheck {
  rateHeaders: Record<string, string>;
  rateLimitedResponse: NextResponse | null;
}

export function checkRateLimit(
  request: NextRequest,
  limiter: InMemoryRateLimiter,
  responseHeaders: Record<string, string> = {}
): RateLimitCheck {
  const clientKey = extractClientKeyFromHeaders(request.headers);
  const limit = clientKey ? limiter.take(clientKey) : null;
  const rateHeaders = rateLimitHeaders(limit);
  const rateLimitedResponse = limit?.limited
    ? jsonResponse(
        { error: 'Too many requests. Please retry shortly.', code: API_ERROR.RATE_LIMIT },
        429,
        request,
        {
          'Retry-After': String(limit.retryAfterSeconds),
          ...rateHeaders,
          ...responseHeaders,
        }
      )
    : null;

  return { rateHeaders, rateLimitedResponse };
}

export function optionsNoContent(request: NextRequest): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeadersForOptions(request),
  });
}

export function internalError(
  request: NextRequest,
  message = 'An unexpected error occurred. Please try again.'
): NextResponse {
  const payload: ApiErrorPayload = { error: message, code: API_ERROR.INTERNAL };
  return jsonResponse(payload, 500, request, { 'Cache-Control': 'no-store' });
}
