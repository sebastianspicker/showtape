import { describe, expect, it } from 'vitest';
import { flattenSetlistToEntries, parseSetlistIdFromInput } from '../../src/domain/setlist';
import { buildSearchQuery, normalizeTrackName } from '../../src/domain/matching';

describe('setlist domain', () => {
  it('accepts trusted IDs and rejects hostile hosts', () => {
    expect(parseSetlistIdFromInput('https://www.setlist.fm/setlist/a/b-deadbeef.html')).toBe(
      'deadbeef'
    );
    expect(
      parseSetlistIdFromInput('https://setlist.fm@evil.example/setlist/a-b-deadbeef.html')
    ).toBeNull();
  });
  it('flattens provider-independent setlist entries in their original order', () => {
    expect(
      flattenSetlistToEntries({
        id: 'deadbeef',
        artist: 'Artist',
        sets: [[{ name: 'First' }], [{ name: 'Second', artist: 'Guest' }]],
      })
    ).toEqual([
      { name: 'First', artist: 'Artist', info: undefined },
      { name: 'Second', artist: 'Guest', info: undefined },
    ]);
  });
  it('normalizes catalog queries without losing Unicode names', () => {
    expect(normalizeTrackName('Café (Live Version) feat. Guest')).toBe('Café');
    expect(buildSearchQuery('Song (Live)', 'Artist')).toBe('Song Artist');
  });
});
