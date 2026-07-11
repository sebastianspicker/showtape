// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const mockFetchApiJson = vi.fn();

vi.mock('../../src/lib/fetch', () => ({
  fetchApiJson: (...args: unknown[]) => mockFetchApiJson(...args),
}));

import { useSetlistImportState } from '../../src/features/setlist-import/useSetlistImportState';

const firstSetlist = {
  id: '63de4613',
  eventDate: '23-08-1964',
  artist: { name: 'The Beatles' },
  venue: { name: 'Hollywood Bowl' },
  set: [{ song: [{ name: 'Yesterday' }] }],
};

const secondSetlist = {
  id: '53d6a489',
  eventDate: '14-06-2003',
  artist: { name: 'Radiohead' },
  venue: { name: 'South Park' },
  set: [{ song: [{ name: 'There There' }] }],
};

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createStorageMock(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe('useSetlistImportState', () => {
  beforeEach(() => {
    mockFetchApiJson.mockReset();
    vi.stubGlobal('localStorage', createStorageMock());
    Object.defineProperty(window, 'localStorage', {
      value: globalThis.localStorage,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('keeps only the latest request result when a previous fetch is aborted', async () => {
    mockFetchApiJson
      .mockImplementationOnce((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      })
      .mockResolvedValueOnce({ ok: true, value: secondSetlist });

    const { result } = renderHook(() => useSetlistImportState());

    let firstPromise!: Promise<boolean>;
    let secondPromise!: Promise<boolean>;
    await act(async () => {
      firstPromise = result.current.loadSetlist('63de4613');
      secondPromise = result.current.loadSetlist('53d6a489');
      await Promise.all([firstPromise, secondPromise]);
    });

    expect(await firstPromise).toBe(false);
    expect(await secondPromise).toBe(true);
    expect(result.current.setlist?.id).toBe('53d6a489');
    expect(result.current.error).toBeNull();
  });

  it('keeps the latest result when the same input is submitted twice', async () => {
    const secondFetch = createDeferred<{ ok: true; value: typeof firstSetlist }>();
    mockFetchApiJson
      .mockImplementationOnce((_url: string, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        });
      })
      .mockImplementationOnce(() => secondFetch.promise);

    const { result } = renderHook(() => useSetlistImportState());

    let firstPromise!: Promise<boolean>;
    let secondPromise!: Promise<boolean>;
    await act(async () => {
      firstPromise = result.current.loadSetlist('63de4613');
      secondPromise = result.current.loadSetlist('63de4613');
    });

    await expect(firstPromise).resolves.toBe(false);

    await act(async () => {
      secondFetch.resolve({ ok: true, value: firstSetlist });
      await secondPromise;
    });

    await expect(secondPromise).resolves.toBe(true);
    expect(result.current.setlist?.id).toBe('63de4613');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('selectHistoryItem updates the input and loads that setlist', async () => {
    window.localStorage.setItem('setlist_import_history_v1', JSON.stringify(['63de4613']));
    mockFetchApiJson.mockResolvedValueOnce({ ok: true, value: firstSetlist });

    const { result } = renderHook(() => useSetlistImportState());

    await waitFor(() => {
      expect(result.current.history).toEqual([
        {
          input: '63de4613',
          setlistId: '63de4613',
          artist: 'Previously imported setlist',
        },
      ]);
    });

    await act(async () => {
      await result.current.selectHistoryItem(result.current.history[0]!);
    });

    await waitFor(() => {
      expect(result.current.inputValue).toBe('63de4613');
      expect(result.current.setlist?.artist).toBe('The Beatles');
    });
    expect(mockFetchApiJson).toHaveBeenCalledOnce();
  });

  it('selectHistoryItem returns whether the load succeeded', async () => {
    window.localStorage.setItem('setlist_import_history_v1', JSON.stringify(['63de4613']));
    mockFetchApiJson.mockResolvedValueOnce({ ok: false, error: 'Setlist not found.' });

    const { result } = renderHook(() => useSetlistImportState());

    await waitFor(() => {
      expect(result.current.history[0]?.input).toBe('63de4613');
    });

    let ok!: boolean;
    await act(async () => {
      ok = await result.current.selectHistoryItem(result.current.history[0]!);
    });

    expect(ok).toBe(false);
    expect(result.current.error).toEqual({
      message: 'Setlist not found.',
      code: 'not-found',
      retryable: false,
    });
    expect(result.current.setlist).toBeNull();
  });

  it('rejects malformed input without making a request', async () => {
    const { result } = renderHook(() => useSetlistImportState());
    let ok!: boolean;
    await act(async () => {
      ok = await result.current.loadSetlist('https://example.com/not-a-setlist');
    });
    expect(ok).toBe(false);
    expect(mockFetchApiJson).not.toHaveBeenCalled();
    expect(result.current.error).toMatchObject({ code: 'invalid-input', retryable: false });
  });

  it('ignores corrupt history storage', async () => {
    window.localStorage.setItem('setlist_import_history_v2', '{not-json');
    const { result } = renderHook(() => useSetlistImportState());
    await waitFor(() => expect(result.current.history).toEqual([]));
  });

  it('deduplicates recent imports and keeps at most eight records', async () => {
    const { result } = renderHook(() => useSetlistImportState());
    const ids = ['aaa1', 'aaa2', 'aaa3', 'aaa4', 'aaa5', 'aaa6', 'aaa7', 'aaa8', 'aaa9'];
    for (const id of ids) {
      mockFetchApiJson.mockResolvedValueOnce({
        ok: true,
        value: { ...firstSetlist, id, artist: { name: `Artist ${id}` } },
      });
      await act(async () => {
        await result.current.loadSetlist(id);
      });
    }
    mockFetchApiJson.mockResolvedValueOnce({ ok: true, value: { ...firstSetlist, id: 'aaa9' } });
    await act(async () => {
      await result.current.loadSetlist('aaa9');
    });

    expect(result.current.history).toHaveLength(8);
    expect(result.current.history[0]?.setlistId).toBe('aaa9');
    expect(result.current.history.filter((item) => item.setlistId === 'aaa9')).toHaveLength(1);
  });

  it('continues successfully when history storage is unavailable', async () => {
    const storage = createStorageMock();
    storage.setItem = () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    };
    Object.defineProperty(window, 'localStorage', { value: storage, configurable: true });
    mockFetchApiJson.mockResolvedValueOnce({ ok: true, value: firstSetlist });
    const { result } = renderHook(() => useSetlistImportState());

    await act(async () => {
      await expect(result.current.loadSetlist('63de4613')).resolves.toBe(true);
    });
    expect(result.current.setlist?.id).toBe('63de4613');
  });
});
