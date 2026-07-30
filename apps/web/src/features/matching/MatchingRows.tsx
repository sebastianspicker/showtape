import { MatchRowItem } from './MatchRowItem';
import type { MatchRow } from './types';
import type { TrackSearchContext, UseTrackSearchResult } from './useTrackSearch';

export interface MatchingRowsProps {
  matches: MatchRow[];
  searchContext: TrackSearchContext;
  onOpenSearch: UseTrackSearchResult['openSearch'];
  onSkip: UseTrackSearchResult['skipTrack'];
  onSearchQueryChange: UseTrackSearchResult['setSearchQuery'];
  onSearch: UseTrackSearchResult['runSearch'];
  onChoose: UseTrackSearchResult['chooseTrack'];
  onCancelSearch: UseTrackSearchResult['closeSearch'];
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
