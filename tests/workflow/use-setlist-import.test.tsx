// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiFailure, Result } from '@/contracts/api';
import type { Setlist } from '@/domain/setlist';
import { requestSetlist } from '@/client/showtape-api';
import { useSetlistImport } from '@/workflow/import/useSetlistImport';

vi.mock('@/client/showtape-api', () => ({ requestSetlist: vi.fn() }));

const requestSetlistMock = vi.mocked(requestSetlist);

function deferred<T>() {
  let resolve: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve: resolve! };
}

function setlist(id: string): Setlist {
  return { id, artist: 'Artist', sets: [[{ name: 'Song' }]] };
}

function memoryStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    get length() {
      return entries.size;
    },
    clear: () => entries.clear(),
    getItem: (key) => entries.get(key) ?? null,
    key: (index) => [...entries.keys()][index] ?? null,
    removeItem: (key) => void entries.delete(key),
    setItem: (key, value) => void entries.set(key, String(value)),
  };
}

function setup(onLoaded = vi.fn()) {
  const onRestart = vi.fn();
  const hook = renderHook(() => useSetlistImport({ onLoaded, onRestart }));
  return { ...hook, onLoaded, onRestart };
}

const historyItem = (id: string) => ({ input: id, setlistId: id });

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('useSetlistImport', () => {
  it('does not let a stale import completion replace the current setlist', async () => {
    const first = deferred<Result<Setlist, ApiFailure>>();
    const second = deferred<Result<Setlist, ApiFailure>>();
    requestSetlistMock
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const { result, onLoaded } = setup();

    act(() => {
      result.current.selectHistoryItem(historyItem('1a2b3c4d'));
      result.current.selectHistoryItem(historyItem('2a2b3c4d'));
    });
    await act(async () => {
      second.resolve({ ok: true, value: setlist('2a2b3c4d') });
    });
    expect(result.current.setlist?.id).toBe('2a2b3c4d');
    expect(result.current.history).toEqual([{ input: '2a2b3c4d', setlistId: '2a2b3c4d' }]);

    await act(async () => {
      first.resolve({ ok: true, value: setlist('1a2b3c4d') });
    });
    expect(result.current.setlist?.id).toBe('2a2b3c4d');
    expect(result.current.history).toEqual([{ input: '2a2b3c4d', setlistId: '2a2b3c4d' }]);
    expect(result.current.loading).toBe(false);
    expect(onLoaded).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem('setlist_import_history_v3') ?? '[]')).toEqual([
      { input: '2a2b3c4d', setlistId: '2a2b3c4d' },
    ]);
  });

  it('shows the retry wait, retries the same input, and advances on success', async () => {
    requestSetlistMock.mockResolvedValueOnce({
      ok: false,
      error: { status: 429, code: 'RATE_LIMIT', message: 'Busy.', retryAfterSeconds: 17 },
    });
    const { result, onLoaded } = setup();

    act(() => result.current.setInputValue(' deadbeef '));
    await act(async () => {
      result.current.submit({ preventDefault: vi.fn() } as never);
    });
    expect(result.current.displayedError).toBe('Busy. Please wait 17 seconds before retrying.');
    expect(result.current.retryable).toBe(true);
    expect(onLoaded).not.toHaveBeenCalled();

    requestSetlistMock.mockResolvedValueOnce({ ok: true, value: setlist('deadbeef') });
    await act(async () => {
      result.current.retry();
    });
    expect(requestSetlistMock.mock.calls.map(([input]) => input)).toEqual(['deadbeef', 'deadbeef']);
    expect(result.current.displayedError).toBeNull();
    expect(onLoaded).toHaveBeenCalledTimes(1);
  });

  it('reports an unexpected failure while retrying instead of leaving it unhandled', async () => {
    requestSetlistMock.mockResolvedValue({ ok: true, value: setlist('deadbeef') });
    const onLoaded = vi.fn(() => {
      throw new Error('Advancing failed');
    });
    const { result } = setup(onLoaded);
    act(() => result.current.setInputValue('deadbeef'));

    await act(async () => {
      result.current.retry();
    });
    expect(onLoaded).toHaveBeenCalledTimes(1);
    expect(result.current.displayedError).toBe('Unable to load the setlist. Please try again.');
    expect(result.current.retryable).toBe(true);
  });

  it('keeps transport failures retryable with their message', async () => {
    requestSetlistMock.mockRejectedValueOnce(new Error('Network down'));
    const { result, onLoaded } = setup();
    act(() => result.current.setInputValue('deadbeef'));

    await act(async () => {
      result.current.retry();
    });
    expect(result.current.displayedError).toBe('Network down');
    expect(result.current.retryable).toBe(true);
    expect(onLoaded).not.toHaveBeenCalled();
  });

  it('rejects invalid input without a request and keeps or clears the import on return', async () => {
    requestSetlistMock.mockResolvedValue({ ok: true, value: setlist('deadbeef') });
    const { result, onRestart } = setup();

    await act(async () => {
      result.current.submit({ preventDefault: vi.fn() } as never);
    });
    expect(result.current.displayedError).toBe('Enter a setlist.fm URL or setlist ID.');
    expect(requestSetlistMock).not.toHaveBeenCalled();

    act(() => result.current.setInputValue('deadbeef'));
    await act(async () => {
      result.current.submit({ preventDefault: vi.fn() } as never);
    });
    act(() => result.current.backToImport());
    expect(onRestart).toHaveBeenCalledTimes(1);
    expect(result.current.inputValue).toBe('deadbeef');
    expect(result.current.setlist?.id).toBe('deadbeef');

    act(() => result.current.reset());
    expect(onRestart).toHaveBeenCalledTimes(2);
    expect(result.current.inputValue).toBe('');
    expect(result.current.setlist).toBeNull();
  });

  it('clears the stored history and announces it', async () => {
    requestSetlistMock.mockResolvedValue({ ok: true, value: setlist('deadbeef') });
    const { result } = setup();
    await act(async () => {
      result.current.selectHistoryItem(historyItem('deadbeef'));
    });
    expect(result.current.history).toHaveLength(1);

    act(() => result.current.clearHistory());
    expect(result.current.history).toEqual([]);
    expect(result.current.historyAnnouncement).toBe('Recent imports cleared.');
    expect(localStorage.getItem('setlist_import_history_v3')).toBeNull();
  });
});
