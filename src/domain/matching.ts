const metadata = [
  'live',
  'acoustic',
  'remaster',
  'remastered',
  'radio edit',
  'bonus track',
  'live version',
];
const startsMetadata = (value: string) =>
  metadata.some((prefix) =>
    value
      .trim()
      .toLowerCase()
      .replace(/^\d{4}\s+/, '')
      .startsWith(prefix)
  );
export function normalizeTrackName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  let result = name
    .replace(/\([^)]{0,500}\)/g, (match) => (startsMetadata(match.slice(1, -1)) ? ' ' : match))
    .replace(/\([^)]{0,500}$/, (match) => (startsMetadata(match.slice(1)) ? ' ' : match));
  result = result.replace(
    /\s*(?:feat|ft)\.?\s+[^(\n]*?\s*-\s*(live|acoustic|remaster(?:ed)?|radio\s+edit|bonus\s+track|live\s+version)\b\s*/gi,
    ' $1 '
  );
  const marker = /\s(?:feat|ft)\.?\s+/i.exec(result);
  if (marker?.index) {
    const rest = result.slice(marker.index + marker[0].length);
    const boundary = rest.search(/[(\n]/);
    result =
      boundary < 0
        ? result.slice(0, marker.index)
        : result.slice(0, marker.index) + ' ' + rest.slice(boundary);
  }
  return result
    .replace(
      /\s*-\s*(?:live|remastered|\d{4}\s+remaster(?:ed)?|radio\s+edit|bonus\s+track|live\s+version)\s*$/i,
      ''
    )
    .replace(/[\s\-–—]+/g, ' ')
    .trim();
}
// Avoid ending the bounded query with half of a UTF-16 surrogate pair.
const queryPrefix = (value: string): string => value.slice(0, 200).replace(/[\uD800-\uDBFF]$/, '');
export const buildSearchQuery = (track: string, artist?: string): string =>
  [queryPrefix(normalizeTrackName(track)), queryPrefix(artist?.trim() ?? '')]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
export function dedupeTrackIdsOrdered(ids: string[]): string[] {
  const seen = new Set<string>();
  return ids.flatMap((value) => {
    const id = typeof value === 'string' ? value.trim() : '';
    return !id || seen.has(id) ? [] : (seen.add(id), [id]);
  });
}

/** Identifies the exact ordered export sequence and duplicate policy. */
export const createSelectionSignature = (songIds: string[], dedupeTracks: boolean): string =>
  JSON.stringify({ dedupeTracks, songIds });
