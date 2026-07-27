import { describe, it, expect } from 'vitest';
import { normalizeTrackName } from '../src/matching/normalize';

describe('normalizeTrackName', () => {
  it('strips parentheticals', () => {
    expect(normalizeTrackName('Song (live)')).toBe('Song');
    expect(normalizeTrackName('Song (acoustic)')).toBe('Song');
  });

  it('strips unbalanced trailing parentheses', () => {
    expect(normalizeTrackName('Song (live')).toBe('Song');
    expect(normalizeTrackName('Song (acoustic')).toBe('Song');
  });

  it('strips feat. and ft. segments', () => {
    expect(normalizeTrackName('Song feat. Other Artist')).toBe('Song');
    expect(normalizeTrackName('Song ft. Other Artist')).toBe('Song');
  });

  it('strips a featured-artist segment when it contains a hyphen', () => {
    expect(normalizeTrackName('Song feat. Artist A - Artist B')).toBe('Song');
  });

  it('returns empty for empty input', () => {
    expect(normalizeTrackName('')).toBe('');
  });

  it('normalizes spaces', () => {
    expect(normalizeTrackName('  Hello   World  ')).toBe('Hello World');
  });

  it('preserves meaningful leading parentheses', () => {
    expect(normalizeTrackName("(Don't Fear) The Reaper")).toBe("(Don't Fear) The Reaper");
    expect(normalizeTrackName('Interstate Love Song (2019 Remastered)')).toBe(
      'Interstate Love Song'
    );
  });

  it('preserves non-artist text after removing a featured-artist segment', () => {
    expect(normalizeTrackName('Song feat. Artist A (live)')).toBe('Song');
    expect(normalizeTrackName('Song feat. Artist A - Radio Edit')).toBe('Song Radio Edit');
  });

  it('removes common release metadata', () => {
    expect(normalizeTrackName('Song (2011 Remastered Version)')).toBe('Song');
    expect(normalizeTrackName('Song (Live Version)')).toBe('Song');
    expect(normalizeTrackName('Song - 2019 Remaster')).toBe('Song');
    expect(normalizeTrackName('Song - Radio Edit')).toBe('Song');
    expect(normalizeTrackName('Song - Bonus Track')).toBe('Song');
  });

  it('preserves Unicode names while stripping compatibility metadata', () => {
    expect(normalizeTrackName('Café (Live)')).toBe('Café');
    expect(normalizeTrackName('花火 - Radio Edit')).toBe('花火');
  });
});
