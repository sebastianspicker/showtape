import { describe, expect, it } from 'vitest';
import type { AppleMusicTrack } from '@/client/music/types';
import { matchesReducer, toPendingRows, type MatchRow } from '@/workflow/matching/model';

const automatic: AppleMusicTrack = { id: 'automatic', name: 'Automatic' };
const chosen: AppleMusicTrack = { id: 'chosen', name: 'Chosen' };
const pending = (): MatchRow[] => toPendingRows([{ name: 'One' }, { name: 'Two' }]);

describe('matchesReducer', () => {
  it('fills only rows that are still pending with automatic results', () => {
    let rows = matchesReducer(pending(), { type: 'autoResult', index: 0, track: automatic });
    rows = matchesReducer(rows, { type: 'autoResult', index: 1, track: null });
    expect(rows.map((row) => [row.status, row.appleTrack?.id])).toEqual([
      ['matched', 'automatic'],
      ['unmatched', undefined],
    ]);
  });

  it('keeps a manual choice or skip when a late automatic result arrives', () => {
    let rows = matchesReducer(pending(), { type: 'choose', index: 0, track: chosen });
    rows = matchesReducer(rows, { type: 'skip', index: 1 });
    const settled = rows;
    rows = matchesReducer(rows, { type: 'autoResult', index: 0, track: automatic });
    rows = matchesReducer(rows, { type: 'autoResult', index: 1, track: automatic });
    expect(rows).toBe(settled);
    expect(rows.map((row) => [row.status, row.appleTrack?.id])).toEqual([
      ['matched', 'chosen'],
      ['skipped', undefined],
    ]);
  });

  it('treats an invalid chosen track as a skip', () => {
    const rows = matchesReducer(pending(), {
      type: 'choose',
      index: 0,
      track: { id: ' ', name: 'Blank' },
    });
    expect(rows[0]).toMatchObject({ status: 'skipped', appleTrack: null });
  });

  it.each([-1, 2, 0.5, Number.NaN])('ignores actions for row index %s', (index) => {
    const rows = pending();
    expect(matchesReducer(rows, { type: 'choose', index, track: chosen })).toBe(rows);
    expect(matchesReducer(rows, { type: 'skip', index })).toBe(rows);
    expect(matchesReducer(rows, { type: 'autoResult', index, track: automatic })).toBe(rows);
  });

  it('skips only unmatched rows and resets to new rows', () => {
    let rows = matchesReducer(pending(), { type: 'autoResult', index: 0, track: null });
    rows = matchesReducer(rows, { type: 'skipUnmatched' });
    expect(rows.map((row) => row.status)).toEqual(['skipped', 'pending']);
    const fresh = toPendingRows([{ name: 'Three' }]);
    expect(matchesReducer(rows, { type: 'reset', rows: fresh })).toBe(fresh);
  });
});
