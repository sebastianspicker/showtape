import { handleDevToken } from '@repo/api';
import { NextRequest } from 'next/server';
import { API_ERROR, isDevTokenSuccess } from '@repo/shared';
import { jsonResponse } from '@/lib/api-response';
import { createInMemoryRateLimiter } from '@/lib/rate-limit';
import { checkRateLimit, internalError, optionsNoContent } from '../../_helpers';

const DEV_TOKEN_RATE_LIMIT = createInMemoryRateLimiter(30, 60_000);

export async function OPTIONS(request: NextRequest) {
  return optionsNoContent(request);
}

export async function GET(request: NextRequest) {
  const { rateHeaders, rateLimitedResponse } = checkRateLimit(request, DEV_TOKEN_RATE_LIMIT);
  if (rateLimitedResponse) return rateLimitedResponse;

  try {
    const result = await handleDevToken();
    const status = isDevTokenSuccess(result) ? 200 : 503;
    const payload = 'error' in result ? { ...result, code: API_ERROR.SERVICE_UNAVAILABLE } : result;
    return jsonResponse(payload, status, request, {
      'Cache-Control': 'no-store',
      Pragma: 'no-cache',
      ...rateHeaders,
    });
  } catch {
    return internalError(request);
  }
}
