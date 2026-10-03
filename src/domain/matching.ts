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
const whitespace = /\s/u;
const asciiWord = /[A-Za-z0-9_]/;
const isWhitespace = (value: string | undefined): boolean =>
  value !== undefined && whitespace.test(value);
const isAsciiWord = (value: string | undefined): boolean =>
  value !== undefined && asciiWord.test(value);
const startsWithIgnoreCase = (value: string, index: number, literal: string): boolean =>
  value.slice(index, index + literal.length).toLowerCase() === literal;
const wordEndAt = (value: string, index: number, literal: string): number | null => {
  if (!startsWithIgnoreCase(value, index, literal)) return null;
  const end = index + literal.length;
  return isAsciiWord(value[end]) ? null : end;
};
const spacedWordsEndAt = (
  value: string,
  index: number,
  first: string,
  second: string
): number | null => {
  if (!startsWithIgnoreCase(value, index, first)) return null;
  let cursor = index + first.length;
  if (!isWhitespace(value[cursor])) return null;
  while (isWhitespace(value[cursor])) cursor++;
  return wordEndAt(value, cursor, second);
};
const featuredMetadataEnd = (value: string, index: number): number | null =>
  wordEndAt(value, index, 'live') ??
  wordEndAt(value, index, 'acoustic') ??
  wordEndAt(value, index, 'remastered') ??
  wordEndAt(value, index, 'remaster') ??
  spacedWordsEndAt(value, index, 'radio', 'edit') ??
  spacedWordsEndAt(value, index, 'bonus', 'track') ??
  spacedWordsEndAt(value, index, 'live', 'version');

type FeaturedMetadataCandidate = {
  hyphen: number;
  whitespaceStart: number;
  end: number;
  capture: string;
};

const featuredMetadataCandidates = (value: string): FeaturedMetadataCandidate[] => {
  const candidates: FeaturedMetadataCandidate[] = [];
  for (let hyphen = value.indexOf('-'); hyphen >= 0; hyphen = value.indexOf('-', hyphen + 1)) {
    let metadataStart = hyphen + 1;
    while (isWhitespace(value[metadataStart])) metadataStart++;
    const metadataEnd = featuredMetadataEnd(value, metadataStart);
    if (metadataEnd === null) continue;

    let end = metadataEnd;
    while (isWhitespace(value[end])) end++;
    let whitespaceStart = hyphen;
    while (whitespaceStart > 0 && isWhitespace(value[whitespaceStart - 1])) whitespaceStart--;
    candidates.push({
      hyphen,
      whitespaceStart,
      end,
      capture: value.slice(metadataStart, metadataEnd),
    });
  }
  return candidates;
};

const featureMarkerEnd = (value: string, index: number): number | null => {
  const marker = startsWithIgnoreCase(value, index, 'feat')
    ? 'feat'
    : startsWithIgnoreCase(value, index, 'ft')
      ? 'ft'
      : null;
  if (!marker) return null;

  let cursor = index + marker.length;
  if (value[cursor] === '.') cursor++;
  if (!isWhitespace(value[cursor])) return null;
  while (isWhitespace(value[cursor])) cursor++;
  return cursor;
};

const replaceFeaturedMetadata = (value: string): string => {
  const candidates = featuredMetadataCandidates(value);
  const parentheses = [...value.matchAll(/\(/g)].map((match) => match.index);
  const lineFeeds = [...value.matchAll(/\n/g)].map((match) => match.index);
  let candidateIndex = 0;
  let parenthesisIndex = 0;
  let lineFeedIndex = 0;
  let cursor = 0;
  let scan = 0;
  let output = '';

  while (scan < value.length) {
    let marker = scan;
    let afterMarker: number | null = null;
    while (marker < value.length && afterMarker === null) {
      afterMarker = featureMarkerEnd(value, marker);
      if (afterMarker === null) marker++;
    }
    if (afterMarker === null) break;

    while (candidateIndex < candidates.length && candidates[candidateIndex]!.hyphen < afterMarker) {
      candidateIndex++;
    }
    while (
      parentheses[parenthesisIndex] !== undefined &&
      parentheses[parenthesisIndex]! < afterMarker
    ) {
      parenthesisIndex++;
    }
    while (lineFeeds[lineFeedIndex] !== undefined && lineFeeds[lineFeedIndex]! < afterMarker) {
      lineFeedIndex++;
    }

    const candidate = candidates[candidateIndex];
    const blockedByParenthesis =
      candidate !== undefined &&
      parentheses[parenthesisIndex] !== undefined &&
      parentheses[parenthesisIndex]! < candidate.hyphen;
    const blockedByLineFeed =
      candidate !== undefined &&
      lineFeeds[lineFeedIndex] !== undefined &&
      lineFeeds[lineFeedIndex]! < candidate.whitespaceStart;
    if (!candidate || blockedByParenthesis || blockedByLineFeed) {
      scan = marker + 1;
      continue;
    }

    let matchStart = marker;
    while (matchStart > cursor && isWhitespace(value[matchStart - 1])) matchStart--;
    output += `${value.slice(cursor, matchStart)} ${candidate.capture} `;
    cursor = candidate.end;
    scan = cursor;
    candidateIndex++;
  }

  return output + value.slice(cursor);
};

const trailingMetadata =
  /^(?:live|remastered|\d{4}\s+remaster(?:ed)?|radio\s+edit|bonus\s+track|live\s+version)$/i;
const removeTrailingMetadata = (value: string): string => {
  const hyphen = value.lastIndexOf('-');
  if (hyphen < 0) return value;

  let metadataStart = hyphen + 1;
  while (isWhitespace(value[metadataStart])) metadataStart++;
  let metadataEnd = value.length;
  while (metadataEnd > metadataStart && isWhitespace(value[metadataEnd - 1])) metadataEnd--;
  if (!trailingMetadata.test(value.slice(metadataStart, metadataEnd))) return value;

  let whitespaceStart = hyphen;
  while (whitespaceStart > 0 && isWhitespace(value[whitespaceStart - 1])) whitespaceStart--;
  return value.slice(0, whitespaceStart);
};

export function normalizeTrackName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  let result = name
    .replace(/\([^)]{0,500}\)/g, (match) => (startsMetadata(match.slice(1, -1)) ? ' ' : match))
    .replace(/\([^)]{0,500}$/, (match) => (startsMetadata(match.slice(1)) ? ' ' : match));
  result = replaceFeaturedMetadata(result);
  const marker = /\s(?:feat|ft)\.?\s+/i.exec(result);
  if (marker?.index) {
    const rest = result.slice(marker.index + marker[0].length);
    const boundary = rest.search(/[(\n]/);
    result =
      boundary < 0
        ? result.slice(0, marker.index)
        : result.slice(0, marker.index) + ' ' + rest.slice(boundary);
  }
  return removeTrailingMetadata(result)
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
