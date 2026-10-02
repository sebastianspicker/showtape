'use client';

import React from 'react';
import type { AppleMusicTrack } from '@/client/music/types';
import type { MatchRow, TrackSearchState } from './model';
import { TrackSearchPanel } from './TrackSearchPanel';

export interface CatalogMatchRowProps {
  row: MatchRow;
  index: number;
  isSearching: boolean;
  searchContext: TrackSearchState | null;
  onOpenSearch: (index: number) => void;
  onSkip: (index: number) => void;
  onSearchQueryChange: (value: string) => void;
  onSearch: (index: number) => Promise<void>;
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

function TrackMetadata({ row, index }: Pick<CatalogMatchRowProps, 'row' | 'index'>) {
  return (
    <div className="matching-track-meta">
      <span className="matching-row-number">{String(index + 1).padStart(2, '0')}</span>
      <strong>{trackNameOrFallback(row.setlistEntry.name, 'Untitled track')}</strong>
      {row.setlistEntry.artist && (
        <span className="muted-inline"> · {row.setlistEntry.artist}</span>
      )}
    </div>
  );
}

function AppleTrackArtist({ artistName }: { artistName?: string }) {
  return artistName ? <span className="match-result-artist">{artistName}</span> : null;
}

function TrackResultStatus({ status }: Pick<MatchRow, 'status'>) {
  if (status === 'skipped') {
    return (
      <span className="match-skipped">
        <span className="match-result-primary">No match selected</span>
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className="match-pending">
        <span className="match-result-primary">Searching</span>
      </span>
    );
  }
  return (
    <span className="match-missing">
      <span className="match-result-primary">No suggestion</span>
    </span>
  );
}

function TrackResult({ row }: Pick<CatalogMatchRowProps, 'row'>) {
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
  return <TrackResultStatus status={row.status} />;
}

function StatusChip({ row }: Pick<CatalogMatchRowProps, 'row'>) {
  if (row.appleTrack)
    return (
      <span className="match-found">
        <span className="match-status">Selected</span>
      </span>
    );
  if (row.status === 'skipped')
    return (
      <span className="match-skipped">
        <span className="match-status">Skipped</span>
      </span>
    );
  if (row.status === 'pending')
    return (
      <span className="match-pending">
        <span className="match-status">Searching</span>
      </span>
    );
  return (
    <span className="match-missing">
      <span className="match-status">Needs a choice</span>
    </span>
  );
}

function RowActions({
  row,
  index,
  changeButtonRef,
  onOpenSearch,
  onSkip,
}: Pick<CatalogMatchRowProps, 'row' | 'index' | 'onOpenSearch' | 'onSkip'> & {
  changeButtonRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <div className="matching-row-actions">
      <StatusChip row={row} />
      <button
        ref={changeButtonRef}
        type="button"
        onClick={() => {
          onOpenSearch(index);
        }}
        aria-label={`Change match for ${trackNameOrFallback(row.setlistEntry.name, 'track')}`}
        className="button button--quiet button--compact"
        disabled={row.status === 'pending'}
      >
        {row.appleTrack ? 'Change' : 'Search'}
      </button>
      {row.status !== 'skipped' && (
        <button
          type="button"
          onClick={() => {
            onSkip(index);
          }}
          aria-label={`Skip ${trackNameOrFallback(row.setlistEntry.name, 'track')}`}
          className="button button--quiet button--compact"
          disabled={row.status === 'pending'}
        >
          Skip
        </button>
      )}
    </div>
  );
}

function CatalogMatchRowComponent(props: CatalogMatchRowProps) {
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
  const [expanded, setExpanded] = React.useState(false);
  const detailsId = React.useId();
  const restoreFocus = (action: () => void) => {
    action();
    window.requestAnimationFrame(() => changeButtonRef.current?.focus());
  };
  return (
    <li
      className={`matching-row ${STATUS_CLASS[row.status]}${expanded ? ' matching-row--expanded' : ''}`}
    >
      <div className="matching-row-main">
        <TrackMetadata row={row} index={index} />
        {row.appleTrack ? (
          <button
            type="button"
            className="matching-row-toggle"
            aria-label={`Review recording for ${trackNameOrFallback(row.setlistEntry.name, 'track')}`}
            aria-expanded={expanded}
            aria-controls={detailsId}
            onClick={() => setExpanded((value) => !value)}
          >
            Selected <span aria-hidden="true">{expanded ? '−' : '+'}</span>
          </button>
        ) : null}
        <div className="matching-track-result" id={detailsId}>
          <TrackResult row={row} />
        </div>
        <RowActions
          row={row}
          index={index}
          changeButtonRef={changeButtonRef}
          onOpenSearch={(rowIndex) => {
            setExpanded(true);
            onOpenSearch(rowIndex);
          }}
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
            void onSearch(index);
          }}
          onChoose={(track) => {
            setExpanded(true);
            restoreFocus(() => {
              onChoose(index, track);
            });
          }}
          onCancel={() => {
            setExpanded(true);
            restoreFocus(onCancelSearch);
          }}
        />
      )}
    </li>
  );
}

export const CatalogMatchRow = React.memo(CatalogMatchRowComponent);
