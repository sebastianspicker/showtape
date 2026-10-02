'use client';

import { useEffect } from 'react';
import type { Setlist } from '@/domain/setlist';
import { isValidAppleMusicTrack } from '@/client/music/types';
import { MatchingLedger } from './MatchingLedger';
import { MatchingSummary } from './MatchingSummary';
import type { MatchRow } from './model';
import { useAutoMatch } from './useAutoMatch';
import { useTrackSearch } from './useTrackSearch';

export interface MatchingWorkflowProps {
  setlist: Setlist;
  onProceedToCreatePlaylist: (matches: MatchRow[]) => void;
  initialDraft?: MatchRow[] | null;
  onMatchesChange?: (matches: MatchRow[]) => void;
}

export function MatchingWorkflow({
  setlist,
  onProceedToCreatePlaylist,
  initialDraft,
  onMatchesChange,
}: MatchingWorkflowProps) {
  const {
    matches,
    loadingSuggestions,
    suggestionError,
    autoMatchAll,
    choose,
    skip,
    skipUnmatched,
  } = useAutoMatch(setlist, initialDraft);
  const {
    searchContext,
    setSearchQuery,
    openSearch,
    runSearch,
    chooseTrack,
    skipTrack,
    closeSearch,
  } = useTrackSearch({ matches, onChoose: choose, onSkip: skip });
  const matchedCount = matches.filter((match) => isValidAppleMusicTrack(match.appleTrack)).length;
  const settledCount = matches.filter((match) => match.status !== 'pending').length;
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
