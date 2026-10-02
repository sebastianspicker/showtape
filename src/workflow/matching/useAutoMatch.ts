'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { buildSearchQuery } from '@/domain/matching';
import { flattenSetlistToEntries, getSetlistSignature, type Setlist } from '@/domain/setlist';
import { searchCatalog } from '@/client/music/catalog';
import { isValidAppleMusicTrack, type AppleMusicTrack } from '@/client/music/types';
import { matchesReducer, toPendingRows, type MatchRow } from './model';

const MAX_CONCURRENT_SEARCHES = 5;

type CatalogMatch = AppleMusicTrack | null;

function findBestCatalogMatch(query: string): Promise<CatalogMatch> {
  return searchCatalog(query, 1).then((tracks) => tracks.find(isValidAppleMusicTrack) ?? null);
}

/** Search once per distinct query within a run; repeated songs share the same request. */
function searchEntry(
  entry: MatchRow['setlistEntry'],
  searches: Map<string, Promise<CatalogMatch>>
): Promise<CatalogMatch> {
  const query = buildSearchQuery(entry.name, entry.artist);
  if (!query) return Promise.resolve(null);
  const existing = searches.get(query);
  if (existing) return existing;
  const search = findBestCatalogMatch(query);
  searches.set(query, search);
  return search;
}

/**
 * Owns the match rows for one setlist and fills them with automatic catalog suggestions using
 * replenishing workers. Starts one run per setlist content unless restored from a draft.
 */
export function useAutoMatch(setlist: Setlist, initialDraft?: MatchRow[] | null) {
  const [restoredDraft] = useState<MatchRow[] | null>(() => initialDraft ?? null);
  // A draft saved while a run was still in flight resumes searching its pending rows.
  const draftIsSettled =
    restoredDraft !== null && restoredDraft.every((row) => row.status !== 'pending');
  const [matches, dispatch] = useReducer(
    matchesReducer,
    null,
    () => restoredDraft ?? toPendingRows(flattenSetlistToEntries(setlist))
  );
  const [loadingSuggestions, setLoadingSuggestions] = useState(!draftIsSettled);
  const [suggestionError, setSuggestionError] = useState(false);
  const runIdRef = useRef(0);
  const runIdCounter = useRef(0);
  const scheduledSignatureRef = useRef<string | null>(null);
  const signature = useMemo(() => getSetlistSignature(setlist), [setlist]);

  const invalidate = useCallback(() => {
    const nextRunId = runIdCounter.current + 1;
    runIdCounter.current = nextRunId;
    runIdRef.current = nextRunId;
  }, []);

  useEffect(() => invalidate, [invalidate]);

  /** Searches the given row indices with replenishing workers; later runs supersede it. */
  const searchRows = useCallback(async (rows: MatchRow[], indices: number[]) => {
    const runId = ++runIdCounter.current;
    runIdRef.current = runId;
    const isCurrent = () => runIdRef.current === runId;
    const searches = new Map<string, Promise<CatalogMatch>>();
    setSuggestionError(false);
    setLoadingSuggestions(true);
    let next = 0;
    const runWorker = async () => {
      while (isCurrent() && next < indices.length) {
        const index = indices[next++] as number;
        const entry = rows[index]?.setlistEntry;
        let track: CatalogMatch = null;
        let failed = false;
        try {
          track = entry ? await searchEntry(entry, searches) : null;
        } catch {
          failed = true;
        }
        if (!isCurrent()) return;
        dispatch({ type: 'autoResult', index, track });
        if (failed) setSuggestionError(true);
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(MAX_CONCURRENT_SEARCHES, indices.length) }, runWorker)
    );
    if (isCurrent()) setLoadingSuggestions(false);
  }, []);

  const autoMatchAll = useCallback(async () => {
    const rows = toPendingRows(flattenSetlistToEntries(setlist));
    dispatch({ type: 'reset', rows });
    if (rows.length === 0) {
      invalidate();
      setLoadingSuggestions(false);
      return;
    }
    await searchRows(
      rows,
      rows.map((_, index) => index)
    );
  }, [invalidate, searchRows, setlist]);

  useEffect(() => {
    if (draftIsSettled || scheduledSignatureRef.current === signature) return;
    let started = false;
    const timeoutId = window.setTimeout(() => {
      started = true;
      scheduledSignatureRef.current = signature;
      if (restoredDraft) {
        const pending = restoredDraft.flatMap((row, index) =>
          row.status === 'pending' ? [index] : []
        );
        void searchRows(restoredDraft, pending);
      } else {
        void autoMatchAll();
      }
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
      if (!started && scheduledSignatureRef.current === signature)
        scheduledSignatureRef.current = null;
      invalidate();
    };
  }, [signature, autoMatchAll, draftIsSettled, invalidate, restoredDraft, searchRows]);

  const choose = useCallback((index: number, track: AppleMusicTrack) => {
    dispatch({ type: 'choose', index, track });
  }, []);
  const skip = useCallback((index: number) => {
    dispatch({ type: 'skip', index });
  }, []);
  const skipUnmatched = useCallback(() => {
    dispatch({ type: 'skipUnmatched' });
  }, []);

  return {
    matches,
    loadingSuggestions,
    suggestionError,
    autoMatchAll,
    invalidate,
    choose,
    skip,
    skipUnmatched,
  };
}
