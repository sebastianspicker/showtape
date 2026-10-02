// @vitest-environment jsdom
import React, { useReducer } from 'react';
import { act, cleanup, render, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { searchCatalog } from '@/client/music/catalog';
import type { AppleMusicTrack } from '@/client/music/types';
import { MatchingRows } from '@/workflow/matching/MatchingLedger';
import { matchesReducer, type MatchRow } from '@/workflow/matching/model';
import { useTrackSearch } from '@/workflow/matching/useTrackSearch';

const { renders } = vi.hoisted(() => ({ renders: vi.fn() }));
vi.mock('@/client/music/catalog', () => ({ searchCatalog: vi.fn() }));
vi.mock('@/workflow/matching/CatalogMatchRow', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/workflow/matching/CatalogMatchRow')>();
  return {
    CatalogMatchRow: React.memo(function MeasuredRow(
      props: React.ComponentProps<typeof original.CatalogMatchRow>
    ) {
      renders(props.index);
      return <original.CatalogMatchRow {...props} />;
    }),
  };
});
function rows(count: number): MatchRow[] {
  return Array.from({ length: count }, (_, i) => ({
    setlistEntry: { name: `Song ${i}`, artist: 'Artist' },
    status: 'unmatched',
    appleTrack: null,
  }));
}
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it.each([20, 50, 100])('renders only the changed row when one of %i rows settles', (count) => {
  let controls!: ReturnType<typeof useTrackSearch>;
  function Harness() {
    const [matches, dispatch] = useReducer(matchesReducer, count, rows);
    controls = useTrackSearch({
      matches,
      onChoose: (index, track) => dispatch({ type: 'choose', index, track }),
      onSkip: (index) => dispatch({ type: 'skip', index }),
    });
    return (
      <MatchingRows
        matches={matches}
        searchContext={controls.searchContext}
        onOpenSearch={controls.openSearch}
        onSkip={controls.skipTrack}
        onSearchQueryChange={controls.setSearchQuery}
        onSearch={controls.runSearch}
        onChoose={controls.chooseTrack}
        onCancelSearch={controls.closeSearch}
      />
    );
  }
  render(<Harness />);
  expect(renders).toHaveBeenCalledTimes(count);
  renders.mockClear();
  act(() => controls.chooseTrack(2, { id: 'new', name: 'New track' }));
  expect(renders.mock.calls).toEqual([[2]]);
  renders.mockClear();
  act(() => controls.openSearch(3));
  expect(renders.mock.calls).toEqual([[3]]);
  renders.mockClear();
  act(() => controls.setSearchQuery('Fresh query'));
  expect(renders.mock.calls).toEqual([[3]]);
});

it('keeps callbacks stable while reading the current rows, query and open search', async () => {
  vi.mocked(searchCatalog).mockResolvedValue([]);
  const setMatch = vi.fn();
  const { result, rerender } = renderHook(
    ({ matches }) =>
      useTrackSearch({
        matches,
        onChoose: (index: number, track: AppleMusicTrack) => setMatch(index, track),
        onSkip: (index: number) => setMatch(index, null),
      }),
    {
      initialProps: { matches: rows(2) },
    }
  );
  const first = result.current;
  rerender({
    matches: [
      {
        appleTrack: null,
        status: 'unmatched',
        setlistEntry: { name: 'Updated title', artist: 'New artist' },
      },
    ],
  });
  act(() => result.current.openSearch(0));
  expect(result.current.searchContext.searchQuery).toContain('Updated title');
  act(() => result.current.setSearchQuery('Custom query'));
  await act(async () => {
    await result.current.runSearch(0);
  });
  expect(searchCatalog).toHaveBeenCalledWith('Custom query', 8);
  act(() => result.current.skipTrack(1));
  expect(setMatch).not.toHaveBeenCalled();
  act(() => result.current.skipTrack(0));
  expect(result.current.searchContext.searchingIndex).toBe(null);
  expect(setMatch).toHaveBeenCalledWith(0, null);
  for (const key of [
    'openSearch',
    'runSearch',
    'chooseTrack',
    'skipTrack',
    'closeSearch',
  ] as const) {
    expect(result.current[key]).toBe(first[key]);
  }
});
