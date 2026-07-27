import type { Setlist, SetlistEntry } from './types.js';

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const normalizeEntry = (value: unknown, fallbackArtist: string): SetlistEntry | null => {
  if (value == null || typeof value !== 'object') return null;
  const entry = value as Record<string, unknown>;
  return {
    name: optionalString(entry.name) ?? '',
    artist: optionalString(entry.artist) ?? fallbackArtist,
    info: optionalString(entry.info),
  };
};

/**
 * Flatten setlist sets into one ordered list of entries.
 * Skips null/non-object entries; normalizes artist from setlist when missing on entry.
 */
export function flattenSetlistToEntries(setlist: Setlist): SetlistEntry[] {
  const entries: SetlistEntry[] = [];
  if (!Array.isArray(setlist.sets)) return entries;

  for (const set of setlist.sets) {
    if (!Array.isArray(set)) continue;
    for (const value of set) {
      const entry = normalizeEntry(value, setlist.artist);
      if (entry) entries.push(entry);
    }
  }
  return entries;
}
