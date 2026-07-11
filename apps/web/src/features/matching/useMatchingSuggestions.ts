'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildSearchQuery, flattenSetlistToEntries, getSetlistSignature } from '@repo/core';
import type { Setlist } from '@repo/core';
import type { AppleMusicTrack } from '@/lib/musickit';
import { isValidAppleMusicTrack, searchCatalog } from '@/lib/musickit';
import type { MatchRow } from './types';

export interface UseMatchingSuggestionsResult {
  matches: MatchRow[];
  loadingSuggestions: boolean;
  suggestionError: boolean;
  setMatch: (index: number, appleTrack: AppleMusicTrack | null) => void;
  resetMatches: () => void;
  autoMatchAll: () => Promise<void>;
  skipUnmatched: () => void;
}

function toInitialMatches(setlist: Setlist): MatchRow[] {
  return toUnmatchedRows(flattenSetlistToEntries(setlist));
}

function toUnmatchedRows(entries: MatchRow['setlistEntry'][]): MatchRow[] {
  return entries.map((setlistEntry) => ({
    setlistEntry,
    appleTrack: null,
    status: 'unmatched',
  }));
}

export function useMatchingSuggestions(setlist: Setlist): UseMatchingSuggestionsResult {
  const [matches, setMatches] = useState<MatchRow[]>(() => toInitialMatches(setlist));
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [suggestionError, setSuggestionError] = useState(false);
  // Every auto-match run gets its own ID so late batches from older runs cannot update rows.
  const runIdRef = useRef(0);
  const runIdCounter = useRef(0);
  const scheduledSignatureRef = useRef<string | null>(null);

  const signature = useMemo(() => getSetlistSignature(setlist), [setlist]);

  const autoMatchAll = useCallback(async () => {
    const localRunId = ++runIdCounter.current;
    runIdRef.current = localRunId;
    const entriesFlat = flattenSetlistToEntries(setlist);
    if (entriesFlat.length === 0) {
      setMatches([]);
      setLoadingSuggestions(false);
      return;
    }

    // Duplicate songs can produce the same Apple query. Share only within one run so each new
    // setlist still starts from fresh catalog data while avoiding duplicate concurrent calls.
    const searchPromises = new Map<string, Promise<AppleMusicTrack | null>>();

    setSuggestionError(false);
    setLoadingSuggestions(true);
    setMatches(toUnmatchedRows(entriesFlat));
    const BATCH_SIZE = 5;
    for (let batchStart = 0; batchStart < entriesFlat.length; batchStart += BATCH_SIZE) {
      if (runIdRef.current !== localRunId) return;
      const batchEnd = Math.min(batchStart + BATCH_SIZE, entriesFlat.length);
      const batchIndices = Array.from({ length: batchEnd - batchStart }, (_, k) => batchStart + k);

      const results = await Promise.allSettled(
        batchIndices.map((i) => {
          const entry = entriesFlat[i]!;
          const query = buildSearchQuery(entry.name, entry.artist);
          if (!query) return Promise.resolve(null);
          const existingPromise = searchPromises.get(query);
          if (existingPromise) return existingPromise;
          const searchPromise = searchCatalog(query, 1).then(
            (tracks) => tracks.find(isValidAppleMusicTrack) ?? null
          );
          searchPromises.set(query, searchPromise);
          return searchPromise;
        })
      );

      if (runIdRef.current !== localRunId) return;

      setMatches((prev) => {
        const next = [...prev];
        for (let k = 0; k < batchIndices.length; k++) {
          const i = batchIndices[k]!;
          const result = results[k];
          if (result?.status === 'fulfilled') {
            const track = result.value;
            const existing = next[i];
            // A user may manually choose a track while the batch is pending; never overwrite that.
            if (existing?.status === 'unmatched' && existing.appleTrack === null) {
              next[i] = {
                ...existing,
                appleTrack: track,
                status: track ? 'matched' : 'unmatched',
              };
            }
          }
        }
        return next;
      });

      const hasRejection = results.some((r) => r.status === 'rejected');
      if (hasRejection) {
        setSuggestionError(true);
      }
    }
    if (runIdRef.current === localRunId) setLoadingSuggestions(false);
  }, [setlist]);

  useEffect(() => {
    if (scheduledSignatureRef.current === signature) {
      return;
    }
    scheduledSignatureRef.current = signature;

    const timeoutId = window.setTimeout(() => {
      void autoMatchAll();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [signature, autoMatchAll]);

  const setMatch = useCallback((index: number, appleTrack: AppleMusicTrack | null) => {
    setMatches((prev) => {
      const existing = prev[index];
      if (!existing) return prev;
      const validTrack = isValidAppleMusicTrack(appleTrack) ? appleTrack : null;
      const next = [...prev];
      next[index] = {
        ...existing,
        appleTrack: validTrack,
        status: validTrack ? 'matched' : 'skipped',
      };
      return next;
    });
  }, []);

  const resetMatches = useCallback(() => {
    runIdRef.current = ++runIdCounter.current;
    setMatches(toInitialMatches(setlist));
    setSuggestionError(false);
    setLoadingSuggestions(false);
  }, [setlist]);

  const skipUnmatched = useCallback(() => {
    setMatches((prev) =>
      prev.map((row) => (row.appleTrack ? row : { ...row, appleTrack: null, status: 'skipped' }))
    );
  }, []);

  return {
    matches,
    loadingSuggestions,
    suggestionError,
    setMatch,
    resetMatches,
    autoMatchAll,
    skipUnmatched,
  };
}
