// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchCatalog } from '@/client/music/catalog';
import type { AppleMusicTrack } from '@/client/music/types';
import type { Setlist } from '@/domain/setlist';
import { useAutoMatch } from '@/workflow/matching/useAutoMatch';

vi.mock('@/client/music/catalog', () => ({ searchCatalog: vi.fn() }));

const searchCatalogMock = vi.mocked(searchCatalog);

function deferred<T>() {
  let resolve: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve: resolve! };
}

const setlist: Setlist = { id: '1a2b3c4d', artist: 'Artist', sets: [[{ name: 'Song' }]] };
const firstTrack: AppleMusicTrack = { id: 'first', name: 'First' };
const secondTrack: AppleMusicTrack = { id: 'second', name: 'Second' };

afterEach(() => vi.clearAllMocks());

describe('useAutoMatch', () => {
  it('ignores a stale automatic-match completion after a newer run finishes', async () => {
    const first = deferred<AppleMusicTrack[]>();
    const second = deferred<AppleMusicTrack[]>();
    searchCatalogMock
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    // An empty initial draft starts idle, so the test drives both runs explicitly.
    const { result } = renderHook(() => useAutoMatch(setlist, []));

    let firstRun!: Promise<void>;
    let secondRun!: Promise<void>;
    act(() => {
      firstRun = result.current.autoMatchAll();
      secondRun = result.current.autoMatchAll();
    });
    await act(async () => {
      second.resolve([secondTrack]);
      await secondRun;
    });
    expect(result.current.matches).toMatchObject([{ appleTrack: secondTrack, status: 'matched' }]);

    await act(async () => {
      first.resolve([firstTrack]);
      await firstRun;
    });
    expect(result.current.matches).toMatchObject([{ appleTrack: secondTrack, status: 'matched' }]);
    expect(result.current.loadingSuggestions).toBe(false);
    expect(result.current.suggestionError).toBe(false);
  });
});
