import { SETLIST_FM_ATTRIBUTION_FALLBACK_URL, type Setlist, type SetlistEntry } from './types.js';
import type { SetlistFmResponse, SetlistFmSong } from './setlistfm-types.js';

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const getOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const getCoverArtist = (cover: unknown): string | undefined => {
  if (!cover || typeof cover !== 'object') return undefined;
  return getOptionalString((cover as Record<string, unknown>).name);
};

const toSafeRecord = (value: unknown): Record<string, unknown> | null => {
  if (value == null || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(record, '__proto__')) return null;
  if (Object.prototype.hasOwnProperty.call(record, 'constructor')) return null;
  return record;
};

/** Return a safe song item from setlist.fm while allowing normal inherited object properties. */
const toSetlistFmSong = (value: unknown): SetlistFmSong | null => {
  const song = toSafeRecord(value);
  if (!song || !isNonEmptyString(song.name)) return null;
  if (song.tape !== undefined && typeof song.tape !== 'boolean') return null;
  return value as SetlistFmSong;
};

/** Extract song array from a set object; API may return non-array. */
const getSongsFromSet = (fmSet: Record<string, unknown>): unknown[] => {
  const song = fmSet.song;
  return Array.isArray(song) ? song : [];
};

const getArtistName = (value: unknown): string => {
  if (!value || typeof value !== 'object') throw new Error('Invalid setlist response');
  const artist = (value as Record<string, unknown>).artist;
  if (!artist || typeof artist !== 'object') {
    throw new Error('Invalid setlist response: missing artist');
  }
  const artistName = (artist as Record<string, unknown>).name;
  if (!isNonEmptyString(artistName)) {
    throw new Error('Invalid setlist response: missing artist');
  }
  return artistName;
};

const getVenueName = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  return getOptionalString((value as Record<string, unknown>).name);
};

export const getSetlistFmAttributionUrl = (value: unknown): string => {
  if (typeof value !== 'string') return SETLIST_FM_ATTRIBUTION_FALLBACK_URL;
  try {
    const url = new URL(value);
    const isSetlistFm = url.hostname === 'setlist.fm' || url.hostname.endsWith('.setlist.fm');
    if (
      url.protocol !== 'https:' ||
      !isSetlistFm ||
      url.username.length > 0 ||
      url.password.length > 0
    ) {
      return SETLIST_FM_ATTRIBUTION_FALLBACK_URL;
    }
    return url.href;
  } catch {
    return SETLIST_FM_ATTRIBUTION_FALLBACK_URL;
  }
};

const mapSong = (value: unknown, artistName: string): SetlistEntry | null => {
  const song = toSetlistFmSong(value);
  if (!song || song.tape) return null;
  return {
    name: song.name,
    artist: getCoverArtist(song.cover) ?? artistName,
    info: getOptionalString(song.info),
  };
};

const mapSet = (value: unknown, artistName: string): SetlistEntry[] | null => {
  const set = toSafeRecord(value);
  if (!set) return null;

  const entries: SetlistEntry[] = [];
  for (const song of getSongsFromSet(set)) {
    const entry = mapSong(song, artistName);
    if (entry) entries.push(entry);
  }
  return entries.length > 0 ? entries : null;
};

/**
 * Map a setlist.fm API response to our domain Setlist model.
 * Preserves set structure and order; each song becomes a SetlistEntry.
 * Validates response shape; throws on invalid input.
 */
export function mapSetlistFmToSetlist(raw: SetlistFmResponse): Setlist {
  const artistName = getArtistName(raw);
  const sets: SetlistEntry[][] = [];
  const fmSets = Array.isArray(raw.set) ? raw.set : [];
  for (const fmSet of fmSets) {
    const entries = mapSet(fmSet, artistName);
    if (entries) sets.push(entries);
  }

  return {
    id: getOptionalString(raw.id) ?? '',
    artist: artistName,
    venue: getVenueName(raw.venue),
    eventDate: getOptionalString(raw.eventDate),
    sourceUrl: getSetlistFmAttributionUrl(raw.url),
    sets,
  };
}
