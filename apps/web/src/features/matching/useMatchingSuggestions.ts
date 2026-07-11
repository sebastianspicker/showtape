'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildSearchQuery, flattenSetlistToEntries, getSetlistSignature } from '@repo/core';
import type { Setlist } from '@repo/core';
import { isValidAppleMusicTrack, searchCatalog } from '@/lib/musickit';
import type { MatchRow } from './types';

function toInitialMatches(setlist: Setlist): MatchRow[] {
  return toPendingRows(flattenSetlistToEntries(setlist));
}

function toPendingRows(entries: MatchRow['setlistEntry'][]): MatchRow[] {
  return entries.map((setlistEntry) => ({
    setlistEntry,
    appleTrack: null,
    status: 'pending',
  }));
}

function findBestCatalogMatch(query: string) {
  return searchCatalog(query, 1).then((tracks) => tracks.find(isValidAppleMusicTrack) ?? null);
}

export function useMatchingSuggestions(setlist: Setlist, initialDraft?: MatchRow[] | null) {
  const [restoredDraft] = useState<MatchRow[] | null>(() => initialDraft ?? null);
  const hasInitialDraft = restoredDraft !== null;
  const [matches, setMatches] = useState<MatchRow[]>(
    () => restoredDraft ?? toInitialMatches(setlist)
  );
  const [loadingSuggestions, setLoadingSuggestions] = useState(!hasInitialDraft);
  const [suggestionError, setSuggestionError] = useState(false);
  // Every auto-match run gets its own ID so late batches from older runs cannot update rows.
  const runIdRef = useRef(0);
  const runIdCounter = useRef(0);
  const scheduledSignatureRef = useRef<string | null>(null);
  const invalidateAutoMatch = useCallback(() => {
    const nextRunId = runIdCounter.current + 1;
    runIdCounter.current = nextRunId;
    runIdRef.current = nextRunId;
  }, []);

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
    const searchPromises = new Map<string, ReturnType<typeof findBestCatalogMatch>>();

    setSuggestionError(false);
    setLoadingSuggestions(true);
    setMatches(toPendingRows(entriesFlat));
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
          const searchPromise = findBestCatalogMatch(query);
          searchPromises.set(query, searchPromise);
          return searchPromise;
        })
      );

      if (runIdRef.current !== localRunId) return;

      setMatches((prev) => {
        const next = [...prev];
        for (const [k, result] of results.entries()) {
          const i = batchStart + k;
          if (result.status === 'fulfilled') {
            const track = result.value;
            const existing = next.at(i);
            if (!existing) continue;
            // A user may manually choose a track while the batch is pending; never overwrite that.
            if (existing.status === 'pending' && existing.appleTrack === null) {
              next.splice(i, 1, {
                ...existing,
                appleTrack: track,
                status: track ? 'matched' : 'unmatched',
              });
            }
          } else {
            const existing = next.at(i);
            if (existing?.status === 'pending') {
              next.splice(i, 1, { ...existing, appleTrack: null, status: 'unmatched' });
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
    if (hasInitialDraft) return;
    if (scheduledSignatureRef.current === signature) {
      return;
    }
    let started = false;
    const timeoutId = window.setTimeout(() => {
      started = true;
      scheduledSignatureRef.current = signature;
      void autoMatchAll();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      if (!started && scheduledSignatureRef.current === signature) {
        scheduledSignatureRef.current = null;
      }
      invalidateAutoMatch();
    };
  }, [signature, autoMatchAll, hasInitialDraft, invalidateAutoMatch]);

  const setMatch = useCallback((index: number, appleTrack: MatchRow['appleTrack']) => {
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

  const skipUnmatched = useCallback(() => {
    setMatches((prev) =>
      prev.map((row) =>
        row.status === 'unmatched' ? { ...row, appleTrack: null, status: 'skipped' } : row
      )
    );
  }, []);

  return {
    matches,
    loadingSuggestions,
    suggestionError,
    setMatch,
    autoMatchAll,
    skipUnmatched,
  };
}
