import { readTextWithinLimit, SETLIST_FM_BASE_URL } from '@repo/shared';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const cache = new Map<string, { body: unknown; expires: number }>();
const MAX_UPSTREAM_RESPONSE_BYTES = 10 * 1024 * 1024;
const MAX_CACHEABLE_BODY_CHARS = 500_000;
const UPSTREAM_TIMEOUT_MS = 10_000;
const inFlight = new Map<string, Promise<FetchSetlistResult>>();

function getCached(id: string): unknown | null {
  const entry = cache.get(id);
  if (!entry || Date.now() > entry.expires) {
    if (entry) cache.delete(id);
    return null;
  }
  return entry.body;
}

/** Evict expired entries when cache exceeds this size. */
const CACHE_EVICT_THRESHOLD = 200;

function evictExpired(): void {
  const now = Date.now();
  const toDelete: string[] = [];
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expires) toDelete.push(key);
  }
  for (const key of toDelete) {
    cache.delete(key);
  }
}

function setCached(id: string, body: unknown): void {
  // Successful setlist responses are usually small; skip unusual payloads to bound memory use.
  if (JSON.stringify(body).length > MAX_CACHEABLE_BODY_CHARS) return;

  cache.set(id, { body, expires: Date.now() + CACHE_TTL_MS });
  if (cache.size > CACHE_EVICT_THRESHOLD) {
    evictExpired();
  }
  if (cache.size > CACHE_EVICT_THRESHOLD) {
    const excess = cache.size - CACHE_EVICT_THRESHOLD;
    let removed = 0;
    for (const key of cache.keys()) {
      cache.delete(key);
      removed += 1;
      if (removed >= excess) break;
    }
  }
}

const MAX_RETRIES_429 = 2;
const BACKOFF_MS = 1000;
const MAX_RETRY_AFTER_DELAY_MS = 2000;

function parseRetryAfterMs(value: string | null): number | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10) * 1000;
  }
  if (/^[+-]\d+$/.test(trimmed)) return null;

  const timestamp = Date.parse(trimmed);
  if (Number.isNaN(timestamp)) return null;

  return Math.max(0, timestamp - Date.now());
}

function getRetryDelayMs(res: Response): number {
  const retryAfterValue =
    typeof res.headers?.get === 'function' ? res.headers.get('retry-after') : null;
  const retryAfterMs = parseRetryAfterMs(retryAfterValue);
  const baseDelayMs = Math.min(retryAfterMs ?? BACKOFF_MS, MAX_RETRY_AFTER_DELAY_MS);
  // Add small jitter so parallel callers do not retry at the exact same instant.
  const jitterMs = Math.floor(Math.random() * 100);
  return Math.max(0, baseDelayMs) + jitterMs;
}

export type FetchSetlistResult =
  | { ok: true; body: unknown }
  | { ok: false; status: number; message: string };

type FetchSetlistFailure = Extract<FetchSetlistResult, { ok: false }>;

type FetchAttemptResult =
  | { kind: 'success'; body: unknown }
  | { kind: 'failure'; error: FetchSetlistFailure }
  | { kind: 'rate-limit'; response: Response; message: string };

const responseTooLarge = (): FetchSetlistFailure => ({
  ok: false,
  status: 502,
  message: 'setlist.fm response was too large.',
});

const invalidUpstreamResponse = (): FetchSetlistFailure => ({
  ok: false,
  status: 502,
  message: 'Invalid response from setlist.fm.',
});

const isValidSetlistResponse = (body: unknown, expectedId: string): boolean => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
  const record = body as Record<string, unknown>;
  const artist = record.artist;
  return (
    typeof record.id === 'string' &&
    record.id.toLowerCase() === expectedId.toLowerCase() &&
    typeof record.eventDate === 'string' &&
    record.eventDate.trim().length > 0 &&
    Boolean(artist) &&
    typeof artist === 'object' &&
    !Array.isArray(artist) &&
    typeof (artist as Record<string, unknown>).name === 'string' &&
    ((artist as Record<string, unknown>).name as string).trim().length > 0 &&
    (record.set === undefined || Array.isArray(record.set))
  );
};

const readSuccessfulResponse = async (
  res: Response,
  expectedId: string
): Promise<FetchSetlistResult> => {
  try {
    const text = await readTextWithinLimit(res, MAX_UPSTREAM_RESPONSE_BYTES);
    if (text === null) return responseTooLarge();

    const body = JSON.parse(text) as unknown;
    if (!isValidSetlistResponse(body, expectedId)) return invalidUpstreamResponse();
    return { ok: true, body };
  } catch {
    return invalidUpstreamResponse();
  }
};

