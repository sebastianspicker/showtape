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

export const MatchRowItem = React.memo(function MatchRowItem({
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
}: MatchRowItemProps) {
  const changeButtonRef = React.useRef<HTMLButtonElement>(null);
  const statusClass =
    row.status === 'matched'
      ? 'matching-row--matched'
      : row.status === 'skipped'
        ? 'matching-row--skipped'
        : row.status === 'pending'
          ? 'matching-row--pending'
          : 'matching-row--unmatched';

  function restoreFocus(action: () => void) {
    action();
    window.requestAnimationFrame(() => changeButtonRef.current?.focus());
  }

  return (
    <li className={`matching-row ${statusClass}`}>
      <div className="matching-row-main">
        <div className="matching-track-meta">
          <span className="matching-row-number">{index + 1}</span>
          <strong>{row.setlistEntry?.name ?? '—'}</strong>
          {row.setlistEntry?.artist && (
            <span className="muted-inline"> — {row.setlistEntry.artist}</span>
          )}
        </div>
        <div className="matching-track-result">
          {row.appleTrack ? (
            <span className="match-found">
              <span className="match-indicator" aria-hidden="true">
                &#x2713;
              </span>
              {row.appleTrack.name}
              {row.appleTrack.artistName && (
                <span className="muted-inline"> · {row.appleTrack.artistName}</span>
              )}
            </span>
          ) : row.status === 'skipped' ? (
            <span className="match-skipped">
              <span className="match-indicator match-indicator--skip" aria-hidden="true">
                &#x2014;
              </span>
              Skipped
            </span>
          ) : row.status === 'pending' ? (
            <span className="match-pending">
              <span className="match-indicator" aria-hidden="true">
                …
              </span>
              Searching
            </span>
          ) : (
            <span className="match-missing">
              <span className="match-indicator match-indicator--missing" aria-hidden="true">
                ?
              </span>
              No match found
            </span>
          )}
        </div>
        <div className="matching-row-actions">
          <button
            ref={changeButtonRef}
            type="button"
            onClick={() => onOpenSearch(index)}
            aria-label={`Change match for ${row.setlistEntry?.name ?? 'track'}`}
            className="button button--secondary button--compact"
            disabled={row.status === 'pending'}
          >
            {row.appleTrack ? 'Change' : 'Search'}
          </button>
          {row.status !== 'skipped' && (
            <button
              type="button"
              onClick={() => onSkip(index)}
              aria-label={`Skip ${row.setlistEntry?.name ?? 'track'}`}
              className="button button--quiet button--compact"
              disabled={row.status === 'pending'}
            >
              Skip
            </button>
          )}
        </div>
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
            restoreFocus(() => onChoose(index, track));
          }}
          onCancel={() => {
            restoreFocus(onCancelSearch);
          }}
        />
      )}
    </li>
  );
});
