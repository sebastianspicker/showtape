import {
  API_ERROR,
  isDevTokenSuccess,
  type ApiErrorCode,
  type ApiFailure,
  type DevTokenResponse,
  type Result,
} from '@/contracts/api';
import type { Setlist } from '@/domain/setlist';
import { readTextWithinLimit } from '@/http/read-text-within-limit';

/** Showtape's API is always served by the same Next.js process as the page. */
const SETLIST_PATH = '/api/setlist/proxy';
const DEV_TOKEN_PATH = '/api/apple/dev-token';

/** Max response size to avoid DoS from huge JSON (10 MiB). */
const MAX_JSON_RESPONSE_BYTES = 10 * 1024 * 1024;

function hasErrorString(data: unknown): data is { error: string; code?: unknown } {
  return (
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    typeof (data as Record<string, unknown>).error === 'string'
  );
}

function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === 'string' && Object.values(API_ERROR).includes(value as ApiErrorCode);
}

function retryAfterSeconds(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isSafeInteger(seconds) && seconds >= 0) return seconds;
  const retryAt = Date.parse(value);
  return Number.isNaN(retryAt) ? undefined : Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
}

function apiFailure(response: Response, data: unknown, fallback: string): ApiFailure {
  const error = hasErrorString(data) ? data : null;
  return {
    status: response.status,
    code: isApiErrorCode(error?.code) ? error.code : API_ERROR.UNKNOWN,
    message: error?.error ?? fallback,
    retryAfterSeconds: retryAfterSeconds(response.headers.get('Retry-After')),
  };
}

/**
 * Fetch a Showtape API path, parse bounded JSON, and treat `{ error: string }` as the route
 * error envelope, even when an intermediate layer returned HTTP 200. Transport failures and
 * aborts reject; HTTP and body failures resolve as an `ApiFailure`.
 */
async function fetchApiJson<T>(path: string, init?: RequestInit): Promise<Result<T, ApiFailure>> {
  const res = await fetch(path, init);
  const contentLength = res.headers.get('Content-Length');
  if (contentLength !== null) {
    const len = parseInt(contentLength, 10);
    if (!Number.isNaN(len) && len > MAX_JSON_RESPONSE_BYTES) {
      return { ok: false, error: apiFailure(res, null, 'Response too large.') };
    }
  }
  let data: unknown;
  try {
    const text = await readTextWithinLimit(res, MAX_JSON_RESPONSE_BYTES);
    if (text === null) {
      return { ok: false, error: apiFailure(res, null, 'Response too large.') };
    }
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: apiFailure(res, null, 'Invalid response (non-JSON).') };
  }
  if (!res.ok) {
    return { ok: false, error: apiFailure(res, data, `Request failed (${res.status})`) };
  }
  if (hasErrorString(data)) {
    return {
      ok: false,
      error: {
        status: 200,
        code: isApiErrorCode(data.code) ? data.code : API_ERROR.UNKNOWN,
        message: data.error,
      },
    };
  }
  return { ok: true, value: data as T };
}

/** Import one setlist by setlist.fm URL or ID through the same-origin proxy. */
export function requestSetlist(
  input: string,
  init?: { signal?: AbortSignal }
): Promise<Result<Setlist, ApiFailure>> {
  return fetchApiJson<Setlist>(`${SETLIST_PATH}?id=${encodeURIComponent(input.trim())}`, init);
}

/** Request a short-lived Apple developer token signed by the Showtape server. */
export async function requestDeveloperToken(): Promise<Result<string, ApiFailure>> {
  const result = await fetchApiJson<DevTokenResponse>(DEV_TOKEN_PATH);
  if (!result.ok) return result;
  if (!isDevTokenSuccess(result.value)) {
    return {
      ok: false,
      error: { status: 200, code: API_ERROR.UNKNOWN, message: 'Failed to get Developer Token' },
    };
  }
  return { ok: true, value: result.value.token };
}
