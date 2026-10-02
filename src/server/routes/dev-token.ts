import type { NextRequest } from 'next/server';
import { API_ERROR, isDevTokenSuccess } from '@/contracts/api';
import { issueDeveloperToken } from '../apple-token/developer-token';
import { appleSigningCredentials } from '../config';
import { checkRateLimit, internalError, optionsNoContent } from '../http/helpers';
import { createInMemoryRateLimiter } from '../http/rate-limit';
import { jsonResponse } from '../http/response';

const DEV_TOKEN_RATE_LIMIT = createInMemoryRateLimiter(30, 60_000);

export function OPTIONS(request: NextRequest) {
  return optionsNoContent(request);
}

export async function GET(request: NextRequest) {
  const { rateHeaders, rateLimitedResponse } = checkRateLimit(request, DEV_TOKEN_RATE_LIMIT);
  if (rateLimitedResponse) return rateLimitedResponse;

  try {
    const result = await issueDeveloperToken(appleSigningCredentials());
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
