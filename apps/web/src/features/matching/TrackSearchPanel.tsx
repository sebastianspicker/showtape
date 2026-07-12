'use client';

import { StatusText } from '@/components/StatusText';
import type { AppleMusicTrack } from '@/lib/musickit';

export interface TrackSearchPanelProps {
  index: number;
  searchQuery: string;
  searching: boolean;
  searchError: boolean;
  searchResults: AppleMusicTrack[];
  hasSearched: boolean;
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
  onChoose: (track: AppleMusicTrack) => void;
  onCancel: () => void;
}

export function TrackSearchPanel({
  index,
  searchQuery,
  searching,
  searchError,
  searchResults,
  hasSearched,
  onSearchQueryChange,
  onSearch,
  onChoose,
  onCancel,
}: TrackSearchPanelProps) {
  return (
    <div
      className="track-search-panel"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onCancel();
      }}
    >
      <label htmlFor={`search-track-${index}`} className="input-label">
        Search Apple Music
      </label>
      <div className="track-search-controls">
        <input
          id={`search-track-${index}`}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder="Song name, artist…"
          onKeyDown={(event) => {
            if (event.key === 'Enter') onSearch();
          }}
          autoFocus
          className="input search-input"
        />
        <button
          type="button"
          onClick={onSearch}
          disabled={searching}
          aria-label="Search Apple Music"
          aria-busy={searching}
          className="button button--secondary"
        >
          {searching ? 'Searching…' : 'Search'}
        </button>
        <button type="button" onClick={onCancel} className="button button--quiet">
          Cancel
        </button>
      </div>
      {searching && <StatusText className="inline-status">Searching…</StatusText>}
      {searchError && !searching && (
        <p role="alert" className="error-text">
          Search failed. Check your connection and try again.
        </p>
      )}
      {searchResults.length > 0 && (
        <ul className="search-results-list">
          {searchResults.map((track) => (
            <li key={track.id}>
              <button
                type="button"
                onClick={() => onChoose(track)}
                className="search-result-button"
                aria-label={`Select ${track.name}${track.artistName ? ` by ${track.artistName}` : ''}`}
              >
                {track.name}
                {track.artistName ? ` · ${track.artistName}` : ''}
              </button>
            </li>
          ))}
        </ul>
      )}
      {hasSearched && !searching && !searchError && searchResults.length === 0 && (
        <p className="support-text search-empty">
          No songs found. Try different keywords or check the spelling.
        </p>
      )}
    </div>
  );
}