const parseUpstreamMessage = (text: string, statusText: string): string => {
  try {
    const parsed = JSON.parse(text) as { message?: unknown };
    return typeof parsed.message === 'string' ? parsed.message : text || statusText;
  } catch {
    return text || statusText;
  }
};

const readFailureResponse = async (res: Response): Promise<FetchSetlistFailure> => {
  try {
    const text = await readTextWithinLimit(res, MAX_UPSTREAM_RESPONSE_BYTES);
    if (text === null) return responseTooLarge();
    return {
      ok: false,
      status: res.status,
      message: parseUpstreamMessage(text, res.statusText),
    };
  } catch {
    return invalidUpstreamResponse();
  }
};

const fetchAttempt = async (
  url: string,
  headers: Record<string, string>,
  expectedId: string,
  signal: AbortSignal
): Promise<FetchAttemptResult> => {
  try {
    const response = await fetch(url, { headers, signal });
    if (response.ok) {
      const result = await readSuccessfulResponse(response, expectedId);
      if (signal.aborted) {
        return {
          kind: 'failure',
          error: { ok: false, status: 504, message: 'setlist.fm request timed out.' },
        };
      }
      return result.ok
        ? { kind: 'success', body: result.body }
        : { kind: 'failure', error: result };
    }

    const error = await readFailureResponse(response);
    if (signal.aborted) {
      return {
        kind: 'failure',
        error: { ok: false, status: 504, message: 'setlist.fm request timed out.' },
      };
    }
    if (error.status === 429) {
      return { kind: 'rate-limit', response, message: error.message };
    }
    return {
      kind: 'failure',
      error: { ...error, message: error.message || `setlist.fm returned ${error.status}` },
    };
  } catch {
    return {
      kind: 'failure',
      error: signal.aborted
        ? { ok: false, status: 504, message: 'setlist.fm request timed out.' }
        : { ok: false, status: 502, message: 'Unable to reach setlist.fm.' },
    };
  }
};

const waitForRetry = (delayMs: number, signal: AbortSignal): Promise<boolean> =>
  new Promise((resolve) => {
    if (signal.aborted) {
      resolve(false);
      return;
    }
    const finish = (completed: boolean) => {
      clearTimeout(timeoutId);
      signal.removeEventListener('abort', onAbort);
      resolve(completed);
    };
    const onAbort = () => finish(false);
    const timeoutId = setTimeout(() => finish(true), delayMs);
    signal.addEventListener('abort', onAbort, { once: true });
  });

const fetchUncachedSetlist = async (
  setlistId: string,
  apiKey: string
): Promise<FetchSetlistResult> => {
  const url = `${SETLIST_FM_BASE_URL}/setlist/${encodeURIComponent(setlistId)}`;
  const headers: Record<string, string> = {
    'x-api-key': apiKey,
    Accept: 'application/json',
  };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    // Retry up to MAX_RETRIES_429 times on 429; stop on any other status.
    for (let attempt = 0; attempt <= MAX_RETRIES_429; attempt++) {
      const result = await fetchAttempt(url, headers, setlistId, controller.signal);
      if (result.kind === 'success') {
        setCached(setlistId, result.body);
        return { ok: true, body: result.body };
      }
      if (result.kind === 'failure') return result.error;
      if (attempt >= MAX_RETRIES_429) {
        return {
          ok: false,
          status: 429,
          message:
            result.message || 'setlist.fm rate limit exceeded. Please try again in a moment.',
        };
      }
      const completedDelay = await waitForRetry(
        getRetryDelayMs(result.response),
        controller.signal
      );
      if (!completedDelay) {
        return { ok: false, status: 504, message: 'setlist.fm request timed out.' };
      }
    }
  } finally {
    clearTimeout(timeoutId);
  }

  return {
    ok: false,
    status: 429,
    message: 'setlist.fm rate limit exceeded. Please try again in a moment.',
  };
};

/** Fetch a setlist from the setlist.fm API with caching, coalescing, and bounded retries. */
export async function fetchSetlistFromApi(
  setlistId: string,
  apiKey: string
): Promise<FetchSetlistResult> {
  const cached = getCached(setlistId);
  if (cached !== null) return { ok: true, body: cached };

  const existing = inFlight.get(setlistId);
  if (existing) return existing;

  const pending = fetchUncachedSetlist(setlistId, apiKey);
  inFlight.set(setlistId, pending);
  try {
    return await pending;
  } finally {
    if (inFlight.get(setlistId) === pending) inFlight.delete(setlistId);
  }
}
