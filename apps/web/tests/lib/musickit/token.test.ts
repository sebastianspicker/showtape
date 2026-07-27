import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Result } from '@repo/shared';

vi.mock('../../../src/lib/fetch', () => ({
  fetchApiJson: vi.fn(),
}));

import { fetchApiJson } from '../../../src/lib/fetch';
const mockFetchApiJson = vi.mocked(fetchApiJson);

describe('fetchDeveloperToken', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    mockFetchApiJson.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  async function loadModule() {
    const mod = await import('../../../src/lib/musickit/token');
    return mod.fetchDeveloperToken;
  }

  it('first call fetches from API and caches the result', async () => {
    mockFetchApiJson.mockResolvedValueOnce({ ok: true, value: { token: 'tok-abc' } });

    const fetchDeveloperToken = await loadModule();
    const token = await fetchDeveloperToken();

    expect(token).toBe('tok-abc');
    expect(mockFetchApiJson).toHaveBeenCalledTimes(1);
  });

  it('second call within TTL returns cached token without new fetch', async () => {
    mockFetchApiJson.mockResolvedValueOnce({ ok: true, value: { token: 'tok-cached' } });

    const fetchDeveloperToken = await loadModule();
    const first = await fetchDeveloperToken();
    const second = await fetchDeveloperToken();

    expect(first).toBe('tok-cached');
    expect(second).toBe('tok-cached');
    expect(mockFetchApiJson).toHaveBeenCalledTimes(1);
  });

  it('call after TTL expires fetches again', async () => {
    mockFetchApiJson
      .mockResolvedValueOnce({ ok: true, value: { token: 'tok-1' } })
      .mockResolvedValueOnce({ ok: true, value: { token: 'tok-2' } });

    const fetchDeveloperToken = await loadModule();
    const first = await fetchDeveloperToken();
    expect(first).toBe('tok-1');

    // TOKEN_CACHE_TTL_MS = 55min, buffer = 5min => valid for 50min
    // Advance past the validity window (50min + 1ms)
    vi.advanceTimersByTime(50 * 60 * 1000 + 1);

    const second = await fetchDeveloperToken();
    expect(second).toBe('tok-2');
    expect(mockFetchApiJson).toHaveBeenCalledTimes(2);
  });

  it('concurrent calls deduplicate via promise-singleton pattern', async () => {
    let resolveFetch!: (value: Result<unknown, string>) => void;
    mockFetchApiJson.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    );

    const fetchDeveloperToken = await loadModule();
    const p1 = fetchDeveloperToken();
    const p2 = fetchDeveloperToken();
    const p3 = fetchDeveloperToken();

    resolveFetch({ ok: true, value: { token: 'tok-dedup' } });

    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
    expect(r1).toBe('tok-dedup');
    expect(r2).toBe('tok-dedup');
    expect(r3).toBe('tok-dedup');
    expect(mockFetchApiJson).toHaveBeenCalledTimes(1);
  });

  it('fetch failure throws error and clears pending promise', async () => {
    mockFetchApiJson.mockResolvedValueOnce({ ok: false, error: 'Network error' });

    const fetchDeveloperToken = await loadModule();
    await expect(fetchDeveloperToken()).rejects.toThrow('Network error');

    // Subsequent call should retry (pending promise was cleared)
    mockFetchApiJson.mockResolvedValueOnce({ ok: true, value: { token: 'tok-retry' } });
    const token = await fetchDeveloperToken();
    expect(token).toBe('tok-retry');
    expect(mockFetchApiJson).toHaveBeenCalledTimes(2);
  });

  it('non-success response body throws error', async () => {
    mockFetchApiJson.mockResolvedValueOnce({
      ok: true,
      value: { error: 'Invalid key' },
    });

    const fetchDeveloperToken = await loadModule();
    await expect(fetchDeveloperToken()).rejects.toThrow('Invalid key');
  });
});
