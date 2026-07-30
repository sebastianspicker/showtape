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
import type { TrackSearchContext } from './useTrackSearch';

export interface MatchingViewProps {
  setlist: Setlist;
  onProceedToCreatePlaylist: (matches: MatchRow[]) => void;
  initialDraft?: MatchRow[] | null;
  onMatchesChange?: (matches: MatchRow[]) => void;
}

interface MatchingLedgerProps {
  matches: MatchRow[];
  loadingSuggestions: boolean;
  suggestionError: unknown;
  matchedCount: number;
  settledCount: number;
  isSettled: boolean;
  searchContext: TrackSearchContext;
  onOpenSearch: (index: number) => void;
  onSkip: (index: number) => void;
  onSearchQueryChange: (value: string) => void;
  onSearch: (index: number) => void;
  onChoose: (index: number, track: NonNullable<MatchRow['appleTrack']>) => void;
  onCancelSearch: () => void;
}

const MatchingLedger = ({
  matches,
  loadingSuggestions,
  suggestionError,
  matchedCount,
  settledCount,
  isSettled,
  searchContext,
  onOpenSearch,
  onSkip,
  onSearchQueryChange,
  onSearch,
  onChoose,
  onCancelSearch,
}: MatchingLedgerProps) => (
  <div className="matching-ledger">
    <h2 className="sr-only">Matching ledger</h2>
    <p className="muted-block">
      Review each Apple Music suggestion. Change unusual versions, or skip songs you do not want in
      the playlist.
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
        Some songs could not be matched automatically. Use the <strong>Search</strong> button next
        to unmatched songs to find them manually.
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
          onOpenSearch={onOpenSearch}
          onSkip={onSkip}
          onSearchQueryChange={onSearchQueryChange}
          onSearch={onSearch}
          onChoose={onChoose}
          onCancelSearch={onCancelSearch}
        />
      ))}
    </ul>
  </div>
);

interface MatchingSummaryProps {
  matches: MatchRow[];
  loadingSuggestions: boolean;
  matchedCount: number;
  isSettled: boolean;
  canProceed: boolean;
  onAutoMatchAll: () => Promise<void>;
  onSkipUnmatched: () => void;
  onProceed: () => void;
}

const MatchingSummary = ({
  matches,
  loadingSuggestions,
  matchedCount,
  isSettled,
  canProceed,
  onAutoMatchAll,
  onSkipUnmatched,
  onProceed,
}: MatchingSummaryProps) => (
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
        void onAutoMatchAll();
      }}
      onSkipUnmatched={onSkipUnmatched}
    />

    <p className="matching-summary-note">
      {isSettled
        ? 'Every row is settled. Review the selected songs before creating the playlist.'
        : 'Apple Music matching is still in progress. You can review results as they arrive.'}
    </p>

    <div className="matching-proceed">
      <Button
        onClick={onProceed}
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
);

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
        onProceed={() => onProceedToCreatePlaylist(matches)}
      />
    </section>
  );
}
