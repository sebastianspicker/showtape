import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/server/apple-token/developer-token', () => ({
  issueDeveloperToken: vi.fn(() => Promise.reject(new Error('token boom'))),
}));
vi.mock('@/server/setlistfm/get-setlist', () => ({
  getSetlist: vi.fn(() => Promise.reject(new Error('setlist boom'))),
}));
vi.mock('@/server/config', () => ({
  appleSigningCredentials: () => ({ ok: true, teamId: 'T', keyId: 'K', privateKeyPem: 'P' }),
  setlistFmApiKey: () => 'key',
  allowedOrigins: () => null,
  trustProxy: () => false,
}));

import { GET as devTokenGet } from '../../src/app/api/apple/dev-token/route';
import { GET as setlistGet } from '../../src/app/api/setlist/proxy/route';

const request = (path: string) =>
  new NextRequest(`https://showtape.test${path}`, { headers: { origin: 'http://localhost:3000' } });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('unexpected handler failures', () => {
  it.each([
    ['setlist proxy', setlistGet, '/api/setlist/proxy?id=ab12cd34'],
    ['Apple developer token', devTokenGet, '/api/apple/dev-token'],
  ])('maps a thrown %s error to a generic non-cacheable 500', async (_name, get, path) => {
    const response = await get(request(path));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: 'An unexpected error occurred. Please try again.',
      code: 'INTERNAL',
    });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
  });
});
