// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { MatchRow } from '../../src/features/matching/types';

const mockSearchCatalog = vi.fn();

vi.mock('../../src/lib/musickit', () => ({
  searchCatalog: (...args: unknown[]) => mockSearchCatalog(...args),
}));

import { useTrackSearch } from '../../src/features/matching/useTrackSearch';

const matches: MatchRow[] = [
  {
    setlistEntry: { name: 'Song A', artist: 'Artist A' },
    appleTrack: null,
    status: 'unmatched',
  },
  {
    setlistEntry: { name: 'Song B', artist: 'Artist B' },
    appleTrack: null,
    status: 'unmatched',
  },
];

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

beforeEach(() => {
  mockSearchCatalog.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useTrackSearch results', () => {
  it('ignores negative and out-of-range indices', async () => {
    const setMatch = vi.fn();
    const { result } = renderHook(() => useTrackSearch({ matches, setMatch }));

    act(() => {
      result.current.openSearch(-1);
      result.current.chooseTrack(-1, { id: 'song-1', name: 'Song A', artistName: 'Artist A' });
      result.current.skipTrack(2);
    });
    await act(async () => {
      await result.current.runSearch(-1);
      await result.current.runSearch(2);
    });

    expect(result.current.searchContext.searchingIndex).toBeNull();
    expect(result.current.searchContext.searchQuery).toBe('');
    expect(mockSearchCatalog).not.toHaveBeenCalled();
    expect(setMatch).not.toHaveBeenCalled();
  });

  it('runs a manual search and stores the returned results', async () => {
    const setMatch = vi.fn();
    mockSearchCatalog.mockResolvedValueOnce([
      { id: 'song-1', name: 'Song A', artistName: 'Artist A' },
    ]);

    const { result } = renderHook(() => useTrackSearch({ matches, setMatch }));

    act(() => {
      result.current.openSearch(0);
    });
    expect(result.current.searchContext.searchQuery).toBe('Song A Artist A');
    act(() => {
      result.current.setSearchQuery('Custom Song Query');
    });
    await act(async () => {
      await result.current.runSearch(0);
    });

    expect(mockSearchCatalog).toHaveBeenCalledWith('Custom Song Query', 8);
    expect(result.current.searchContext.searchResults).toEqual([
      { id: 'song-1', name: 'Song A', artistName: 'Artist A' },
    ]);
    expect(result.current.searchContext.hasSearched).toBe(true);
  });
});

describe('useTrackSearch selection lifecycle', () => {
  it('skipTrack clears the active manual search and marks the row skipped', async () => {
    const setMatch = vi.fn();
    mockSearchCatalog.mockResolvedValueOnce([
      { id: 'song-1', name: 'Song A', artistName: 'Artist A' },
    ]);

    const { result } = renderHook(() => useTrackSearch({ matches, setMatch }));

    act(() => {
      result.current.openSearch(0);
      result.current.setSearchQuery('Song A');
    });
    await act(async () => {
      await result.current.runSearch(0);
    });

    act(() => {
      result.current.skipTrack(0);
    });

    await waitFor(() => {
      expect(result.current.searchContext.searchingIndex).toBeNull();
    });
    expect(result.current.searchContext.searchResults).toEqual([]);
    expect(result.current.searchContext.searchQuery).toBe('');
    expect(setMatch).toHaveBeenCalledWith(0, null);
  });

  it('ignores stale search results after another row is opened', async () => {
    const setMatch = vi.fn();
    const search = createDeferred<{ id: string; name: string; artistName: string }[]>();
    mockSearchCatalog.mockReturnValueOnce(search.promise);

    const { result } = renderHook(() => useTrackSearch({ matches, setMatch }));

    let searchPromise!: Promise<void>;
    act(() => {
      result.current.openSearch(0);
      searchPromise = result.current.runSearch(0);
    });

    await waitFor(() => {
      expect(result.current.searchContext.searching).toBe(true);
    });

    act(() => {
      result.current.openSearch(1);
    });

    await act(async () => {
      search.resolve([{ id: 'song-1', name: 'Song A', artistName: 'Artist A' }]);
      await searchPromise;
    });

    expect(result.current.searchContext.searchingIndex).toBe(1);
    expect(result.current.searchContext.searching).toBe(false);
    expect(result.current.searchContext.searchResults).toEqual([]);
    expect(result.current.searchContext.hasSearched).toBe(false);
  });
});
