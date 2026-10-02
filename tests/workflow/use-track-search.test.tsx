// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchCatalog } from '@/client/music/catalog';
import type { AppleMusicTrack } from '@/client/music/types';
import type { MatchRow } from '@/workflow/matching/model';
import { useTrackSearch } from '@/workflow/matching/useTrackSearch';

vi.mock('@/client/music/catalog', () => ({ searchCatalog: vi.fn() }));

const searchCatalogMock = vi.mocked(searchCatalog);

function deferred<T>() {
  let resolve: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve: resolve! };
}

const matches: MatchRow[] = [
  { setlistEntry: { name: 'Song', artist: 'Artist' }, appleTrack: null, status: 'unmatched' },
];
const firstTrack: AppleMusicTrack = { id: 'first', name: 'First' };
const secondTrack: AppleMusicTrack = { id: 'second', name: 'Second' };

afterEach(() => vi.clearAllMocks());

describe('useTrackSearch', () => {
  it('does not let a stale search completion update a newly opened search', async () => {
    const first = deferred<AppleMusicTrack[]>();
    const second = deferred<AppleMusicTrack[]>();
    searchCatalogMock
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const { result } = renderHook(() =>
      useTrackSearch({ matches, onChoose: vi.fn(), onSkip: vi.fn() })
    );

    let firstRun!: Promise<void>;
    let secondRun!: Promise<void>;
    act(() => {
      result.current.openSearch(0);
      firstRun = result.current.runSearch(0);
      result.current.closeSearch();
      result.current.openSearch(0);
      secondRun = result.current.runSearch(0);
    });
    await act(async () => {
      second.resolve([secondTrack]);
      await secondRun;
    });
    expect(result.current.searchContext).toMatchObject({
      searchingIndex: 0,
      searchResults: [secondTrack],
      hasSearched: true,
      searching: false,
    });

    await act(async () => {
      first.resolve([firstTrack]);
      await firstRun;
    });
    expect(result.current.searchContext).toMatchObject({
      searchingIndex: 0,
      searchResults: [secondTrack],
      hasSearched: true,
      searching: false,
      searchError: false,
    });
  });

  it('closes the panel and reports a chosen track for an existing row only', () => {
    const onChoose = vi.fn();
    const { result } = renderHook(() => useTrackSearch({ matches, onChoose, onSkip: vi.fn() }));

    act(() => result.current.openSearch(0));
    act(() => result.current.chooseTrack(5, firstTrack));
    expect(onChoose).not.toHaveBeenCalled();
    expect(result.current.searchContext.searchingIndex).toBe(0);

    act(() => result.current.chooseTrack(0, firstTrack));
    expect(onChoose).toHaveBeenCalledWith(0, firstTrack);
    expect(result.current.searchContext.searchingIndex).toBe(null);
  });
});
