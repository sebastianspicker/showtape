import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { API_ERROR } from '../../src/contracts/api';
import {
  GET as devTokenGet,
  OPTIONS as devTokenOptions,
} from '../../src/app/api/apple/dev-token/route';
import { GET as healthGet, OPTIONS as healthOptions } from '../../src/app/api/health/route';
import {
  GET as setlistGet,
  OPTIONS as setlistOptions,
} from '../../src/app/api/setlist/proxy/route';

const request = (path: string, method = 'GET') =>
  new NextRequest(`https://showtape.test${path}`, {
    method,
    headers: { origin: 'http://localhost:3000' },
  });

const originalAppleEnvironment = {
  teamId: process.env.APPLE_TEAM_ID,
  keyId: process.env.APPLE_KEY_ID,
  privateKey: process.env.APPLE_PRIVATE_KEY,
  setlistFmApiKey: process.env.SETLISTFM_API_KEY,
};

afterEach(() => {
  const environment = [
    ['APPLE_TEAM_ID', originalAppleEnvironment.teamId],
    ['APPLE_KEY_ID', originalAppleEnvironment.keyId],
    ['APPLE_PRIVATE_KEY', originalAppleEnvironment.privateKey],
    ['SETLISTFM_API_KEY', originalAppleEnvironment.setlistFmApiKey],
  ] as const;
  for (const [name, value] of environment)
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('public API route contracts', () => {
  it.each([
    ['health', healthOptions, '/api/health'],
    ['Apple developer token', devTokenOptions, '/api/apple/dev-token'],
    ['setlist proxy', setlistOptions, '/api/setlist/proxy'],
  ])('answers %s preflight with the restricted CORS contract', async (_name, options, path) => {
    const response = await options(request(path, 'OPTIONS'));

    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
    expect(response.headers.get('Content-Type')).toBeNull();
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
    expect(response.headers.get('Access-Control-Max-Age')).toBe('86400');
  });

  it('returns a cacheable, hardened health envelope', async () => {
    const response = healthGet(request('/api/health'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ status: 'ok' });
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
  });

  it.each([
    ['health', healthGet, '/api/health', 200],
    ['Apple developer token', devTokenGet, '/api/apple/dev-token', 503],
    ['setlist proxy', setlistGet, '/api/setlist/proxy', 400],
  ])('accepts native %s requests without an Origin header', async (_name, get, path, status) => {
    delete process.env.APPLE_TEAM_ID;
    delete process.env.APPLE_KEY_ID;
    delete process.env.APPLE_PRIVATE_KEY;

    const response = await get(new NextRequest(`https://showtape.test${path}`));

    expect(response.status).toBe(status);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(response.headers.get('Vary')).toBe('Origin');
  });

  it('returns non-cacheable service-unavailable envelopes when Apple signing config is absent', async () => {
    delete process.env.APPLE_TEAM_ID;
    delete process.env.APPLE_KEY_ID;
    delete process.env.APPLE_PRIVATE_KEY;

    const response = await devTokenGet(request('/api/apple/dev-token'));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error:
        'Missing env var(s): APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY. Copy .env.example to .env and fill them in.',
      code: 'SERVICE_UNAVAILABLE',
    });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Pragma')).toBe('no-cache');
  });

  it('rejects missing setlist input with a non-cacheable error envelope', async () => {
    const response = await setlistGet(request('/api/setlist/proxy'));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Missing id or url query parameter.' });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('returns the typed Setlist contract instead of the upstream response shape', async () => {
    process.env.SETLISTFM_API_KEY = 'test-key';
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
              upstreamOnly: true,
            })
          )
        )
      )
    );

    const response = await setlistGet(request('/api/setlist/proxy?id=ab12cd34'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: 'ab12cd34',
      artist: 'Artist',
      eventDate: '23-08-1964',
      sourceUrl: 'https://www.setlist.fm/',
      sets: [[{ name: 'Song', artist: 'Artist' }]],
    });
    expect(response.headers.get('Cache-Control')).toBe('private, max-age=3600');
  });

  it('forwards bounded upstream retry timing after exhausting setlist.fm retries', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0);
    process.env.SETLISTFM_API_KEY = 'test-key';
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(new Response(null, { status: 429, headers: { 'Retry-After': '90' } }))
      )
    );

    const pendingResponse = setlistGet(request('/api/setlist/proxy?id=9a2b3c4d'));
    await vi.runAllTimersAsync();
    const response = await pendingResponse;

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('60');
    expect(await response.json()).toEqual({
      error: 'setlist.fm returned HTTP 429.',
      code: API_ERROR.RATE_LIMIT,
      retryAfterSeconds: 60,
    });
  });
});

