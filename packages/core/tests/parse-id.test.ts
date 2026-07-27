import { describe, expect, it } from 'vitest';
import { parseSetlistIdFromInput } from '../src/setlist/parse-id';

describe('parseSetlistIdFromInput', () => {
  it('accepts IDs from 4 through 12 hexadecimal characters', () => {
    expect(parseSetlistIdFromInput('abcd')).toBe('abcd');
    expect(parseSetlistIdFromInput('63de4613')).toBe('63de4613');
    expect(parseSetlistIdFromInput('a'.repeat(12))).toBe('a'.repeat(12));
    expect(parseSetlistIdFromInput('  abc123  ')).toBe('abc123');
  });

  it('rejects invalid raw IDs', () => {
    expect(parseSetlistIdFromInput('')).toBeNull();
    expect(parseSetlistIdFromInput('   ')).toBeNull();
    expect(parseSetlistIdFromInput('abc')).toBeNull();
    expect(parseSetlistIdFromInput('a'.repeat(13))).toBeNull();
    expect(parseSetlistIdFromInput('abcd-ef01')).toBeNull();
    expect(parseSetlistIdFromInput('wxyz')).toBeNull();
  });

  it('extracts IDs from supported setlist.fm URL forms', () => {
    expect(
      parseSetlistIdFromInput(
        'https://www.setlist.fm/setlist/radiohead/2003/south-park-oxford-england-53d6a489.html'
      )
    ).toBe('53d6a489');
    expect(
      parseSetlistIdFromInput(
        'http://www.setlist.fm/setlist/the-beatles/1964/hollywood-bowl-ABCDEF12.html?view=1#songs'
      )
    ).toBe('ABCDEF12');
    expect(parseSetlistIdFromInput('www.setlist.fm/setlist/artist/venue-dead1f.html')).toBe(
      'dead1f'
    );
    expect(parseSetlistIdFromInput('setlist.fm/setlist/band/2024/venue-city-abcdef12.html')).toBe(
      'abcdef12'
    );
    expect(parseSetlistIdFromInput('https://www.setlist.fm/setlist/63de4613.html')).toBe(
      '63de4613'
    );
  });

  it('rejects non-setlist hosts and user-info host confusion', () => {
    expect(parseSetlistIdFromInput('https://example.com/page-abcd1234.html')).toBeNull();
    expect(parseSetlistIdFromInput('https://setlist.fm.evil.com/setlist/a/b-c1.html')).toBeNull();
    expect(parseSetlistIdFromInput('https://evilsetlist.fm/setlist/a/b-c1.html')).toBeNull();
    expect(parseSetlistIdFromInput('https://setlist.fm@evil.com/setlist/a/b-c1.html')).toBeNull();
  });

  it('rejects setlist.fm URLs without a valid ID suffix', () => {
    expect(parseSetlistIdFromInput('https://www.setlist.fm/setlist/artist/venue.html')).toBeNull();
    expect(
      parseSetlistIdFromInput('https://www.setlist.fm/setlist/artist/venue-xyz.html')
    ).toBeNull();
  });
});
