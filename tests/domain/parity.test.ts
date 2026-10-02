import { describe, it, expect } from 'vitest';
import fixtures from '../../fixtures/domain-parity.json';
import {
  createSelectionSignature,
  normalizeTrackName,
  buildSearchQuery,
  dedupeTrackIdsOrdered,
} from '../../src/domain/matching';
import {
  parseSetlistIdFromInput,
  buildPlaylistName,
  getSetlistSignature,
  flattenSetlistToEntries,
} from '../../src/domain/setlist';
describe('shared native and web domain corpus', () => {
  it('preserves input parsing, matching, order and signatures', () => {
    for (const value of fixtures.selections)
      expect(createSelectionSignature(value.ids, value.deduplicate)).toBe(value.signature);
    for (const value of fixtures.inputs)
      expect(parseSetlistIdFromInput(value.input)).toBe(value.id);
    for (const value of fixtures.matching) {
      expect(normalizeTrackName(value.name)).toBe(value.normalized);
      expect(buildSearchQuery(value.name, value.artist)).toBe(value.query);
    }
    for (const value of fixtures.dedupe)
      expect(dedupeTrackIdsOrdered(value.ids)).toEqual(value.expected);
    for (const value of fixtures.setlists) {
      expect(buildPlaylistName(value.setlist)).toBe(value.playlistName);
      expect(getSetlistSignature(value.setlist)).toBe(value.signature);
      expect(flattenSetlistToEntries(value.setlist)).toEqual(value.entries);
    }
  });
});
