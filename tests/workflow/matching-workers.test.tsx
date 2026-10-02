// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchCatalog } from '@/client/music/catalog';
import type { AppleMusicTrack } from '@/client/music/types';
import type { Setlist } from '@/domain/setlist';
import { useAutoMatch } from '@/workflow/matching/useAutoMatch';

vi.mock('@/client/music/catalog', () => ({ searchCatalog: vi.fn() }));
const search = vi.mocked(searchCatalog);
const track: AppleMusicTrack = { id: 'selected', name: 'Selected' };
function fixture(count: number): Setlist {
  return {
    id: 'fixture',
    artist: 'Artist',
    sets: [Array.from({ length: count }, (_, i) => ({ name: `Song ${i}` }))],
  };
}
function setup(setlist = fixture(10)) {
  return renderHook(() => {
    // An empty initial draft starts idle, so each test drives the runs explicitly.
    const auto = useAutoMatch(setlist, []);
    return {
      matches: auto.matches,
      loading: auto.loadingSuggestions,
      error: auto.suggestionError,
      autoMatchAll: auto.autoMatchAll,
      invalidateAutoMatch: auto.invalidate,
      setMatch: (index: number, appleTrack: AppleMusicTrack | null) =>
        appleTrack ? auto.choose(index, appleTrack) : auto.skip(index),
    };
  });
}
function pendingSearches() {
  const requests: { resolve: (tracks: AppleMusicTrack[]) => void; reject: () => void }[] = [];
  search.mockImplementation(
    () =>
      new Promise((resolve, reject) => {
        requests.push({ resolve, reject: () => reject(new Error('Catalog unavailable')) });
      })
  );
  return requests;
}
afterEach(() => {
  vi.resetAllMocks();
  vi.useRealTimers();
});

describe('replenishing catalog workers', () => {
  it('starts five requests, immediately replenishes a free slot and applies out-of-order results in setlist order', async () => {
    const requests = pendingSearches();
    const { result } = setup();
    act(() => {
      void result.current.autoMatchAll();
    });
    expect(requests).toHaveLength(5);
    await act(async () => {
      requests[3]!.resolve([track]);
    });
    expect(requests).toHaveLength(6);
    expect(result.current.matches[3]!.appleTrack).toEqual(track);
    expect(result.current.matches[0]!.status).toBe('pending');
    expect(result.current.matches.map((row) => row.setlistEntry.name)).toEqual(
      Array.from({ length: 10 }, (_, i) => `Song ${i}`)
    );
    act(() => result.current.invalidateAutoMatch());
    await act(async () => {
      requests.forEach((request) => request.resolve([]));
    });
    expect(requests).toHaveLength(6);
  });

  it('deduplicates catalog queries while preserving repeated song rows', async () => {
    const requests = pendingSearches();
    const { result } = setup({
      id: 'fixture',
      artist: 'Artist',
      sets: [[{ name: 'Repeat' }, { name: 'Repeat' }]],
    });
    let run!: Promise<void>;
    act(() => {
      run = result.current.autoMatchAll();
    });
    expect(requests).toHaveLength(1);
    await act(async () => {
      requests[0]!.resolve([track]);
      await run;
    });
    expect(result.current.matches).toHaveLength(2);
    expect(result.current.matches.every((row) => row.appleTrack?.id === track.id)).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it('preserves manual choices and skips made before automatic results arrive', async () => {
    const requests = pendingSearches();
    const { result } = setup(fixture(2));
    let run!: Promise<void>;
    act(() => {
      run = result.current.autoMatchAll();
    });
    act(() => {
      result.current.setMatch(0, track);
      result.current.setMatch(1, null);
    });
    await act(async () => {
      requests.forEach((request) => request.resolve([{ id: 'automatic', name: 'Automatic' }]));
      await run;
    });
    expect(result.current.matches.map((row) => [row.status, row.appleTrack?.id])).toEqual([
      ['matched', 'selected'],
      ['skipped', undefined],
    ]);
  });

  it('continues after rejection and prevents invalidated workers from publishing or scheduling more work', async () => {
    const requests = pendingSearches();
    const { result } = setup();
    let run!: Promise<void>;
    act(() => {
      run = result.current.autoMatchAll();
    });
    await act(async () => {
      requests[1]!.reject();
    });
    expect(requests).toHaveLength(6);
    expect(result.current.error).toBe(true);
    expect(result.current.matches[1]!.status).toBe('unmatched');
    act(() => result.current.invalidateAutoMatch());
    const rows = result.current.matches;
    await act(async () => {
      requests.forEach((request) => request.resolve([track]));
      await run;
    });
    expect(requests).toHaveLength(6);
    expect(result.current.matches).toBe(rows);
  });

  it('stops scheduling when the matching stage unmounts', async () => {
    const requests = pendingSearches();
    const { result, unmount } = setup();
    let run!: Promise<void>;
    act(() => {
      run = result.current.autoMatchAll();
    });
    unmount();
    await act(async () => {
      requests.forEach((request) => request.resolve([track]));
      await run;
    });
    expect(requests).toHaveLength(5);
  });

  it.each([20, 50, 100])(
    'bounds concurrency and measures %i variable-latency songs',
    async (count) => {
      vi.useFakeTimers();
      let active = 0;
      let peak = 0;
      const latencies = Array.from({ length: count }, (_, i) => (i % 5 === 0 ? 100 : 10));
      search.mockImplementation(() => {
        const latency = latencies[search.mock.calls.length - 1];
        peak = Math.max(peak, ++active);
        return new Promise((resolve) =>
          setTimeout(() => {
            active--;
            resolve([track]);
          }, latency)
        );
      });
      const { result } = setup(fixture(count));
      const start = Date.now();
      let run!: Promise<void>;
      act(() => {
        run = result.current.autoMatchAll();
      });
      await act(async () => {
        await vi.runAllTimersAsync();
        await run;
      });
      const elapsed = Date.now() - start;
      const barrierElapsed = (count / 5) * 100;
      expect(peak).toBe(5);
      expect(active).toBe(0);
      expect(search).toHaveBeenCalledTimes(count);
      expect(result.current.matches.every((row) => row.status === 'matched')).toBe(true);
      expect(elapsed).toBeLessThan(barrierElapsed);
      console.info(`${count} songs: barrier=${barrierElapsed}ms workers=${elapsed}ms peak=${peak}`);
    }
  );
});
