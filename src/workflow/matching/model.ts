import { buildSearchQuery } from '@/domain/matching';
import type { SetlistEntry } from '@/domain/setlist';
import { isValidAppleMusicTrack, type AppleMusicTrack } from '@/client/music/types';

export interface MatchRow {
  setlistEntry: SetlistEntry;
  appleTrack: AppleMusicTrack | null;
  status: 'pending' | 'matched' | 'unmatched' | 'skipped';
}

/** Manual catalog search state for the one row whose search panel is open. */
export interface TrackSearchState {
  searchingIndex: number | null;
  searchQuery: string;
  searchResults: AppleMusicTrack[];
  searching: boolean;
  searchError: boolean;
  hasSearched: boolean;
}

export type MatchesAction =
  | { type: 'reset'; rows: MatchRow[] }
  | { type: 'autoResult'; index: number; track: AppleMusicTrack | null }
  | { type: 'choose'; index: number; track: AppleMusicTrack }
  | { type: 'skip'; index: number }
  | { type: 'skipUnmatched' };

export function toPendingRows(entries: SetlistEntry[]): MatchRow[] {
  return entries.map((setlistEntry) => ({
    setlistEntry,
    appleTrack: null,
    status: 'pending',
  }));
}

/** The row at a valid integer index, or undefined. */
export function rowAt(rows: MatchRow[], index: number): MatchRow | undefined {
  return Number.isInteger(index) && index >= 0 && index < rows.length ? rows.at(index) : undefined;
}

/** The typed manual query, or the row's default query when the input is blank. */
export function searchQueryFor(row: MatchRow, value: string): string {
  return value.trim() || buildSearchQuery(row.setlistEntry.name, row.setlistEntry.artist);
}

function replaceRow(rows: MatchRow[], index: number, row: MatchRow): MatchRow[] {
  const next = [...rows];
  next.splice(index, 1, row);
  return next;
}

function selectTrack(rows: MatchRow[], index: number, track: AppleMusicTrack | null): MatchRow[] {
  const existing = rowAt(rows, index);
  if (!existing) return rows;
  const validTrack = isValidAppleMusicTrack(track) ? track : null;
  return replaceRow(rows, index, {
    ...existing,
    appleTrack: validTrack,
    status: validTrack ? 'matched' : 'skipped',
  });
}

/**
 * Match choices in setlist order. An automatic result only fills a row that is still pending,
 * so a manual choice or skip made while the search ran stays authoritative.
 */
export function matchesReducer(rows: MatchRow[], action: MatchesAction): MatchRow[] {
  switch (action.type) {
    case 'reset':
      return action.rows;
    case 'autoResult': {
      const existing = rowAt(rows, action.index);
      if (!existing || existing.status !== 'pending' || existing.appleTrack !== null) return rows;
      return replaceRow(rows, action.index, {
        ...existing,
        appleTrack: action.track,
        status: action.track ? 'matched' : 'unmatched',
      });
    }
    case 'choose':
      return selectTrack(rows, action.index, action.track);
    case 'skip':
      return selectTrack(rows, action.index, null);
    case 'skipUnmatched':
      return rows.map((row) =>
        row.status === 'unmatched' ? { ...row, appleTrack: null, status: 'skipped' } : row
      );
  }
}
