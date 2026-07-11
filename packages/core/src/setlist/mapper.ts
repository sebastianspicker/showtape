import type { Setlist, SetlistEntry } from './types.js';
import type { SetlistFmResponse, SetlistFmSong } from './setlistfm-types.js';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function getOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function getCoverArtist(cover: unknown): string | undefined {
  if (!cover || typeof cover !== 'object') return undefined;
  return getOptionalString((cover as Record<string, unknown>).name);
}

/** Type guard: safe song item from setlist.fm. Check own keys only to avoid excluding normal objects (they inherit __proto__/constructor). */
function isSetlistFmSong(s: unknown): s is SetlistFmSong {
  if (s == null || typeof s !== 'object' || !('name' in s)) return false;
  const o = s as Record<string, unknown>;
  return (
    isNonEmptyString(o.name) &&
    (o.tape === undefined || typeof o.tape === 'boolean') &&
    !Object.prototype.hasOwnProperty.call(o, '__proto__') &&
    !Object.prototype.hasOwnProperty.call(o, 'constructor')
  );
}

/** Extract song array from a set object; API may return non-array. */
function getSongsFromSet(fmSet: Record<string, unknown>): unknown[] {
  const song = fmSet.song;
  return Array.isArray(song) ? song : [];
}

/**
 * Map a setlist.fm API response to our domain Setlist model.
 * Preserves set structure and order; each song becomes a SetlistEntry.
 * Validates response shape; throws on invalid input.
 */
export function mapSetlistFmToSetlist(raw: SetlistFmResponse): Setlist {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid setlist response');
  }
  if (!raw.artist || typeof raw.artist !== 'object') {
    throw new Error('Invalid setlist response: missing artist');
  }
  const artistName = (raw.artist as { name?: unknown }).name;
  if (!isNonEmptyString(artistName)) {
    throw new Error('Invalid setlist response: missing artist');
  }
  const venueName = getOptionalString((raw.venue as { name?: unknown } | undefined)?.name);
  const eventDate = raw.eventDate;

  const sets: SetlistEntry[][] = [];
  const fmSets = Array.isArray(raw.set) ? raw.set : [];

  for (const fmSet of fmSets) {
    if (!fmSet || typeof fmSet !== 'object') continue;

    // Guard against prototype pollution (own properties only). Cast to record for hasOwnProperty check (SetlistFmSet has no index signature).
    const setObj = fmSet as unknown as Record<string, unknown>;
    if (
      Object.prototype.hasOwnProperty.call(setObj, '__proto__') ||
      Object.prototype.hasOwnProperty.call(setObj, 'constructor')
    )
      continue;

    const songs = getSongsFromSet(setObj);

    // Guard each song item (null/non-object) so s.name does not throw
    const entries: SetlistEntry[] = songs
      .filter(isSetlistFmSong)
      // setlist.fm marks pre-show/interlude playback as tape; exports should contain performed songs.
      .filter((s) => !s.tape)
      .map((s) => ({
        name: s.name,
        artist: getCoverArtist(s.cover) ?? artistName,
        info: getOptionalString(s.info),
      }));
    if (entries.length > 0) sets.push(entries);
  }

  return {
    id: raw.id ?? '',
    artist: artistName,
    venue: venueName,
    eventDate,
    sets,
  };
}
