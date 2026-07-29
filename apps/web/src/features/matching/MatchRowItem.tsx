'use client';

import React from 'react';
import type { AppleMusicTrack } from '@/lib/musickit';
import type { MatchRow } from './types';
import { TrackSearchPanel } from './TrackSearchPanel';
import type { TrackSearchContext } from './useTrackSearch';

export interface MatchRowItemProps {
  row: MatchRow;
  index: number;
  isSearching: boolean;
  searchContext: TrackSearchContext | null;
  onOpenSearch: (index: number) => void;
  onSkip: (index: number) => void;
  onSearchQueryChange: (value: string) => void;
  onSearch: (index: number) => void;
  onChoose: (index: number, track: AppleMusicTrack) => void;
  onCancelSearch: () => void;
}

const STATUS_CLASS: Record<MatchRow['status'], string> = {
  matched: 'matching-row--matched',
  skipped: 'matching-row--skipped',
  pending: 'matching-row--pending',
  unmatched: 'matching-row--unmatched',
};

const trackNameOrFallback = (value: unknown, fallback: string): string =>
  typeof value === 'string' ? value : fallback;

const TrackMetadata = ({ row, index }: Pick<MatchRowItemProps, 'row' | 'index'>) => (
  <div className="matching-track-meta">
    <span className="matching-row-number">{String(index + 1).padStart(2, '0')}</span>
    <strong>{trackNameOrFallback(row.setlistEntry.name, 'Untitled track')}</strong>
    {row.setlistEntry.artist && <span className="muted-inline"> · {row.setlistEntry.artist}</span>}
  </div>
);

const AppleTrackArtist = ({ artistName }: { artistName?: string }) =>
  artistName ? <span className="muted-inline"> · {artistName}</span> : null;

/** Catalog match line without status chip (chip lives in row actions). */
const TrackResult = ({ row }: Pick<MatchRowItemProps, 'row'>) => {
  if (row.appleTrack) {
    return (
      <span className="match-found">
        <span className="match-result-primary">
          {row.appleTrack.name}
          <AppleTrackArtist artistName={row.appleTrack.artistName} />
        </span>
      </span>
    );
  }
  if (row.status === 'skipped') {
    return (
      <span className="match-skipped">
        <span className="match-result-primary">No match selected</span>
      </span>
    );
  }
  if (row.status === 'pending') {
    return (
      <span className="match-pending">
        <span className="match-result-primary">Searching</span>
      </span>
    );
  }
  return (
    <span className="match-missing">
      <span className="match-result-primary">No match found</span>
    </span>
  );
};

interface StatusChipProps {
  row: MatchRow;
}

/** Pill/chip status using existing match-status + indicator classes. */
function StatusChip({ row }: StatusChipProps) {
  if (row.appleTrack) {
    return (
      <span className="match-found">
        <span className="match-status">
          <span className="match-indicator" aria-hidden="true">
            &#x2713;
          </span>
          Matched
        </span>
      </span>
    );
  }
  if (row.status === 'skipped') {
    return (
      <span className="match-skipped">
        <span className="match-status">
          <span className="match-indicator match-indicator--skip" aria-hidden="true">
            -
          </span>
          Skipped
        </span>
      </span>
    );
  }
  if (row.status === 'pending') {
    return (
      <span className="match-pending">
        <span className="match-status">
          <span className="match-indicator" aria-hidden="true">
            …
          </span>
          Searching
        </span>
      </span>
    );
  }
  return (
    <span className="match-missing">
      <span className="match-status">
        <span className="match-indicator match-indicator--missing" aria-hidden="true">
          ?
        </span>
        Unmatched
      </span>
    </span>
  );
}

interface RowActionsProps {
  row: MatchRow;
  index: number;
  changeButtonRef: React.RefObject<HTMLButtonElement | null>;
  onOpenSearch: (index: number) => void;
  onSkip: (index: number) => void;
}

const RowActions = ({ row, index, changeButtonRef, onOpenSearch, onSkip }: RowActionsProps) => (
  <div className="matching-row-actions">
    <StatusChip row={row} />
    <button
      ref={changeButtonRef}
      type="button"
      onClick={() => onOpenSearch(index)}
      aria-label={`Change match for ${trackNameOrFallback(row.setlistEntry.name, 'track')}`}
      className="button button--quiet button--compact"
      disabled={row.status === 'pending'}
    >
      {row.appleTrack ? 'Change' : 'Search'}
    </button>
    {row.status !== 'skipped' && (
      <button
        type="button"
        onClick={() => onSkip(index)}
        aria-label={`Skip ${trackNameOrFallback(row.setlistEntry.name, 'track')}`}
        className="button button--quiet button--compact"
        disabled={row.status === 'pending'}
      >
        Skip
      </button>
    )}
  </div>
);

const MatchRowItemComponent = (props: MatchRowItemProps) => {
  const {
    row,
    index,
    isSearching,
    searchContext,
    onOpenSearch,
    onSkip,
    onSearchQueryChange,
    onSearch,
    onChoose,
    onCancelSearch,
  } = props;
  const changeButtonRef = React.useRef<HTMLButtonElement>(null);

  function restoreFocus(action: () => void) {
    action();
    window.requestAnimationFrame(() => changeButtonRef.current?.focus());
  }

  return (
    <li className={`matching-row ${STATUS_CLASS[row.status]}`}>
      <div className="matching-row-main">
        <TrackMetadata row={row} index={index} />
        <div className="matching-track-result">
          <TrackResult row={row} />
        </div>
        <RowActions
          row={row}
          index={index}
          changeButtonRef={changeButtonRef}
          onOpenSearch={onOpenSearch}
          onSkip={onSkip}
        />
      </div>

      {isSearching && searchContext && (
        <TrackSearchPanel
          index={index}
          searchQuery={searchContext.searchQuery}
          searching={searchContext.searching}
          searchError={searchContext.searchError}
          searchResults={searchContext.searchResults}
          hasSearched={searchContext.hasSearched}
          onSearchQueryChange={onSearchQueryChange}
          onSearch={() => {
            onSearch(index);
          }}
          onChoose={(track) => {
            restoreFocus(() => {
              onChoose(index, track);
            });
          }}
          onCancel={() => {
            restoreFocus(onCancelSearch);
          }}
        />
      )}
    </li>
  );
};

export const MatchRowItem = React.memo(MatchRowItemComponent);
