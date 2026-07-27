import type { Setlist } from './types.js';

const optionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const stringOrEmpty = (value: unknown): string => optionalString(value) ?? '';

const stringOrFallback = (value: unknown, fallback: string): string =>
  optionalString(value) ?? fallback;

const entrySignature = (value: unknown, fallbackArtist: string): string => {
  if (value == null || typeof value !== 'object') return `|${fallbackArtist}|`;
  const entry = value as Record<string, unknown>;
  return [
    stringOrEmpty(entry.name),
    stringOrFallback(entry.artist, fallbackArtist),
    stringOrEmpty(entry.info),
  ].join('|');
};

/**
 * Stable string signature for detecting meaningful setlist changes in UI effects.
 */
export function getSetlistSignature(setlist: Setlist): string {
  const artist = optionalString(setlist.artist) ?? '';
  const sets = Array.isArray(setlist.sets) ? setlist.sets : [];
  const tracks = sets
    .filter(Array.isArray)
    .flat()
    .map((entry) => entrySignature(entry, artist))
    .join('||');
  return [
    optionalString(setlist.id) ?? '',
    artist,
    optionalString(setlist.eventDate) ?? '',
    tracks,
  ].join('::');
}
