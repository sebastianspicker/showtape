import { getSetlistFmAttributionUrl, type Setlist, type SetlistEntry } from '@/domain/setlist';

const record = (value: unknown): Record<string, unknown> | null =>
  value != null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  !Object.hasOwn(value, '__proto__') &&
  !Object.hasOwn(value, 'constructor')
    ? (value as Record<string, unknown>)
    : null;

const text = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const nonempty = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

/** Converts an untrusted setlist.fm payload into the application's Setlist contract. */
export function mapSetlistFmResponse(raw: unknown, expectedId: string): Setlist | null {
  const payload = record(raw);
  if (!payload) return null;
  const artist = record(payload?.artist);
  const id = text(payload?.id);
  const eventDate = text(payload?.eventDate);
  if (
    !id ||
    id.toLowerCase() !== expectedId.toLowerCase() ||
    !nonempty(eventDate) ||
    !artist ||
    !nonempty(artist.name)
  )
    return null;

  // The live API nests sets as `sets.set`; the published docs show a top-level `set`.
  const rawSets = record(payload.sets)?.set ?? payload.set;
  const sets: SetlistEntry[][] = [];
  for (const rawSet of Array.isArray(rawSets) ? rawSets : []) {
    const set = record(rawSet);
    if (!set || !Array.isArray(set.song)) continue;
    const songs: SetlistEntry[] = [];
    for (const rawSong of set.song) {
      const song = record(rawSong);
      if (
        !song ||
        !nonempty(song.name) ||
        (song.tape !== undefined && typeof song.tape !== 'boolean') ||
        song.tape
      )
        continue;
      songs.push({
        name: song.name,
        artist: text(record(song.cover)?.name) ?? artist.name,
        info: text(song.info),
      });
    }
    if (songs.length) sets.push(songs);
  }

  return {
    id,
    artist: artist.name,
    venue: text(record(payload.venue)?.name),
    eventDate,
    sourceUrl: getSetlistFmAttributionUrl(payload.url),
    sets,
  };
}
