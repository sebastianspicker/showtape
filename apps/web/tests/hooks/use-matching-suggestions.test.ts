// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../../src/lib/musickit', () => ({
  searchCatalog: vi.fn(),
  isValidAppleMusicTrack: (track: unknown) =>
    Boolean(
      track &&
      typeof track === 'object' &&
      typeof (track as { id?: unknown }).id === 'string' &&
      (track as { id: string }).id.trim().length > 0
    ),
}));

import { searchCatalog } from '../../src/lib/musickit';
const mockSearchCatalog = vi.mocked(searchCatalog);

import { useMatchingSuggestions } from '../../src/features/matching/useMatchingSuggestions';
import type { Setlist } from '@repo/core';

const mockSetlist: Setlist = {
  id: 'test-123',
  artist: 'Test Artist',
  venue: 'Test Venue',
  sets: [
    [
      { name: 'Song A', artist: 'Test Artist' },
      { name: 'Song B', artist: 'Test Artist' },
      { name: 'Song C', artist: 'Test Artist' },
    ],
  ],
};

const duplicateSetlist: Setlist = {
  id: 'dupes',
  artist: 'Test Artist',
  sets: [
    [
      { name: 'Song A', artist: 'Test Artist' },
      { name: 'Song A', artist: 'Test Artist' },
    ],
  ],
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

describe('useMatchingSuggestions', () => {
  beforeEach(() => {
    mockSearchCatalog.mockReset();
    mockSearchCatalog.mockResolvedValue([]);
  });

  it('starts with loadingSuggestions true', () => {
    const { result } = renderHook(() => useMatchingSuggestions(mockSetlist));
    expect(result.current.loadingSuggestions).toBe(true);
  });

  it('creates initial matches from setlist entries', () => {
    const { result } = renderHook(() => useMatchingSuggestions(mockSetlist));
    expect(result.current.matches).toHaveLength(3);
    expect(result.current.matches[0]?.setlistEntry.name).toBe('Song A');
    expect(result.current.matches[0]?.status).toBe('unmatched');
  });

  it('autoMatchAll calls searchCatalog for each entry', async () => {
    mockSearchCatalog.mockResolvedValue([{ id: '1', name: 'Song A', artistName: 'Test Artist' }]);

    const { result } = renderHook(() => useMatchingSuggestions(mockSetlist));

    await waitFor(() => {
      expect(result.current.loadingSuggestions).toBe(false);
    });

    expect(mockSearchCatalog.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(mockSearchCatalog.mock.calls.slice(0, 3)).toEqual([
      ['Song A Test Artist', 1],
      ['Song B Test Artist', 1],
      ['Song C Test Artist', 1],
    ]);
  });

  it('setMatch updates a specific row', async () => {
    const { result } = renderHook(() => useMatchingSuggestions(mockSetlist));

    await waitFor(() => {
      expect(result.current.loadingSuggestions).toBe(false);
    });

    const track = { id: '99', name: 'Custom Track', artistName: 'Custom Artist' };
    act(() => result.current.setMatch(1, track));

    expect(result.current.matches[1]?.appleTrack).toEqual(track);
    expect(result.current.matches[1]?.status).toBe('matched');
  });

  it('skipUnmatched marks all unmatched rows as skipped', async () => {
    const { result } = renderHook(() => useMatchingSuggestions(mockSetlist));

    await waitFor(() => {
      expect(result.current.loadingSuggestions).toBe(false);
    });

    act(() => result.current.skipUnmatched());

    for (const row of result.current.matches) {
      expect(row.status).toBe('skipped');
    }
  });

  it('resetMatches clears all matches back to unmatched', async () => {
    mockSearchCatalog.mockResolvedValue([{ id: '1', name: 'Song A', artistName: 'Test Artist' }]);

    const { result } = renderHook(() => useMatchingSuggestions(mockSetlist));

    await waitFor(() => {
      expect(result.current.loadingSuggestions).toBe(false);
    });

    act(() => result.current.resetMatches());

    for (const row of result.current.matches) {
      expect(row.status).toBe('unmatched');
      expect(row.appleTrack).toBeNull();
    }
  });

  it('does not overwrite a manual match when auto-match finishes later', async () => {
    const searches = [
      createDeferred<{ id: string; name: string; artistName: string }[]>(),
      createDeferred<{ id: string; name: string; artistName: string }[]>(),
      createDeferred<{ id: string; name: string; artistName: string }[]>(),
    ];
    let nextSearch = 0;
    mockSearchCatalog.mockImplementation(() => searches[nextSearch++]!.promise);

    const { result } = renderHook(() => useMatchingSuggestions(mockSetlist));

    await waitFor(() => {
      expect(mockSearchCatalog).toHaveBeenCalledTimes(3);
    });

    const manualTrack = { id: 'manual-1', name: 'Manual Song A', artistName: 'Manual Artist' };
    act(() => {
      result.current.setMatch(0, manualTrack);
    });

    await act(async () => {
      searches.forEach((search) => {
        search.resolve([{ id: 'unused', name: 'Unused', artistName: 'Unused' }]);
      });
    });

    await waitFor(() => {
      expect(result.current.loadingSuggestions).toBe(false);
    });

    expect(result.current.matches[0]?.appleTrack).toEqual(manualTrack);
    expect(result.current.matches[0]?.status).toBe('matched');
  });

  it('shares in-flight duplicate queries within one auto-match run', async () => {
    mockSearchCatalog.mockResolvedValue([{ id: '1', name: 'Song A', artistName: 'Test Artist' }]);

    const { result } = renderHook(() => useMatchingSuggestions(duplicateSetlist));

    await waitFor(() => {
      expect(result.current.loadingSuggestions).toBe(false);
    });

    expect(mockSearchCatalog).toHaveBeenCalledTimes(1);
    expect(result.current.matches[0]?.appleTrack?.id).toBe('1');
    expect(result.current.matches[1]?.appleTrack?.id).toBe('1');
  });

  it('does not mark malformed Apple Music rows as matched', async () => {
    mockSearchCatalog.mockResolvedValue([{ id: '', name: 'Song A', artistName: 'Test Artist' }]);

    const oneSongSetlist: Setlist = {
      id: 'invalid-track-id',
      artist: 'Test Artist',
      sets: [[{ name: 'Song A', artist: 'Test Artist' }]],
    };

    const { result } = renderHook(() => useMatchingSuggestions(oneSongSetlist));

    await waitFor(() => {
      expect(result.current.loadingSuggestions).toBe(false);
    });

    expect(result.current.matches[0]?.appleTrack).toBeNull();
    expect(result.current.matches[0]?.status).toBe('unmatched');
  });
});
