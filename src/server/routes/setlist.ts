import type { NextRequest } from 'next/server';
import { API_ERROR, isErr } from '@/contracts/api';
import { MAX_SETLIST_INPUT_LENGTH, SETLIST_INPUT_MESSAGES } from '@/domain/setlist';
import { setlistFmApiKey } from '../config';
import { checkRateLimit, internalError, optionsNoContent } from '../http/helpers';
import { createInMemoryRateLimiter } from '../http/rate-limit';
import { jsonResponse } from '../http/response';
import { getSetlist, type GetSetlistResult } from '../setlistfm/get-setlist';

const SETLIST_PROXY_RATE_LIMIT = createInMemoryRateLimiter(20, 60_000);
const CACHE_HIT = { 'Cache-Control': 'private, max-age=3600' } as const;
const CACHE_NO_STORE = { 'Cache-Control': 'no-store' } as const;
const UPSTREAM_UNAVAILABLE = 'setlist.fm is temporarily unavailable';

export function OPTIONS(request: NextRequest) {
  return optionsNoContent(request);
}

function setlistInput(request: NextRequest): string {
  return request.nextUrl.searchParams.get('id') || request.nextUrl.searchParams.get('url') || '';
}

function invalidInputResponse(
  request: NextRequest,
  id: string,
  rateHeaders: Record<string, string>
) {
  if (!id) {
    return jsonResponse({ error: 'Missing id or url query parameter.' }, 400, request, {
      ...rateHeaders,
      ...CACHE_NO_STORE,
    });
  }
  if (id.length > MAX_SETLIST_INPUT_LENGTH) {
    return jsonResponse({ error: SETLIST_INPUT_MESSAGES.INPUT_TOO_LONG }, 400, request, {
      ...rateHeaders,
      ...CACHE_NO_STORE,
    });
  }
  return null;
}

function setlistResultResponse(
  result: GetSetlistResult,
  request: NextRequest,
  rateHeaders: Record<string, string>
) {
  if (!isErr(result)) {
    return jsonResponse(result.value, 200, request, { ...rateHeaders, ...CACHE_HIT });
  }

  // Clients only see the generic message, so log the internal reason (never the key or input).
  if (result.error.status >= 500) {
    console.error(
      `setlist.fm request failed (${result.error.status}): ${result.error.error.error}`
    );
  }
  const payload =
    result.error.status >= 500
      ? { error: UPSTREAM_UNAVAILABLE, code: result.error.error.code }
      : result.error.error;
  const retryHeaders: Record<string, string> = result.error.error.retryAfterSeconds
    ? { 'Retry-After': String(result.error.error.retryAfterSeconds) }
    : {};
  return jsonResponse(payload, result.error.status, request, {
    ...rateHeaders,
    ...retryHeaders,
    ...CACHE_NO_STORE,
  });
}

function missingApiKeyResponse(request: NextRequest, rateHeaders: Record<string, string>) {
  console.error('SETLISTFM_API_KEY is not set. Copy .env.example to .env and add your key.');
  return jsonResponse(
    { error: UPSTREAM_UNAVAILABLE, code: API_ERROR.SERVICE_UNAVAILABLE },
    503,
    request,
    { ...rateHeaders, ...CACHE_NO_STORE }
  );
}

export async function GET(request: NextRequest) {
  const { rateHeaders, rateLimitedResponse } = checkRateLimit(
    request,
    SETLIST_PROXY_RATE_LIMIT,
    CACHE_NO_STORE
  );
  if (rateLimitedResponse) return rateLimitedResponse;

  const id = setlistInput(request);
  const invalid = invalidInputResponse(request, id, rateHeaders);
  if (invalid) return invalid;

  try {
    const apiKey = setlistFmApiKey();
    if (!apiKey) return missingApiKeyResponse(request, rateHeaders);
    return setlistResultResponse(await getSetlist(id, apiKey), request, rateHeaders);
  } catch {
    return internalError(request);
  }
}
