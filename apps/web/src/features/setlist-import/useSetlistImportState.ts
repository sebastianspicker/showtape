'use client';

import { useEffect, useRef, useState } from 'react';
import { mapSetlistFmToSetlist, parseSetlistIdFromInput } from '@repo/core';
import type { Setlist, SetlistFmResponse } from '@repo/core';
import { getErrorMessage, isOk, MAX_SETLIST_INPUT_LENGTH, SETLIST_MESSAGES } from '@repo/shared';
import { setlistProxyUrl } from '@/lib/api';
import { fetchApiJson } from '@/lib/fetch';

const HISTORY_V1_KEY = 'setlist_import_history_v1';
const HISTORY_V2_KEY = 'setlist_import_history_v2';
const MAX_HISTORY_ITEMS = 8;

export interface ImportHistoryItem {
  input: string;
  setlistId: string;
  artist: string;
  venue?: string;
  date?: string;
}

export interface ImportError {
  message: string;
  code: 'invalid-input' | 'not-found' | 'rate-limit' | 'service' | 'network' | 'unknown';
  retryable: boolean;
  retryAfterSeconds?: number;
}

function isHistoryItem(value: unknown): value is ImportHistoryItem {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.input === 'string' &&
    typeof record.setlistId === 'string' &&
    typeof record.artist === 'string'
  );
}

function readHistory(): ImportHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const v2Raw = window.localStorage.getItem(HISTORY_V2_KEY);
    if (v2Raw) {
      const parsed = JSON.parse(v2Raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isHistoryItem).slice(0, MAX_HISTORY_ITEMS);
    }

    const v1Raw = window.localStorage.getItem(HISTORY_V1_KEY);
    if (!v1Raw) return [];
    const parsed = JSON.parse(v1Raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const migrated = parsed
      .filter((value): value is string => typeof value === 'string')
      .map((input) => ({
        input,
        setlistId: parseSetlistIdFromInput(input) ?? input,
        artist: 'Previously imported setlist',
      }))
      .slice(0, MAX_HISTORY_ITEMS);
    writeHistory(migrated);
    return migrated;
  } catch {
    return [];
  }
}

function writeHistory(next: ImportHistoryItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HISTORY_V2_KEY, JSON.stringify(next.slice(0, MAX_HISTORY_ITEMS)));
  } catch {
    // History is optional; storage can be unavailable or full.
  }
}

function pushHistory(prev: ImportHistoryItem[], item: ImportHistoryItem): ImportHistoryItem[] {
  const deduped = [
    item,
    ...prev.filter((entry) => entry.setlistId !== item.setlistId && entry.input !== item.input),
  ];
  return deduped.slice(0, MAX_HISTORY_ITEMS);
}

function classifyError(message: string): ImportError {
  const lower = message.toLowerCase();
  if (lower.includes('not found') || lower.includes('404')) {
    return { message, code: 'not-found', retryable: false };
  }
  if (lower.includes('rate') || lower.includes('429')) {
    const retryAfter = lower.match(/(\d+)\s*(?:seconds?|s)\b/)?.[1];
    return {
      message,
      code: 'rate-limit',
      retryable: true,
      retryAfterSeconds: retryAfter ? Number(retryAfter) : undefined,
    };
  }
  if (lower.includes('unavailable') || lower.includes('503') || lower.includes('502')) {
    return { message, code: 'service', retryable: true };
  }
  if (
    lower.includes('network') ||
    lower.includes('failed to fetch') ||
    lower.includes('load failed')
  ) {
    return { message, code: 'network', retryable: true };
  }
  return { message, code: 'unknown', retryable: false };
}

function invalidInputError(value: string): ImportError | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return {
      message: 'Enter a setlist.fm URL or setlist ID.',
      code: 'invalid-input',
      retryable: false,
    };
  }
  if (trimmed.length > MAX_SETLIST_INPUT_LENGTH) {
    return { message: SETLIST_MESSAGES.INPUT_TOO_LONG, code: 'invalid-input', retryable: false };
  }
  if (!parseSetlistIdFromInput(trimmed)) {
    return {
      message: 'Enter a valid setlist.fm URL or a 4–12 character hexadecimal setlist ID.',
      code: 'invalid-input',
      retryable: false,
    };
  }
  return null;
}

export function useSetlistImportState() {
  const [inputValue, setInputValueState] = useState('');
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ImportError | null>(null);
  const [history, setHistory] = useState<ImportHistoryItem[]>([]);
  const currentRequestRef = useRef(0);
  const requestCounterRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => setHistory(readHistory()), []);
  useEffect(() => () => abortControllerRef.current?.abort(), []);

  function validateInput(value = inputValue): boolean {
    const validationError = invalidInputError(value);
    setError(validationError);
    return validationError === null;
  }

  async function loadSetlist(rawValue: string): Promise<boolean> {
    const trimmed = rawValue.trim();
    const validationError = invalidInputError(trimmed);
    setError(validationError);
    if (validationError) return false;

    const requestId = ++requestCounterRef.current;
    currentRequestRef.current = requestId;
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setLoading(true);
    try {
      const url = setlistProxyUrl(`id=${encodeURIComponent(trimmed)}`);
      const result = await fetchApiJson<SetlistFmResponse>(url, { signal: abortController.signal });
      if (currentRequestRef.current !== requestId) return false;

      if (isOk(result)) {
        const mapped = mapSetlistFmToSetlist(result.value);
        setSetlist(mapped);
        const item: ImportHistoryItem = {
          input: trimmed,
          setlistId: mapped.id,
          artist: mapped.artist,
          venue: mapped.venue,
          date: mapped.eventDate,
        };
        setHistory((prev) => {
          const next = pushHistory(prev, item);
          writeHistory(next);
          return next;
        });
        return true;
      }
      setError(classifyError(result.error));
      setSetlist(null);
      return false;
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return false;
      if (currentRequestRef.current !== requestId) return false;
      setError(classifyError(getErrorMessage(caught, 'Network error.')));
      setSetlist(null);
      return false;
    } finally {
      if (currentRequestRef.current === requestId) {
        setLoading(false);
        currentRequestRef.current = 0;
        abortControllerRef.current = null;
      }
    }
  }

  function cancelLoad() {
    currentRequestRef.current = 0;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setLoading(false);
  }

  function retryLast(): Promise<boolean> {
    return loadSetlist(inputValue);
  }

  function setInputValue(value: string) {
    setInputValueState(value);
    setError(null);
  }

  async function selectHistoryItem(item: ImportHistoryItem): Promise<boolean> {
    setInputValueState(item.input);
    return loadSetlist(item.input);
  }

  function clearHistory() {
    setHistory([]);
    try {
      window.localStorage.removeItem(HISTORY_V1_KEY);
      window.localStorage.removeItem(HISTORY_V2_KEY);
    } catch {
      // Clearing history is best effort when storage access is blocked.
    }
  }

  function resetForAnother() {
    cancelLoad();
    setInputValueState('');
    setSetlist(null);
    setError(null);
  }

  return {
    inputValue,
    setInputValue,
    setlist,
    loading,
    error,
    history,
    loadSetlist,
    validateInput,
    cancelLoad,
    retryLast,
    selectHistoryItem,
    clearHistory,
    resetForAnother,
  };
}
