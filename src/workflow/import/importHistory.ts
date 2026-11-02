// Pre-v3 formats are no longer read; clearing still drops their stale keys.
const HISTORY_V1_STORAGE_ENTRY = 'setlist_import_history_v1';
const HISTORY_V2_STORAGE_ENTRY = 'setlist_import_history_v2';
const HISTORY_V3_STORAGE_ENTRY = 'setlist_import_history_v3';
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

export function clearImportHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(HISTORY_V1_STORAGE_ENTRY);
    window.localStorage.removeItem(HISTORY_V2_STORAGE_ENTRY);
    window.localStorage.removeItem(HISTORY_V3_STORAGE_ENTRY);
  } catch {
    // Clearing optional browser history is best effort.
  }
}

export function writeImportHistory(next: ImportHistoryItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      HISTORY_V3_STORAGE_ENTRY,
      JSON.stringify(next.slice(0, MAX_HISTORY_ITEMS))
    );
  } catch {
    // History is optional; storage can be unavailable or full.
  }
}

function parseHistoryArray(raw: string): unknown[] | null {
  const parsed = JSON.parse(raw) as unknown;
  return Array.isArray(parsed) ? parsed : null;
}

function readV3History(raw: string): ImportHistoryItem[] {
  const parsed = parseHistoryArray(raw);
  if (!parsed) {
    clearImportHistory();
    return [];
  }
  return parsed.filter(isHistoryItem).slice(0, MAX_HISTORY_ITEMS);
}

export function readImportHistory(): ImportHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const v3Raw = window.localStorage.getItem(HISTORY_V3_STORAGE_ENTRY);
    return v3Raw ? readV3History(v3Raw) : [];
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
