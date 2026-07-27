const SETLIST_ID_PATTERN = /^[a-f0-9]{4,12}$/i;
const SETLIST_ID_SUFFIX_PATTERN = /-([a-f0-9]{4,12})\.html$/i;

const isSetlistId = (value: string): boolean => SETLIST_ID_PATTERN.test(value);

const looksLikeSetlistUrl = (value: string): boolean =>
  value.startsWith('http://') || value.startsWith('https://') || value.includes('setlist.fm');

const idFromSetlistPath = (pathname: string): string | null => {
  const suffixMatch = pathname.match(SETLIST_ID_SUFFIX_PATTERN);
  if (suffixMatch?.[1]) return suffixMatch[1];

  const segment = pathname.split('/').filter(Boolean).pop();
  if (!segment) return null;

  const withoutHtml = segment.replace(/\.html$/i, '');
  const idPart = withoutHtml.split('-').pop();
  if (idPart && isSetlistId(idPart)) return idPart;
  return isSetlistId(withoutHtml) ? withoutHtml : null;
};

const idFromSetlistUrl = (value: string): string | null => {
  try {
    const url = new URL(value.startsWith('http') ? value : `https://${value}`);
    const hostname = url.hostname.toLowerCase();
    if (hostname !== 'setlist.fm' && hostname !== 'www.setlist.fm') return null;
    return idFromSetlistPath(url.pathname);
  } catch {
    return null;
  }
};

/**
 * Extracts the raw setlist ID from either a direct string or a full setlist.fm URL.
 * Strictly validates the 4-12 hex character IDs used across this project to avoid
 * sending malformed identifiers to the API.
 */
export function parseSetlistIdFromInput(idOrUrl: string): string | null {
  const trimmed = idOrUrl.trim();
  if (!trimmed) return null;
  if (looksLikeSetlistUrl(trimmed)) return idFromSetlistUrl(trimmed);
  return isSetlistId(trimmed) ? trimmed : null;
}
