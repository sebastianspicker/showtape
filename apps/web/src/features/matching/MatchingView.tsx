'use client';

import { useEffect } from 'react';
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
      <div className="matching-ledger">
        <h2 className="sr-only">Matching ledger</h2>
        <p className="muted-block">
          Review each Apple Music suggestion. Change unusual versions, or skip songs you do not want
          in the playlist.
        </p>

        <StatusText className="matching-progress">
          {isSettled ? (
            <>
              <strong>
                {matchedCount} of {matches.length}
              </strong>{' '}
              songs matched
            </>
          ) : (
            <>
              Searching Apple Music:{' '}
              <strong>
                {settledCount} of {matches.length}
              </strong>{' '}
              songs checked
            </>
          )}
        </StatusText>

        {suggestionError && !loadingSuggestions ? (
          <p role="alert" className="warning-banner">
            Some songs could not be matched automatically. Use the <strong>Search</strong> button
            next to unmatched songs to find them manually.
          </p>
        ) : null}

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
      </div>

      <aside className="matching-summary-panel" aria-label="Matching summary">
        <p className="summary-eyebrow">Songs ready</p>
        <p className="summary-metric" aria-label={`${matchedCount} of ${matches.length} selected`}>
          <strong>{matchedCount}</strong>
          <span>/{matches.length}</span>
        </p>
        <p className="summary-caption">matched and selected</p>

        <MatchingBulkActions
          loading={loadingSuggestions}
          onAutoMatchAll={() => {
            void autoMatchAll();
          }}
          onSkipUnmatched={skipUnmatched}
        />

        <p className="matching-summary-note">
          {isSettled
            ? 'Every row is settled. Review the selected songs before creating the playlist.'
            : 'Apple Music matching is still in progress. You can review results as they arrive.'}
        </p>

        <div className="matching-proceed">
          <Button
            onClick={() => {
              onProceedToCreatePlaylist(matches);
            }}
            disabled={!canProceed}
            title="Review the selected songs before creating the Apple Music playlist"
            className="proceed-button"
          >
            Review playlist
          </Button>
          {!canProceed && isSettled ? (
            <p className="support-text matching-help">Match at least one song to continue.</p>
          ) : null}
        </div>
      </aside>
    </section>
  );
}
