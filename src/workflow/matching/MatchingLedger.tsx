import { Button } from '@/ui/Button';
import { CatalogMatchRow } from './CatalogMatchRow';
import type { MatchRow, TrackSearchState } from './model';
import type { TrackSearch } from './useTrackSearch';

export interface MatchingRowsProps {
  matches: MatchRow[];
  setlistArtist: string;
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
          setlistArtist={props.setlistArtist}
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

interface MatchingBulkActionsProps {
  loading: boolean;
  onAutoMatchAll: () => void;
  onSkipUnmatched: () => void;
}

function MatchingBulkActions({
  loading,
  onAutoMatchAll,
  onSkipUnmatched,
}: MatchingBulkActionsProps) {
  return (
    <div className="matching-actions" role="group" aria-label="Bulk matching actions">
      <Button
        type="button"
        onClick={onAutoMatchAll}
        loading={loading}
        loadingChildren="Re-matching…"
        variant="quiet"
      >
        Re-match all
      </Button>
      <Button type="button" onClick={onSkipUnmatched} variant="quiet" disabled={loading}>
        Skip remaining
      </Button>
    </div>
  );
}

export interface MatchingLedgerProps extends MatchingRowsProps {
  loadingSuggestions: boolean;
  suggestionError: unknown;
  onAutoMatchAll: () => void;
  onSkipUnmatched: () => void;
}

export function MatchingLedger(props: MatchingLedgerProps) {
  const { loadingSuggestions, suggestionError } = props;
  return (
    <div className="matching-ledger">
      <div className="matching-ledger-header">
        <div>
          <h3 className="matching-ledger-title">Choose the recordings</h3>
          <p className="matching-help-text">
            Each song gets one suggested Apple Music recording. Change any that look like the wrong
            version, or skip songs you do not want.
          </p>
        </div>
        <MatchingBulkActions
          loading={loadingSuggestions}
          onAutoMatchAll={props.onAutoMatchAll}
          onSkipUnmatched={props.onSkipUnmatched}
        />
      </div>
      {suggestionError && !loadingSuggestions ? (
        <p role="alert" className="warning-banner">
          Some songs could not be matched automatically. Use the <strong>Search</strong> button next
          to unmatched songs to find them manually.
        </p>
      ) : null}
      <MatchingRows {...props} />
    </div>
  );
}
