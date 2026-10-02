import { StatusText } from '@/ui/StatusText';
import { CatalogMatchRow } from './CatalogMatchRow';
import type { MatchRow, TrackSearchState } from './model';
import type { TrackSearch } from './useTrackSearch';

export interface MatchingRowsProps {
  matches: MatchRow[];
  searchContext: TrackSearchState;
  onOpenSearch: TrackSearch['openSearch'];
  onSkip: TrackSearch['skipTrack'];
  onSearchQueryChange: TrackSearch['setSearchQuery'];
  onSearch: TrackSearch['runSearch'];
  onChoose: TrackSearch['chooseTrack'];
  onCancelSearch: TrackSearch['closeSearch'];
}

export function MatchingRows(props: MatchingRowsProps) {
  return (
    <ul className="matching-list">
      {props.matches.map((row, index) => (
        <CatalogMatchRow
          key={`${row.setlistEntry.name}-${index}`}
          row={row}
          index={index}
          isSearching={props.searchContext.searchingIndex === index}
          searchContext={props.searchContext.searchingIndex === index ? props.searchContext : null}
          onOpenSearch={props.onOpenSearch}
          onSkip={props.onSkip}
          onSearchQueryChange={props.onSearchQueryChange}
          onSearch={props.onSearch}
          onChoose={props.onChoose}
          onCancelSearch={props.onCancelSearch}
        />
      ))}
    </ul>
  );
}

export interface MatchingLedgerProps extends MatchingRowsProps {
  loadingSuggestions: boolean;
  suggestionError: unknown;
  matchedCount: number;
  settledCount: number;
  isSettled: boolean;
}

export function MatchingLedger(props: MatchingLedgerProps) {
  const { matches, loadingSuggestions, suggestionError, matchedCount, settledCount, isSettled } =
    props;
  return (
    <div className="matching-ledger">
      <h3 className="matching-ledger-title">Choose the recordings</h3>
      <p className="muted-block">
        Review each Apple Music suggestion. Change unusual versions, or skip songs you do not want
        in the playlist.
      </p>
      <StatusText className="matching-progress">
        {isSettled ? (
          <>
            <strong>{matchedCount} selected</strong>
            {' · '}
            {matches.filter((match) => match.status === 'unmatched').length} unresolved
            {matches.some((match) => match.status === 'skipped')
              ? ` · ${matches.filter((match) => match.status === 'skipped').length} skipped`
              : ''}
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
      <div className="matching-column-labels" aria-hidden="true">
        <span># / Setlist song</span>
        <span>Apple Music recording</span>
        <span>Choice</span>
      </div>
      <MatchingRows {...props} />
    </div>
  );
}
