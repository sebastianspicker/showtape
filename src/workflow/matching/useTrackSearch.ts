'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { searchCatalog } from '@/client/music/catalog';
import type { AppleMusicTrack } from '@/client/music/types';
import { rowAt, searchQueryFor, type MatchRow, type TrackSearchState } from './model';

export interface UseTrackSearchParams {
  matches: MatchRow[];
  onChoose: (index: number, track: AppleMusicTrack) => void;
  onSkip: (index: number) => void;
}

export interface TrackSearch {
  searchContext: TrackSearchState;
  setSearchQuery: (query: string) => void;
  openSearch: (index: number) => void;
  runSearch: (index: number) => Promise<void>;
  chooseTrack: (index: number, track: AppleMusicTrack) => void;
  skipTrack: (index: number) => void;
  closeSearch: () => void;
}

/**
 * Manual catalog search for one row at a time. Callbacks stay referentially stable and read the
 * latest rows, query, and handlers, so unchanged memoized rows do not re-render.
 */
export function useTrackSearch({ matches, onChoose, onSkip }: UseTrackSearchParams): TrackSearch {
  const [searchingIndex, setSearchingIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AppleMusicTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const searchRunIdRef = useRef(0);
  const currentRef = useRef({ matches, searchQuery, searchingIndex, onChoose, onSkip });
  useLayoutEffect(() => {
    currentRef.current = { matches, searchQuery, searchingIndex, onChoose, onSkip };
  }, [matches, searchQuery, searchingIndex, onChoose, onSkip]);

  const invalidateCurrentSearch = useCallback(() => {
    searchRunIdRef.current += 1;
    setSearching(false);
  }, []);

  const closeSearch = useCallback(() => {
    invalidateCurrentSearch();
    setSearchingIndex(null);
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(false);
    setHasSearched(false);
  }, [invalidateCurrentSearch]);

  const openSearch = useCallback(
    (index: number) => {
      const row = rowAt(currentRef.current.matches, index);
      if (!row) return;
      invalidateCurrentSearch();
      setSearchingIndex(index);
      setSearchQuery(searchQueryFor(row, ''));
      setSearchResults([]);
      setSearchError(false);
      setHasSearched(false);
    },
    [invalidateCurrentSearch]
  );

  const runSearch = useCallback(async (index: number) => {
    const row = rowAt(currentRef.current.matches, index);
    if (!row) return;
    const query = searchQueryFor(row, currentRef.current.searchQuery);
    if (!query) return;
    const runId = searchRunIdRef.current + 1;
    searchRunIdRef.current = runId;
    setSearching(true);
    setSearchError(false);
    try {
      const tracks = await searchCatalog(query, 8);
      if (searchRunIdRef.current !== runId) return;
      setSearchResults(tracks);
      setHasSearched(true);
    } catch {
      if (searchRunIdRef.current !== runId) return;
      setSearchResults([]);
      setSearchError(true);
      setHasSearched(true);
    } finally {
      if (searchRunIdRef.current === runId) setSearching(false);
    }
  }, []);

  const chooseTrack = useCallback(
    (index: number, track: AppleMusicTrack) => {
      if (!rowAt(currentRef.current.matches, index)) return;
      closeSearch();
      currentRef.current.onChoose(index, track);
    },
    [closeSearch]
  );

  const skipTrack = useCallback(
    (index: number) => {
      if (!rowAt(currentRef.current.matches, index)) return;
      currentRef.current.onSkip(index);
      if (currentRef.current.searchingIndex === index) closeSearch();
    },
    [closeSearch]
  );

  return {
    searchContext: {
      searchingIndex,
      searchQuery,
      searchResults,
      searching,
      searchError,
      hasSearched,
    },
    setSearchQuery,
    openSearch,
    runSearch,
    chooseTrack,
    skipTrack,
    closeSearch,
  };
}
