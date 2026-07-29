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

interface SearchResultsProps {
  resultsId: string;
  searchResults: AppleMusicTrack[];
  hasSearched: boolean;
  searching: boolean;
  searchError: boolean;
  onChoose: (track: AppleMusicTrack) => void;
}

interface SearchControlsProps {
  inputId: string;
  resultsId: string;
  searchQuery: string;
  searching: boolean;
  onSearchQueryChange: (value: string) => void;
  onSearch: () => void;
  onCancel: () => void;
}

function SearchControls(props: SearchControlsProps) {
  const { inputId, resultsId, searchQuery, searching, onSearchQueryChange, onSearch, onCancel } =
    props;

  return (
    <>
      <label htmlFor={inputId} className="input-label">
        Search Apple Music
      </label>
      <div className="track-search-controls">
        <input
          id={inputId}
          type="search"
          value={searchQuery}
          onChange={(event) => {
            onSearchQueryChange(event.target.value);
          }}
          placeholder="Song name, artist…"
          onKeyDown={(event) => {
            if (event.key === 'Enter') onSearch();
          }}
          autoFocus
          className="input search-input"
          aria-controls={resultsId}
          autoComplete="off"
          enterKeyHint="search"
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
    </>
  );
}

function SearchResults({
  resultsId,
  searchResults,
  hasSearched,
  searching,
  searchError,
  onChoose,
}: SearchResultsProps) {
  if (searchResults.length > 0) {
    return (
      <ul id={resultsId} className="search-results-list" aria-label="Search results">
        {searchResults.map((track) => (
          <li key={track.id}>
            <button
              type="button"
              onClick={() => onChoose(track)}
              className="search-result-button"
              aria-label={`Select ${track.name}${track.artistName ? ` by ${track.artistName}` : ''}`}
            >
              <span>
                {track.name}
                {track.artistName ? ` · ${track.artistName}` : ''}
              </span>
              <span className="search-result-action" aria-hidden="true">
                Select
              </span>
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return hasSearched && !searching && !searchError ? (
    <p className="support-text search-empty" id={resultsId}>
      No songs found. Try different keywords or check the spelling.
    </p>
  ) : null;
}

export function TrackSearchPanel(props: TrackSearchPanelProps) {
  const {
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
  } = props;
  const inputId = `search-track-${index}`;
  const resultsId = `search-results-${index}`;

  return (
    <div
      className="track-search-panel"
      role="search"
      aria-label="Search Apple Music for a catalog track"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onCancel();
      }}
    >
      <SearchControls
        inputId={inputId}
        resultsId={resultsId}
        searchQuery={searchQuery}
        searching={searching}
        onSearchQueryChange={onSearchQueryChange}
        onSearch={onSearch}
        onCancel={onCancel}
      />
      {searching && <StatusText className="inline-status">Searching…</StatusText>}
      {searchError && !searching && (
        <p role="alert" className="error-text">
          Search failed. Check your connection and try again.
        </p>
      )}
      <SearchResults
        resultsId={resultsId}
        searchResults={searchResults}
        hasSearched={hasSearched}
        searching={searching}
        searchError={searchError}
        onChoose={onChoose}
      />
    </div>
  );
}
