'use client';

import { useEffect, type Dispatch } from 'react';
import { Button } from '@repo/ui';
import type { Setlist } from '@repo/core';
import { StatusText } from '@/components/StatusText';
import { isValidAppleMusicTrack } from '@/lib/musickit';
import { MatchRowItem } from './MatchRowItem';
import { MatchingBulkActions } from './MatchingBulkActions';
import type { MatchRow } from './types';
import { useMatchingSuggestions } from './useMatchingSuggestions';
import { useTrackSearch } from './useTrackSearch';

export interface MatchingViewProps {
  setlist: Setlist;
  onProceedToCreatePlaylist: Dispatch<MatchRow[]>;
  initialDraft?: MatchRow[] | null;
  onMatchesChange?: Dispatch<MatchRow[]>;
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
      <p className="muted-block">
        Review each result. Change unusual versions or skip songs you do not want in the playlist.
      </p>

      <MatchingBulkActions
        loading={loadingSuggestions}
        onAutoMatchAll={() => void autoMatchAll()}
        onSkipUnmatched={skipUnmatched}
      />

      <StatusText className="matching-progress">
        {isSettled
          ? `${matchedCount} of ${matches.length} songs matched`
          : `Searching Apple Music: ${settledCount} of ${matches.length} songs checked`}
      </StatusText>

      {suggestionError && !loadingSuggestions && (
        <p role="alert" className="warning-banner">
          Some songs could not be matched automatically. Use the <strong>Search</strong> button next
          to unmatched songs to find them manually.
        </p>
      )}

      <ul className="matching-list">
        {matches.map((row, index) => (
          <MatchRowItem
            key={`${row.setlistEntry.name}-${index}`}
            row={row}
            index={index}
            isSearching={searchContext.searchingIndex === index}
            searchContext={searchContext.searchingIndex === index ? searchContext : null}
            onOpenSearch={openSearch}
            onSkip={skipTrack}
            onSearchQueryChange={setSearchQuery}
            onSearch={runSearch}
            onChoose={chooseTrack}
            onCancelSearch={closeSearch}
          />
        ))}
      </ul>

      <div className="matching-proceed">
        <Button
          onClick={() => onProceedToCreatePlaylist(matches)}
          disabled={!canProceed}
          title="Review the selected songs before creating the Apple Music playlist"
          className="proceed-button"
        >
          Review playlist
        </Button>
        {!canProceed && isSettled && (
          <p className="support-text matching-help">Match at least one song to continue.</p>
        )}
      </div>
    </section>
  );
}
