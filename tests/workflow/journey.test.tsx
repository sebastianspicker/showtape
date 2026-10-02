// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MatchRow } from '@/workflow/matching/model';
import { JOURNEY_STEPS, useJourney } from '../../src/workflow/journey';

const rows: MatchRow[] = [
  { setlistEntry: { name: 'Song', artist: 'Artist' }, appleTrack: null, status: 'unmatched' },
];

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('setlist journey state', () => {
  it('keeps a reviewed match draft through export and clears it for a new import', () => {
    const { result } = renderHook(() => useJourney());
    act(() => result.current.showExport(rows));
    expect(result.current.step).toBe('export');
    expect(result.current.matchDraft).toBe(rows);
    act(() => result.current.restart());
    expect(result.current.step).toBe('import');
    expect(result.current.matchDraft).toBeNull();
  });

  it('keeps the draft across preview and drops it after a fresh import', () => {
    const { result } = renderHook(() => useJourney());
    act(() => result.current.saveMatchDraft(rows));
    act(() => result.current.showPreview());
    expect(result.current.matchDraft).toBe(rows);
    act(() => result.current.previewImported());
    expect(result.current.step).toBe('preview');
    expect(result.current.matchDraft).toBeNull();
  });

  it('defines each step once, in order', () => {
    expect(JOURNEY_STEPS.map((step) => [step.id, step.number, step.railLabel])).toEqual([
      ['import', 1, 'Import'],
      ['preview', 2, 'Preview'],
      ['matching', 3, 'Match'],
      ['export', 4, 'Export'],
    ]);
  });
});
