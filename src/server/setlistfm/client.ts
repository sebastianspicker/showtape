import type { Setlist } from '@/domain/setlist';
import { readTextWithinLimit } from '@/http/read-text-within-limit';
import { mapSetlistFmResponse } from './map-response';

type FetchSetlistFailure = {
  ok: false;
  status: number;
  message: string;
  retryAfterSeconds?: number;
};
export type FetchSetlistResult = { ok: true; setlist: Setlist } | FetchSetlistFailure;
type Attempt =
  | { kind: 'success'; setlist: Setlist }
  | { kind: 'failure'; error: FetchSetlistFailure }
  | { kind: 'rate-limit'; message: string; retryAfterSeconds?: number };
const SETLIST_FM_BASE_URL = 'https://api.setlist.fm/rest/1.0';
const maxResponseBytes = 10 * 1024 * 1024;
const timeoutMs = 10_000;
const maxRetries = 2;
const cacheTtl = 60 * 60 * 1000;
const cacheLimit = 200;
const maxCachedChars = 500_000;
const cache = new Map<string, { setlist: Setlist; expires: number }>();
const inFlight = new Map<string, Promise<FetchSetlistResult>>();
const failure = (
  status: number,
  message: string,
  retryAfterSeconds?: number
): FetchSetlistFailure => ({
  ok: false,
  status,
  message,
  ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
});
const timeoutFailure = (): Attempt => ({
  kind: 'failure',
  error: failure(504, 'setlist.fm request timed out.'),
});
const responseResult = async (
  response: Response,
  expectedId: string,
  signal: AbortSignal
): Promise<Attempt> => {
  let result: FetchSetlistResult;
  try {
    const body = await readTextWithinLimit(response, maxResponseBytes);
    if (body === null) result = failure(502, 'setlist.fm response was too large.');
    else if (!response.ok)
      result = failure(response.status, `setlist.fm returned HTTP ${response.status}.`);
    else {
      const parsed = JSON.parse(body) as unknown;
      const setlist = mapSetlistFmResponse(parsed, expectedId);
      result = setlist ? { ok: true, setlist } : failure(502, 'Invalid response from setlist.fm.');
    }
  } catch {
    result = failure(502, 'Invalid response from setlist.fm.');
  }
  if (signal.aborted) return timeoutFailure();
  if (result.ok) return { kind: 'success', setlist: result.setlist };
  return result.status === 429
    ? {
        kind: 'rate-limit',
        message: result.message,
        retryAfterSeconds: parseRetryAfterSeconds(response.headers.get('retry-after')),
      }
    : { kind: 'failure', error: result };
};

export function parseRetryAfterSeconds(value: string | null, now = Date.now()): number | undefined {
  const candidate = value?.trim();
  if (!candidate) return undefined;

  let seconds: number;
  if (/^\d+$/.test(candidate)) seconds = Number(candidate);
  else {
    if (/^[+\-.\d]/.test(candidate)) return undefined;
    const timestamp = Date.parse(candidate);
    if (Number.isNaN(timestamp)) return undefined;
    seconds = Math.ceil((timestamp - now) / 1000);
  }
  if (!Number.isFinite(seconds)) return undefined;
  return Math.min(60, Math.max(1, seconds));
}

const retryDelay = (retryAfterSeconds: number | undefined) =>
  Math.min((retryAfterSeconds ?? 1) * 1000, 2000) + Math.floor(Math.random() * 100);
const wait = (delay: number, signal: AbortSignal) =>
  new Promise<boolean>((resolve) => {
    if (signal.aborted) return resolve(false);
    const done = (ok: boolean) => {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      resolve(ok);
    };
    const abort = () => done(false);
    const timer = setTimeout(() => done(true), delay);
    signal.addEventListener('abort', abort, { once: true });
  });
export async function fetchUncachedSetlist(
  id: string,
  apiKey: string,
  cacheResult: (setlist: Setlist) => void
): Promise<FetchSetlistResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const url = new URL(`${SETLIST_FM_BASE_URL}/setlist/${encodeURIComponent(id)}`);
      let result: Attempt;
      try {
        const response = await fetch(url, {
          headers: { 'x-api-key': apiKey, Accept: 'application/json' },
          redirect: 'manual',
          signal: controller.signal,
        });
        result =
          response.status >= 300 && response.status < 400
            ? { kind: 'failure', error: failure(502, 'Invalid setlist.fm upstream redirect.') }
            : await responseResult(response, id, controller.signal);
      } catch {
        result = controller.signal.aborted
          ? timeoutFailure()
          : { kind: 'failure', error: failure(502, 'Unable to reach setlist.fm.') };
      }
      if (result.kind === 'success') {
        cacheResult(result.setlist);
        return { ok: true, setlist: result.setlist };
      }
      if (result.kind === 'failure') return result.error;
      if (attempt === maxRetries)
        return failure(
          429,
          result.message || 'setlist.fm rate limit exceeded. Please try again in a moment.',
          result.retryAfterSeconds
        );
      if (!(await wait(retryDelay(result.retryAfterSeconds), controller.signal)))
        return failure(504, 'setlist.fm request timed out.');
    }
    return failure(429, 'setlist.fm rate limit exceeded. Please try again in a moment.');
  } finally {
    clearTimeout(timer);
  }
}
export async function fetchSetlistFromApi(id: string, apiKey: string): Promise<FetchSetlistResult> {
  const cached = cache.get(id);
  if (cached) {
    cache.delete(id);
    if (Date.now() < cached.expires) {
      cache.set(id, cached);
      return { ok: true, setlist: cached.setlist };
    }
  }
  const existing = inFlight.get(id);
  if (existing) return existing;
  const pending = fetchUncachedSetlist(id, apiKey, (setlist) => {
    if (JSON.stringify(setlist).length > maxCachedChars) return;
    cache.set(id, { setlist, expires: Date.now() + cacheTtl });
    if (cache.size > cacheLimit) {
      const now = Date.now();
      for (const [key, entry] of cache) if (now > entry.expires) cache.delete(key);
      while (cache.size > cacheLimit) {
        const key = cache.keys().next().value;
        if (!key) break;
        cache.delete(key);
      }
    }
  });
  inFlight.set(id, pending);
  try {
    return await pending;
  } finally {
    if (inFlight.get(id) === pending) inFlight.delete(id);
  }
}