describe('API HTTP contract characterization', () => {
  const originalHttpEnvironment = {
    allowedOrigin: process.env.ALLOWED_ORIGIN,
    trustProxy: process.env.TRUST_PROXY,
  };
  let nextClient = 0;
  const uniqueClient = () => `203.0.113.${++nextClient}`;

  const call = (path: string, headers: Record<string, string> = {}, method = 'GET') =>
    new NextRequest(`https://showtape.test${path}`, { method, headers });

  const restoreEnvironmentVariable = (name: string, value: string | undefined) => {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  };

  const stubUpstream = (response: () => Response) => {
    const fetchMock = vi.fn((..._args: unknown[]) => Promise.resolve(response()));
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  };

  const upstreamSetlist = (id: string, artist = 'Artist') =>
    JSON.stringify({
      id,
      eventDate: '23-08-1964',
      artist: { name: artist },
      set: [{ song: [{ name: 'Song' }] }],
    });

  const expectedSetlist = (id: string, artist = 'Artist') => ({
    id,
    artist,
    eventDate: '23-08-1964',
    sourceUrl: 'https://www.setlist.fm/',
    sets: [[{ name: 'Song', artist }]],
  });

  const setlistUrl = (id: string) =>
    encodeURIComponent(`https://www.setlist.fm/setlist/artist/2020/venue-${id}.html`);

  afterEach(() => {
    vi.restoreAllMocks();
    restoreEnvironmentVariable('ALLOWED_ORIGIN', originalHttpEnvironment.allowedOrigin);
    restoreEnvironmentVariable('TRUST_PROXY', originalHttpEnvironment.trustProxy);
  });

  describe('route-level rate limits', () => {
    it('limits the setlist proxy to 20 requests per client per window', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2030-01-01T00:00:00Z'));
      process.env.TRUST_PROXY = '1';
      const headers = { 'x-forwarded-for': `${uniqueClient()}, 10.0.0.1` };

      for (let index = 1; index <= 20; index++) {
        const response = await setlistGet(call('/api/setlist/proxy', headers));
        expect(response.status).toBe(400);
        expect(response.headers.get('X-RateLimit-Policy')).toBe('trusted-proxy');
        expect(response.headers.get('X-RateLimit-Remaining')).toBe(String(20 - index));
      }

      const limited = await setlistGet(call('/api/setlist/proxy', headers));
      expect(limited.status).toBe(429);
      expect(await limited.json()).toEqual({
        error: 'Too many requests. Please retry shortly.',
        code: 'RATE_LIMIT',
      });
      expect(limited.headers.get('Retry-After')).toBe('60');
      expect(limited.headers.get('X-RateLimit-Policy')).toBe('trusted-proxy');
      expect(limited.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(limited.headers.get('Cache-Control')).toBe('no-store');
      expect(limited.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(limited.headers.get('X-Frame-Options')).toBe('DENY');
    });

    it('limits the Apple developer token to 30 requests per client per window', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2030-01-01T00:00:00Z'));
      process.env.TRUST_PROXY = '1';
      delete process.env.APPLE_TEAM_ID;
      delete process.env.APPLE_KEY_ID;
      delete process.env.APPLE_PRIVATE_KEY;
      const headers = { 'x-forwarded-for': uniqueClient() };

      for (let index = 1; index <= 30; index++) {
        const response = await devTokenGet(call('/api/apple/dev-token', headers));
        expect(response.status).toBe(503);
        expect(response.headers.get('X-RateLimit-Remaining')).toBe(String(30 - index));
      }

      const limited = await devTokenGet(call('/api/apple/dev-token', headers));
      expect(limited.status).toBe(429);
      expect(await limited.json()).toEqual({
        error: 'Too many requests. Please retry shortly.',
        code: 'RATE_LIMIT',
      });
      expect(limited.headers.get('Retry-After')).toBe('60');
      expect(limited.headers.get('X-RateLimit-Policy')).toBe('trusted-proxy');
      expect(limited.headers.get('X-RateLimit-Remaining')).toBe('0');
      // characterization: current behavior - the dev-token limiter does not add no-store to 429s
      expect(limited.headers.get('Cache-Control')).toBeNull();
    });

    it('keeps separate buckets per forwarded client and falls back to x-real-ip', async () => {
      process.env.TRUST_PROXY = '1';
      const first = await setlistGet(
        call('/api/setlist/proxy', { 'x-forwarded-for': uniqueClient() })
      );
      const second = await setlistGet(
        call('/api/setlist/proxy', { 'x-forwarded-for': uniqueClient() })
      );
      const real = await setlistGet(call('/api/setlist/proxy', { 'x-real-ip': uniqueClient() }));

      for (const response of [first, second, real])
        expect(response.headers.get('X-RateLimit-Remaining')).toBe('19');
    });

    it('does not rate limit and reports the disabled policy without TRUST_PROXY', async () => {
      delete process.env.TRUST_PROXY;
      const headers = { 'x-forwarded-for': uniqueClient() };

      for (let index = 0; index < 25; index++) {
        const response = await setlistGet(call('/api/setlist/proxy', headers));
        expect(response.status).toBe(400);
        expect(response.headers.get('X-RateLimit-Policy')).toBe(
          'disabled-direct-no-trusted-client-key'
        );
        expect(response.headers.get('X-RateLimit-Remaining')).toBeNull();
      }
    });

    it('reports the disabled policy on successful setlist and dev-token responses', async () => {
      delete process.env.TRUST_PROXY;
      process.env.SETLISTFM_API_KEY = 'test-key';
      stubUpstream(() => new Response(upstreamSetlist('a1b2c3d4')));

      const setlist = await setlistGet(call('/api/setlist/proxy?id=a1b2c3d4'));
      expect(setlist.status).toBe(200);
      expect(setlist.headers.get('X-RateLimit-Policy')).toBe(
        'disabled-direct-no-trusted-client-key'
      );
      expect(setlist.headers.get('X-RateLimit-Remaining')).toBeNull();

      delete process.env.APPLE_TEAM_ID;
      const token = await devTokenGet(call('/api/apple/dev-token'));
      expect(token.headers.get('X-RateLimit-Policy')).toBe('disabled-direct-no-trusted-client-key');
      expect(token.headers.get('X-RateLimit-Remaining')).toBeNull();
    });
  });

  describe('CORS', () => {
    const withOrigin = (origin: string) => call('/api/health', { origin });
    const preflight = (origin: string) => call('/api/health', { origin }, 'OPTIONS');

    it('echoes only origins listed in ALLOWED_ORIGIN, normalizing trailing slashes', () => {
      process.env.ALLOWED_ORIGIN = 'https://a.example, https://b.example/';

      for (const origin of ['https://a.example', 'https://b.example']) {
        const response = healthGet(withOrigin(origin));
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
        expect(response.headers.get('Vary')).toBe('Origin');
      }
      for (const origin of ['https://c.example', 'https://a.example/', 'http://localhost:3000']) {
        const response = healthGet(withOrigin(origin));
        expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
        expect(response.headers.get('Vary')).toBe('Origin');
      }
    });

    it('allows only http localhost and 127.0.0.1 origins when ALLOWED_ORIGIN is unset', () => {
      delete process.env.ALLOWED_ORIGIN;

      for (const origin of ['http://localhost:3000', 'http://127.0.0.1:3000']) {
        expect(healthGet(withOrigin(origin)).headers.get('Access-Control-Allow-Origin')).toBe(
          origin
        );
      }
      for (const origin of ['https://localhost', 'http://evil.example', 'null']) {
        expect(healthGet(withOrigin(origin)).headers.get('Access-Control-Allow-Origin')).toBeNull();
      }
    });

    it('ignores wildcard and null entries in ALLOWED_ORIGIN', () => {
      process.env.ALLOWED_ORIGIN = '*, null';

      for (const origin of ['https://a.example', 'null', '*', 'http://localhost:3000']) {
        expect(healthGet(withOrigin(origin)).headers.get('Access-Control-Allow-Origin')).toBeNull();
      }
    });

    it('answers preflight with CORS headers only for allowed origins', async () => {
      process.env.ALLOWED_ORIGIN = 'https://a.example';

      const allowed = await healthOptions(preflight('https://a.example'));
      expect(allowed.status).toBe(204);
      expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe('https://a.example');
      expect(allowed.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
      expect(allowed.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
      expect(allowed.headers.get('Access-Control-Max-Age')).toBe('86400');
      expect(allowed.headers.get('Vary')).toBe('Origin');

      const denied = await healthOptions(preflight('https://evil.example'));
      expect(denied.status).toBe(204);
      expect(denied.headers.get('Access-Control-Allow-Origin')).toBeNull();
      expect(denied.headers.get('Access-Control-Allow-Methods')).toBeNull();
      expect(denied.headers.get('Access-Control-Allow-Headers')).toBeNull();
      expect(denied.headers.get('Access-Control-Max-Age')).toBeNull();
      expect(denied.headers.get('Vary')).toBe('Origin');
    });

    it('adds nosniff and frame-deny headers to JSON responses', () => {
      delete process.env.ALLOWED_ORIGIN;
      const response = healthGet(withOrigin('http://localhost:3000'));

      expect(response.headers.get('Content-Type')).toContain('application/json');
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    });
  });

  describe('setlist proxy input and upstream mapping', () => {
    it('treats ?url= like ?id= and prefers id when both are given', async () => {
      process.env.SETLISTFM_API_KEY = 'test-key';
      const urlFetch = stubUpstream(() => new Response(upstreamSetlist('bb11cc22')));

      const byUrl = await setlistGet(call(`/api/setlist/proxy?url=${setlistUrl('bb11cc22')}`));
      expect(byUrl.status).toBe(200);
      expect(await byUrl.json()).toEqual(expectedSetlist('bb11cc22'));
      expect(String(urlFetch.mock.calls[0]?.[0])).toBe(
        'https://api.setlist.fm/rest/1.0/setlist/bb11cc22'
      );

      const bothFetch = stubUpstream(() => new Response(upstreamSetlist('dd33ee44')));
      const both = await setlistGet(
        call(`/api/setlist/proxy?id=dd33ee44&url=${setlistUrl('bb11cc22')}`)
      );
      expect(both.status).toBe(200);
      expect(await both.json()).toEqual(expectedSetlist('dd33ee44'));
      expect(String(bothFetch.mock.calls[0]?.[0])).toBe(
        'https://api.setlist.fm/rest/1.0/setlist/dd33ee44'
      );
    });

    it('rejects input over 2000 characters without an error code', async () => {
      const response = await setlistGet(call(`/api/setlist/proxy?id=${'a'.repeat(2001)}`));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: 'Input too long. Use setlist ID or a shorter setlist.fm URL (max 2000 characters).',
      });
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    });

    it('accepts input of exactly 2000 characters and then rejects it as an invalid id', async () => {
      process.env.SETLISTFM_API_KEY = 'test-key';
      const response = await setlistGet(call(`/api/setlist/proxy?id=${'a'.repeat(2000)}`));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: 'Invalid setlist ID or URL. Use a setlist.fm URL or the setlist ID (e.g. 63de4613).',
        code: 'BAD_REQUEST',
      });
    });

    it('rejects an invalid id with BAD_REQUEST and a no-store response', async () => {
      process.env.SETLISTFM_API_KEY = 'test-key';
      const response = await setlistGet(call('/api/setlist/proxy?id=not-an-id'));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: 'Invalid setlist ID or URL. Use a setlist.fm URL or the setlist ID (e.g. 63de4613).',
        code: 'BAD_REQUEST',
      });
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    });

    it('masks a missing SETLISTFM_API_KEY as a generic service-unavailable error', async () => {
      delete process.env.SETLISTFM_API_KEY;
      const response = await setlistGet(call('/api/setlist/proxy?id=ab12cd34'));

      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({
        error: 'setlist.fm is temporarily unavailable',
        code: 'SERVICE_UNAVAILABLE',
      });
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    });

    it('checks the API key before validating the id', async () => {
      delete process.env.SETLISTFM_API_KEY;
      const response = await setlistGet(call('/api/setlist/proxy?id=not-an-id'));

      expect(response.status).toBe(503);
    });

    it('masks upstream 5xx responses as 503', async () => {
      process.env.SETLISTFM_API_KEY = 'test-key';
      stubUpstream(() => new Response('boom', { status: 500 }));
      const response = await setlistGet(call('/api/setlist/proxy?id=500a500b'));

      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({
        error: 'setlist.fm is temporarily unavailable',
        code: 'SERVICE_UNAVAILABLE',
      });
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    });

    it.each([400, 401, 403])('passes upstream %i through as BAD_REQUEST', async (upstream) => {
      process.env.SETLISTFM_API_KEY = 'test-key';
      stubUpstream(() => new Response('nope', { status: upstream }));
      const response = await setlistGet(call(`/api/setlist/proxy?id=${upstream}a${upstream}b`));

      expect(response.status).toBe(upstream);
      expect(await response.json()).toEqual({
        error: `setlist.fm returned HTTP ${upstream}.`,
        code: 'BAD_REQUEST',
      });
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    });

    it('maps upstream 404 to NOT_FOUND', async () => {
      process.env.SETLISTFM_API_KEY = 'test-key';
      stubUpstream(() => new Response('missing', { status: 404 }));
      const response = await setlistGet(call('/api/setlist/proxy?id=404a404b'));

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        error: 'setlist.fm returned HTTP 404.',
        code: 'NOT_FOUND',
      });
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    });

    it('returns a private one-hour cacheable success response', async () => {
      process.env.SETLISTFM_API_KEY = 'test-key';
      stubUpstream(() => new Response(upstreamSetlist('c0ffee01')));
      const response = await setlistGet(call('/api/setlist/proxy?id=c0ffee01'));

      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('private, max-age=3600');
      expect(response.headers.get('Content-Type')).toContain('application/json');
    });
  });

  describe('Apple developer token headers', () => {
    it('marks failures as no-store and no-cache', async () => {
      delete process.env.APPLE_TEAM_ID;
      const response = await devTokenGet(call('/api/apple/dev-token'));

      expect(response.status).toBe(503);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(response.headers.get('Pragma')).toBe('no-cache');
    });

    it('reports signing failures as a masked 503 and marks them no-store', async () => {
      process.env.APPLE_TEAM_ID = 'TEAM123456';
      process.env.APPLE_KEY_ID = 'KEY1234567';
      process.env.APPLE_PRIVATE_KEY = 'not a pem';
      vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const response = await devTokenGet(call('/api/apple/dev-token'));

      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({
        error: 'Token signing failed. Check server configuration and logs.',
        code: 'SERVICE_UNAVAILABLE',
      });
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(response.headers.get('Pragma')).toBe('no-cache');
    });
  });
});
