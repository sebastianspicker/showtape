'use client';

import { useEffect } from 'react';
import type { Setlist } from '@repo/core';
import { isValidAppleMusicTrack } from '@/lib/musickit';
import { MatchingLedger } from './MatchingLedger';
import { MatchingSummary } from './MatchingSummary';
import type { MatchRow } from './types';
import { useMatchingSuggestions } from './useMatchingSuggestions';
import { useTrackSearch } from './useTrackSearch';

export interface MatchingViewProps {
  setlist: Setlist;
  onProceedToCreatePlaylist: (matches: MatchRow[]) => void;
  initialDraft?: MatchRow[] | null;
  onMatchesChange?: (matches: MatchRow[]) => void;
}

export function MatchingView({
  setlist,
  onProceedToCreatePlaylist,
  initialDraft,
  onMatchesChange,
}: MatchingViewProps) {
  const { matches, loadingSuggestions, suggestionError, setMatch, autoMatchAll, skipUnmatched } =
    useMatchingSuggestions(setlist, initialDraft);

  const {
    searchContext,
    setSearchQuery,
    openSearch,
    runSearch,
    chooseTrack,
    skipTrack,
    closeSearch,
  } = useTrackSearch({ matches, setMatch });

  const matchedCount = matches.filter((m) => isValidAppleMusicTrack(m.appleTrack)).length;
  const settledCount = matches.filter((m) => m.status !== 'pending').length;
  const isSettled = settledCount === matches.length && !loadingSuggestions;
  const canProceed = matchedCount > 0 && isSettled;

  useEffect(() => {
    onMatchesChange?.(matches);
  }, [matches, onMatchesChange]);

  return (
    <section aria-label="Match tracks" className="matching-section">
      <MatchingLedger
        matches={matches}
        loadingSuggestions={loadingSuggestions}
        suggestionError={suggestionError}
        matchedCount={matchedCount}
        settledCount={settledCount}
        isSettled={isSettled}
        searchContext={searchContext}
        onOpenSearch={openSearch}
        onSkip={skipTrack}
        onSearchQueryChange={setSearchQuery}
        onSearch={runSearch}
        onChoose={chooseTrack}
        onCancelSearch={closeSearch}
      />
      <MatchingSummary
        matches={matches}
        loadingSuggestions={loadingSuggestions}
        matchedCount={matchedCount}
        isSettled={isSettled}
        canProceed={canProceed}
        onAutoMatchAll={autoMatchAll}
        onSkipUnmatched={skipUnmatched}
        onProceed={() => {
          onProceedToCreatePlaylist(matches);
        }}
      />
    </section>
  );
}
