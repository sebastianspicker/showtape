import { MatchRowItem } from './MatchRowItem';
import type { MatchRow } from './types';
import type { TrackSearchContext } from './useTrackSearch';

export interface MatchingRowsProps {
  matches: MatchRow[];
  searchContext: TrackSearchContext;
  onOpenSearch: (index: number) => void;
  onSkip: (index: number) => void;
  onSearchQueryChange: (value: string) => void;
  onSearch: (index: number) => Promise<void>;
  onChoose: (index: number, track: NonNullable<MatchRow['appleTrack']>) => void;
  onCancelSearch: () => void;
}

export function MatchingRows(props: MatchingRowsProps) {
  return (
    <ul className="matching-list">
      {props.matches.map((row, index) => (
        <MatchRowItem
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
