export interface SetlistEntry {
  name: string;
  artist?: string;
  info?: string;
}
export interface Setlist {
  id: string;
  artist: string;
  venue?: string;
  eventDate?: string;
  sourceUrl?: string;
  sets: SetlistEntry[][];
}
const record = (value: unknown): Record<string, unknown> | null =>
  value != null &&
  typeof value === 'object' &&
  !Object.hasOwn(value, '__proto__') &&
  !Object.hasOwn(value, 'constructor')
    ? (value as Record<string, unknown>)
    : null;
const text = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const attributionFallback = 'https://www.setlist.fm/';

/** Defense in depth for rendering the typed source attribution in the browser. */
export function getSetlistFmAttributionUrl(value: unknown): string {
  if (typeof value !== 'string') return attributionFallback;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      (url.hostname === 'setlist.fm' || url.hostname.endsWith('.setlist.fm')) &&
      !url.username &&
      !url.password
      ? url.href
      : attributionFallback;
  } catch {
    return attributionFallback;
  }
}
export const MAX_SETLIST_INPUT_LENGTH = 2000;
export const SETLIST_INPUT_MESSAGES = {
  INPUT_TOO_LONG:
    'Input too long. Use setlist ID or a shorter setlist.fm URL (max 2000 characters).',
  INVALID_ID_OR_URL:
    'Invalid setlist ID or URL. Use a setlist.fm URL or the setlist ID (e.g. 63de4613).',
} as const;
const idPattern = /^[a-f0-9]{4,12}$/i;
export function parseSetlistIdFromInput(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (
    !value.startsWith('http://') &&
    !value.startsWith('https://') &&
    !value.includes('setlist.fm')
  )
    return idPattern.test(value) ? value : null;
  try {
    const url = new URL(value.startsWith('http') ? value : `https://${value}`);
    if (!['setlist.fm', 'www.setlist.fm'].includes(url.hostname.toLowerCase())) return null;
    const last = url.pathname
      .split('/')
      .filter(Boolean)
      .pop()
      ?.replace(/\.html$/i, '');
    const id = last?.split('-').pop() ?? '';
    return idPattern.test(id) ? id : null;
  } catch {
    return null;
  }
}
export function flattenSetlistToEntries(setlist: Setlist): SetlistEntry[] {
  const entries: SetlistEntry[] = [];
  for (const set of Array.isArray(setlist.sets) ? setlist.sets : [])
    for (const value of Array.isArray(set) ? set : []) {
      const item = record(value);
      if (item)
        entries.push({
          name: text(item.name) ?? '',
          artist: text(item.artist) ?? setlist.artist,
          info: text(item.info),
        });
    }
  return entries;
}
export const buildPlaylistName = (setlist: Setlist): string =>
  ['Setlist', setlist.artist, setlist.eventDate].filter((value) => value?.trim()).join(' – ') ||
  'Setlist';
export function getSetlistSignature(setlist: Setlist): string {
  const artist = text(setlist.artist) ?? '';
  return [
    text(setlist.id) ?? '',
    artist,
    text(setlist.eventDate) ?? '',
    (Array.isArray(setlist.sets) ? setlist.sets : [])
      .flat()
      .map((value) => {
        const item = record(value);
        return `${text(item?.name) ?? ''}|${text(item?.artist) ?? artist}|${text(item?.info) ?? ''}`;
      })
      .join('||'),
  ].join('::');
}
