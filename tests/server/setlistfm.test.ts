import { afterEach, describe, expect, it, vi } from 'vitest';
import { API_ERROR, isErr } from '../../src/contracts/api';
import { getSetlist } from '../../src/server/setlistfm/get-setlist';
import { mapSetlistFmResponse } from '../../src/server/setlistfm/map-response';
import {
  fetchSetlistFromApi,
  fetchUncachedSetlist,
  parseRetryAfterSeconds,
} from '../../src/server/setlistfm/client';

const validUpstreamSetlist = (id: string) => ({
  id,
  eventDate: '23-08-1964',
  artist: { name: 'Artist' },
  set: [{ song: [{ name: 'Song' }] }],
});

function deferred<T>() {
  let resolve: (value: T) => void;
  let reject: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve: resolve!, reject: reject! };
}
const original = process.env.SETLISTFM_API_KEY;
afterEach(() => {
  if (original === undefined) delete process.env.SETLISTFM_API_KEY;
  else process.env.SETLISTFM_API_KEY = original;
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe('setlist upstream boundary', () => {
  it('rejects malformed input without an upstream request', async () => {
    process.env.SETLISTFM_API_KEY = 'test-key';
    const result = await getSetlist('not an identifier', 'test-key');
    expect(isErr(result) && result.error.error.code).toBe(API_ERROR.BAD_REQUEST);
  });
  it('uses the fixed upstream origin and never exposes its API key', async () => {
    const apiKey = 'secret';
    const fetchMock = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            id: 'ab12cd34',
            eventDate: '23-08-1964',
            artist: { name: 'Artist' },
            set: [],
          })
        )
      )
    );
    vi.stubGlobal('fetch', fetchMock);
    const result = await fetchUncachedSetlist('ab12cd34', apiKey, vi.fn());
    expect(result.ok).toBe(true);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      'https://api.setlist.fm/rest/1.0/setlist/ab12cd34'
    );
    expect(JSON.stringify(result)).not.toContain(apiKey);
  });
  it('maps hostile upstream payloads at the server boundary', () => {
    const setlist = mapSetlistFmResponse(
      {
        id: 'ab12cd34',
        eventDate: '23-08-1964',
        artist: { name: 'Artist' },
        url: 'javascript:alert(1)',
        set: [
          {
            song: [
              { name: 'Tape', tape: true },
              { name: 'Malformed tape', tape: 'true' },
              { name: 'Cover', cover: { name: 'Guest' } },
              { name: 'Song', info: 'Encore' },
              { name: '' },
            ],
          },
          { song: [{ name: 'Finale' }] },
          { song: 'not an array' },
        ],
      },
      'ab12cd34'
    );

    expect(setlist).toEqual({
      id: 'ab12cd34',
      artist: 'Artist',
      eventDate: '23-08-1964',
      sourceUrl: 'https://www.setlist.fm/',
      sets: [
        [
          { name: 'Cover', artist: 'Guest', info: undefined },
          { name: 'Song', artist: 'Artist', info: 'Encore' },
        ],
        [{ name: 'Finale', artist: 'Artist', info: undefined }],
      ],
    });
    expect(
      mapSetlistFmResponse(
        JSON.parse('{"__proto__":{"polluted":true},"id":"ab12cd34"}'),
        'ab12cd34'
      )
    ).toBeNull();
  });
  it('returns the mapped Setlist rather than the upstream transport payload', async () => {
    const apiKey = 'secret';
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              id: 'ab12cd34',
              eventDate: '23-08-1964',
              artist: { name: 'Artist' },
              set: [{ song: [{ name: 'Song' }] }],
              ignoredUpstreamField: 'do not expose',
            })
          )
        )
      )
    );

    const result = await fetchUncachedSetlist('ab12cd34', apiKey, vi.fn());
    expect(result).toEqual({
      ok: true,
      setlist: {
        id: 'ab12cd34',
        artist: 'Artist',
        eventDate: '23-08-1964',
        sourceUrl: 'https://www.setlist.fm/',
        sets: [[{ name: 'Song', artist: 'Artist', info: undefined }]],
      },
    });
  });
  it('sanitizes hostile upstream error bodies', async () => {
    const apiKey = 'secret';
    process.env.SETLISTFM_API_KEY = apiKey;
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify({ message: apiKey }), { status: 400 }))
      )
    );
    const result = await getSetlist('ab12cd34', apiKey);
    expect(isErr(result) && result.error.error.error).toBe('setlist.fm returned HTTP 400.');
    expect(JSON.stringify(result)).not.toContain(apiKey);
  });

  it('rejects an actual upstream redirect without following it', async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
      Promise.resolve(
        new Response(null, { status: 302, headers: { Location: 'https://example.test' } })
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchUncachedSetlist('1a2b3c4d', 'secret', vi.fn())).resolves.toEqual({
      ok: false,
      status: 502,
      message: 'Invalid setlist.fm upstream redirect.',
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ redirect: 'manual' });
  });

  it('times out an upstream request that does not settle', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(
      (_url: URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError'))
          );
        })
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = fetchUncachedSetlist('2a2b3c4d', 'secret', vi.fn());
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(result).resolves.toEqual({
      ok: false,
      status: 504,
      message: 'setlist.fm request timed out.',
    });
  });

  it('retries rate limits no more than the configured bound', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const fetchMock = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ error: 'slow down' }), { status: 429 }))
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = fetchUncachedSetlist('3a2b3c4d', 'secret', vi.fn());
    await vi.runAllTimersAsync();
    await expect(result).resolves.toMatchObject({ ok: false, status: 429 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('parses Retry-After delay seconds and dates within the public retry bounds', () => {
    const now = Date.parse('2026-09-07T12:00:00Z');

    expect(parseRetryAfterSeconds('0', now)).toBe(1);
    expect(parseRetryAfterSeconds('12', now)).toBe(12);
    expect(parseRetryAfterSeconds('999999999999999999999999', now)).toBe(60);
    expect(parseRetryAfterSeconds('Sun, 07 Sep 2026 12:00:31 GMT', now)).toBe(31);
    expect(parseRetryAfterSeconds('Sun, 07 Sep 2026 11:59:00 GMT', now)).toBe(1);
    expect(parseRetryAfterSeconds('1.5', now)).toBeUndefined();
    expect(parseRetryAfterSeconds('+10', now)).toBeUndefined();
    expect(parseRetryAfterSeconds('not a date', now)).toBeUndefined();
  });

  it('propagates the bounded Retry-After value from the final exhausted rate limit', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const fetchMock = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(new Response(null, { status: 429, headers: { 'Retry-After': '3' } }))
      .mockResolvedValueOnce(
        new Response(null, { status: 429, headers: { 'Retry-After': 'invalid' } })
      )
      .mockResolvedValueOnce(
        new Response(null, { status: 429, headers: { 'Retry-After': '120' } })
      );
    vi.stubGlobal('fetch', fetchMock);

    const result = fetchUncachedSetlist('6a2b3c4d', 'secret', vi.fn());
    await vi.runAllTimersAsync();

    await expect(result).resolves.toEqual({
      ok: false,
      status: 429,
      message: 'setlist.fm returned HTTP 429.',
      retryAfterSeconds: 60,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('omits retry metadata when the final Retry-After value is invalid', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(new Response(null, { status: 429, headers: { 'Retry-After': 'later' } }))
      )
    );

    const result = fetchUncachedSetlist('7a2b3c4d', 'secret', vi.fn());
    await vi.runAllTimersAsync();
    await expect(result).resolves.toEqual({
      ok: false,
      status: 429,
      message: 'setlist.fm returned HTTP 429.',
    });
  });

  it('serves cache hits and coalesces concurrent requests for one setlist', async () => {
    const cachedId = '4a2b3c4d';
    const coalescedId = '5a2b3c4d';
    const pending = deferred<Response>();
    const fetchMock = vi
      .fn<(_url: URL) => Promise<Response>>()
      .mockResolvedValueOnce(new Response(JSON.stringify(validUpstreamSetlist(cachedId))))
      .mockImplementationOnce(() => pending.promise);
    vi.stubGlobal('fetch', fetchMock);

    const first = await fetchSetlistFromApi(cachedId, 'secret');
    const second = await fetchSetlistFromApi(cachedId, 'secret');
    expect(first).toEqual(second);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const concurrentFirst = fetchSetlistFromApi(coalescedId, 'secret');
    const concurrentSecond = fetchSetlistFromApi(coalescedId, 'secret');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    pending.resolve(new Response(JSON.stringify(validUpstreamSetlist(coalescedId))));
    await expect(Promise.all([concurrentFirst, concurrentSecond])).resolves.toEqual([
      expect.objectContaining({ ok: true }),
      expect.objectContaining({ ok: true }),
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects excess distinct concurrent work without blocking same-ID followers', async () => {
    vi.resetModules();
    const service = await import('../../src/server/setlistfm/client');
    const responses = new Map<string, ReturnType<typeof deferred<Response>>>();
    const fetchMock = vi.fn((url: URL) => {
      const id = url.pathname.split('/').at(-1)!;
      const response = deferred<Response>();
      responses.set(id, response);
      return response.promise;
    });
    vi.stubGlobal('fetch', fetchMock);
    const ids = Array.from({ length: service.SETLIST_UPSTREAM_MAX_CONCURRENT + 1 }, (_, index) =>
      (0x20000000 + index).toString(16)
    );

    const active = ids
      .slice(0, service.SETLIST_UPSTREAM_MAX_CONCURRENT)
      .map((id) => service.fetchSetlistFromApi(id, 'secret'));
    const follower = service.fetchSetlistFromApi(ids[0]!, 'secret');

    await expect(service.fetchSetlistFromApi(ids.at(-1)!, 'secret')).resolves.toEqual({
      ok: false,
      status: 429,
      message: 'Showtape is handling too many setlist requests. Please retry shortly.',
      retryAfterSeconds: 1,
    });
    expect(fetchMock).toHaveBeenCalledTimes(service.SETLIST_UPSTREAM_MAX_CONCURRENT);

    responses.get(ids[0]!)!.resolve(new Response(JSON.stringify(validUpstreamSetlist(ids[0]!))));
    await expect(active[0]).resolves.toMatchObject({ ok: true });
    await expect(follower).resolves.toMatchObject({ ok: true });

    const admittedAfterCompletion = service.fetchSetlistFromApi(ids.at(-1)!, 'secret');
    expect(fetchMock).toHaveBeenCalledTimes(service.SETLIST_UPSTREAM_MAX_CONCURRENT + 1);
    responses
      .get(ids.at(-1)!)!
      .resolve(new Response(JSON.stringify(validUpstreamSetlist(ids.at(-1)!))));
    for (const id of ids.slice(1, service.SETLIST_UPSTREAM_MAX_CONCURRENT)) {
      responses.get(id)!.resolve(new Response(JSON.stringify(validUpstreamSetlist(id))));
    }
    await expect(admittedAfterCompletion).resolves.toMatchObject({ ok: true });
    const remaining = await Promise.all(active.slice(1));
    expect(remaining).toHaveLength(service.SETLIST_UPSTREAM_MAX_CONCURRENT - 1);
    expect(remaining.every((result) => result.ok)).toBe(true);
  });

  it('releases distinct-work capacity after an upstream timeout', async () => {
    vi.resetModules();
    vi.useFakeTimers();
    const service = await import('../../src/server/setlistfm/client');
    const fetchMock = vi.fn(
      (_url: URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError'))
          );
        })
    );
    vi.stubGlobal('fetch', fetchMock);

    const first = service.fetchSetlistFromApi('30000000', 'secret');
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(first).resolves.toMatchObject({ ok: false, status: 504 });

    const second = service.fetchSetlistFromApi('30000000', 'secret');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(second).resolves.toMatchObject({ ok: false, status: 504 });
  });

  it('bounds new upstream operations in each fixed window', async () => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-07T12:00:00Z'));
    const service = await import('../../src/server/setlistfm/client');
    const fetchMock = vi.fn((url: URL) => {
      const id = url.pathname.split('/').at(-1)!;
      return Promise.resolve(new Response(JSON.stringify(validUpstreamSetlist(id))));
    });
    vi.stubGlobal('fetch', fetchMock);

    for (let index = 0; index < service.SETLIST_UPSTREAM_MAX_STARTS_PER_MINUTE; index++) {
      await expect(
        service.fetchSetlistFromApi((0x40000000 + index).toString(16), 'secret')
      ).resolves.toMatchObject({ ok: true });
    }

    await expect(service.fetchSetlistFromApi('50000000', 'secret')).resolves.toEqual({
      ok: false,
      status: 429,
      message: 'Showtape is handling too many setlist requests. Please retry shortly.',
      retryAfterSeconds: 60,
    });
    expect(fetchMock).toHaveBeenCalledTimes(service.SETLIST_UPSTREAM_MAX_STARTS_PER_MINUTE);

    await vi.advanceTimersByTimeAsync(60_000);
    await expect(service.fetchSetlistFromApi('50000000', 'secret')).resolves.toMatchObject({
      ok: true,
    });
  });

  it('uses fixed cache expiry and refreshes LRU order without extending TTL', async () => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-07T12:00:00Z'));
    const service = await import('../../src/server/setlistfm/client');
    const fetchMock = vi.fn((url: URL) => {
      const id = url.pathname.split('/').at(-1)!;
      return Promise.resolve(new Response(JSON.stringify(validUpstreamSetlist(id))));
    });
    vi.stubGlobal('fetch', fetchMock);
    const ids = Array.from({ length: 201 }, (_, index) => (0x10000000 + index).toString(16));

    for (const [index, id] of ids.slice(0, 200).entries()) {
      await service.fetchSetlistFromApi(id, 'secret');
      if (index + 1 === service.SETLIST_UPSTREAM_MAX_STARTS_PER_MINUTE) {
        await vi.advanceTimersByTimeAsync(60_000);
      }
    }
    await service.fetchSetlistFromApi(ids[0]!, 'secret');
    await service.fetchSetlistFromApi(ids[200]!, 'secret');
    await service.fetchSetlistFromApi(ids[0]!, 'secret');
    expect(fetchMock).toHaveBeenCalledTimes(201);
    await service.fetchSetlistFromApi(ids[1]!, 'secret');
    expect(fetchMock).toHaveBeenCalledTimes(202);

    vi.setSystemTime(new Date('2026-09-07T13:00:01Z'));
    await service.fetchSetlistFromApi(ids[0]!, 'secret');
    expect(fetchMock).toHaveBeenCalledTimes(203);
  });

  it('does not cache mapped setlists above the per-entry size bound', async () => {
    vi.resetModules();
    const service = await import('../../src/server/setlistfm/client');
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            ...validUpstreamSetlist('8a2b3c4d'),
            set: [{ song: [{ name: 'Song', info: 'x'.repeat(500_001) }] }],
          })
        )
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    await service.fetchSetlistFromApi('8a2b3c4d', 'secret');
    await service.fetchSetlistFromApi('8a2b3c4d', 'secret');

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
