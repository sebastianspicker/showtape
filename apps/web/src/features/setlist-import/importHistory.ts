import { parseSetlistIdFromInput } from '@repo/core';

const HISTORY_V1_KEY = 'setlist_import_history_v1';
const HISTORY_V2_KEY = 'setlist_import_history_v2';
const HISTORY_V3_KEY = 'setlist_import_history_v3';
const MAX_HISTORY_ITEMS = 8;

export interface ImportHistoryItem {
  input: string;
  setlistId: string;
}

function isHistoryItem(value: unknown): value is ImportHistoryItem {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.input === 'string' && typeof record.setlistId === 'string';
}

function clearLegacyHistory(): void {
  try {
    window.localStorage.removeItem(HISTORY_V1_KEY);
    window.localStorage.removeItem(HISTORY_V2_KEY);
  } catch {
    // Migrating legacy history is best effort when storage access is blocked.
  }
}

export function clearImportHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(HISTORY_V1_KEY);
    window.localStorage.removeItem(HISTORY_V2_KEY);
    window.localStorage.removeItem(HISTORY_V3_KEY);
  } catch {
    // Clearing optional browser history is best effort.
  }
}

export function writeImportHistory(next: ImportHistoryItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HISTORY_V3_KEY, JSON.stringify(next.slice(0, MAX_HISTORY_ITEMS)));
  } catch {
    // History is optional; storage can be unavailable or full.
  }
}

export function readImportHistory(): ImportHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const v3Raw = window.localStorage.getItem(HISTORY_V3_KEY);
    if (v3Raw) {
      const parsed = JSON.parse(v3Raw) as unknown;
      if (!Array.isArray(parsed)) {
        clearImportHistory();
        return [];
      }
      clearLegacyHistory();
      return parsed.filter(isHistoryItem).slice(0, MAX_HISTORY_ITEMS);
    }

    const v2Raw = window.localStorage.getItem(HISTORY_V2_KEY);
    if (v2Raw) {
      const parsed = JSON.parse(v2Raw) as unknown;
      if (!Array.isArray(parsed)) {
        clearLegacyHistory();
        return [];
      }
      const migrated = parsed
        .filter(isHistoryItem)
        .map(({ input, setlistId }) => ({ input, setlistId }))
        .slice(0, MAX_HISTORY_ITEMS);
      writeImportHistory(migrated);
      clearLegacyHistory();
      return migrated;
    }

    const v1Raw = window.localStorage.getItem(HISTORY_V1_KEY);
    if (!v1Raw) return [];
    const parsed = JSON.parse(v1Raw) as unknown;
    if (!Array.isArray(parsed)) {
      clearLegacyHistory();
      return [];
    }
    const migrated = parsed
      .filter((value): value is string => typeof value === 'string')
      .map((input) => ({
        input,
        setlistId: parseSetlistIdFromInput(input) ?? input,
      }))
      .slice(0, MAX_HISTORY_ITEMS);
    writeImportHistory(migrated);
    clearLegacyHistory();
    return migrated;
  } catch {
    clearImportHistory();
    return [];
  }
}

export function pushImportHistoryItem(
  prev: ImportHistoryItem[],
  item: ImportHistoryItem
): ImportHistoryItem[] {
  const deduped = [
    item,
    ...prev.filter((entry) => entry.setlistId !== item.setlistId && entry.input !== item.input),
  ];
  return deduped.slice(0, MAX_HISTORY_ITEMS);
}
