import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestDeveloperToken, requestSetlist } from '../../src/client/showtape-api';

function stubFetch(response: () => Response) {
  const fetchMock = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
    Promise.resolve(response())
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const requestedPath = (fetchMock: ReturnType<typeof stubFetch>) =>
  String(fetchMock.mock.calls[0]?.[0]);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('requestSetlist', () => {
  it('returns a structured API failure with the status, code, message, and retry delay', async () => {
    stubFetch(
      () =>
        new Response(JSON.stringify({ error: 'Temporarily limited', code: 'RATE_LIMIT' }), {
          status: 429,
          headers: { 'Retry-After': '12' },
        })
    );

    await expect(requestSetlist('deadbeef')).resolves.toEqual({
      ok: false,
      error: {
        status: 429,
        code: 'RATE_LIMIT',
        message: 'Temporarily limited',
        retryAfterSeconds: 12,
      },
    });
  });

  it('does not mistake a user-facing message for an error classification', async () => {
    stubFetch(
      () =>
        new Response(JSON.stringify({ error: 'No matching show here', code: 'NOT_FOUND' }), {
          status: 404,
        })
    );

    const result = await requestSetlist('deadbeef');
    expect(result).toMatchObject({
      ok: false,
      error: { status: 404, code: 'NOT_FOUND', message: 'No matching show here' },
    });
  });

  it('maps unknown error codes and non-JSON bodies to UNKNOWN failures', async () => {
    stubFetch(
      () => new Response(JSON.stringify({ error: 'Nope', code: 'UNAUTHORIZED' }), { status: 401 })
    );
    await expect(requestSetlist('deadbeef')).resolves.toMatchObject({
      ok: false,
      error: { status: 401, code: 'UNKNOWN', message: 'Nope' },
    });

    stubFetch(() => new Response('<html>gateway</html>', { status: 502 }));
    await expect(requestSetlist('deadbeef')).resolves.toMatchObject({
      ok: false,
      error: { status: 502, code: 'UNKNOWN', message: 'Invalid response (non-JSON).' },
    });
  });

  it('rejects a declared body larger than 10 MiB before reading it', async () => {
    stubFetch(
      () => new Response('{}', { headers: { 'Content-Length': String(10 * 1024 * 1024 + 1) } })
    );
    await expect(requestSetlist('deadbeef')).resolves.toMatchObject({
      ok: false,
      error: { status: 200, code: 'UNKNOWN', message: 'Response too large.' },
    });
  });

  it('returns the setlist and forwards the abort signal', async () => {
    const setlist = { id: 'deadbeef', artist: 'Artist', sets: [] };
    const fetchMock = stubFetch(() => new Response(JSON.stringify(setlist)));
    const controller = new AbortController();

    await expect(requestSetlist('deadbeef', { signal: controller.signal })).resolves.toEqual({
      ok: true,
      value: setlist,
    });
    expect(fetchMock.mock.calls[0]?.[1]).toEqual({ signal: controller.signal });
  });

  it.each([
    ['keeps setlist calls on this origin', 'deadbeef', '/api/setlist/proxy?id=deadbeef'],
    [
      'sends the trimmed, encoded input as the id query',
      '  https://www.setlist.fm/setlist/a/b-ab12cd34.html?x=1&y=2 ',
      `/api/setlist/proxy?id=${encodeURIComponent('https://www.setlist.fm/setlist/a/b-ab12cd34.html?x=1&y=2')}`,
    ],
  ])('%s', async (_name, input, expected) => {
    const fetchMock = stubFetch(() => new Response(JSON.stringify({ id: 'x' })));
    await requestSetlist(input);
    expect(requestedPath(fetchMock)).toBe(expected);
    expect(requestedPath(fetchMock)).not.toMatch(/^https?:\/\//);
  });
});

describe('requestDeveloperToken', () => {
  it('keeps Apple token calls on this origin and returns the token', async () => {
    const fetchMock = stubFetch(() => new Response(JSON.stringify({ token: 'signed' })));
    await expect(requestDeveloperToken()).resolves.toEqual({ ok: true, value: 'signed' });
    expect(requestedPath(fetchMock)).toBe('/api/apple/dev-token');
    expect(requestedPath(fetchMock)).not.toMatch(/^https?:\/\//);
  });

  it('treats an error envelope as a failure even with HTTP 200', async () => {
    stubFetch(
      () => new Response(JSON.stringify({ error: 'Not configured', code: 'SERVICE_UNAVAILABLE' }))
    );
    await expect(requestDeveloperToken()).resolves.toEqual({
      ok: false,
      error: { status: 200, code: 'SERVICE_UNAVAILABLE', message: 'Not configured' },
    });
  });

  it('fails when the body carries no token', async () => {
    stubFetch(() => new Response(JSON.stringify({})));
    await expect(requestDeveloperToken()).resolves.toMatchObject({
      ok: false,
      error: { status: 200, code: 'UNKNOWN', message: 'Failed to get Developer Token' },
    });
  });
});
