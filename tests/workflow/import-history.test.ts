import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearImportHistory,
  pushImportHistoryItem,
  readImportHistory,
  writeImportHistory,
} from '../../src/workflow/import/importHistory';

const V1 = 'setlist_import_history_v1';
const V2 = 'setlist_import_history_v2';
const V3 = 'setlist_import_history_v3';
const storage = new Map<string, string>();
const localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
};

beforeEach(() => {
  storage.clear();
  vi.stubGlobal('window', { localStorage });
});
afterEach(() => {
  storage.clear();
  vi.unstubAllGlobals();
});

describe('import history persistence', () => {
  it.each([
    [
      V1,
      JSON.stringify(['deadbeef', 'https://www.setlist.fm/setlist/a/b-ab12cd34.html']),
      [
        { input: 'deadbeef', setlistId: 'deadbeef' },
        { input: 'https://www.setlist.fm/setlist/a/b-ab12cd34.html', setlistId: 'ab12cd34' },
      ],
    ],
    [
      V2,
      JSON.stringify([{ input: 'saved input', setlistId: 'deadbeef' }, { ignored: true }]),
      [{ input: 'saved input', setlistId: 'deadbeef' }],
    ],
  ])('migrates %s data into a compact v3 history', (legacyKey, legacyValue, expected) => {
    localStorage.setItem(legacyKey, legacyValue);

    expect(readImportHistory()).toEqual(expected);
    expect(JSON.parse(localStorage.getItem(V3) ?? '[]')).toEqual(expected);
    expect(localStorage.getItem(V1)).toBeNull();
    expect(localStorage.getItem(V2)).toBeNull();
  });

  it('drops malformed or absent show data instead of exposing it as history', () => {
    localStorage.setItem(V3, '{not json');
    expect(readImportHistory()).toEqual([]);
    expect(localStorage.getItem(V3)).toBeNull();

    localStorage.setItem(V3, JSON.stringify([{ input: 'show only' }, null, 3]));
    expect(readImportHistory()).toEqual([]);
  });

  it('keeps newest unique items and persists at most eight entries', () => {
    const previous = Array.from({ length: 8 }, (_, index) => ({
      input: `input-${index}`,
      setlistId: `00000${index}`,
    }));
    const next = pushImportHistoryItem(previous, { input: 'input-3', setlistId: 'new-id' });

    expect(next).toHaveLength(8);
    expect(next[0]).toEqual({ input: 'input-3', setlistId: 'new-id' });
    expect(next.some((entry) => entry.input === 'input-3' && entry.setlistId !== 'new-id')).toBe(
      false
    );

    writeImportHistory([...next, { input: 'ninth', setlistId: 'ninth' }]);
    expect(JSON.parse(localStorage.getItem(V3) ?? '[]')).toHaveLength(8);
    clearImportHistory();
    expect(readImportHistory()).toEqual([]);
  });
});
