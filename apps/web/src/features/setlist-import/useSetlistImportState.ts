'use client';

import { useEffect, useRef, useState } from 'react';
import { mapSetlistFmToSetlist, parseSetlistIdFromInput } from '@repo/core';
import type { Setlist, SetlistFmResponse } from '@repo/core';
import { getErrorMessage, isOk, MAX_SETLIST_INPUT_LENGTH, SETLIST_MESSAGES } from '@repo/shared';
import { setlistProxyUrl } from '@/lib/api';
import { fetchApiJson } from '@/lib/fetch';
import {
  clearImportHistory,
  pushImportHistoryItem,
  readImportHistory,
  writeImportHistory,
  type ImportHistoryItem,
} from './importHistory';

export type { ImportHistoryItem };

export interface ImportError {
  message: string;
  code: 'invalid-input' | 'not-found' | 'rate-limit' | 'service' | 'network' | 'unknown';
  retryable: boolean;
  retryAfterSeconds?: number;
}

function includesAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term));
}

function classifyError(message: string): ImportError {
  const lower = message.toLowerCase();
  if (includesAny(lower, ['not found', '404'])) {
    return { message, code: 'not-found', retryable: false };
  }
  if (includesAny(lower, ['rate', '429', 'too many requests'])) {
    const retryAfter = lower.match(/(\d+)\s*(?:seconds?|s)\b/)?.[1];
    return {
      message,
      code: 'rate-limit',
      retryable: true,
      retryAfterSeconds: retryAfter ? Number(retryAfter) : undefined,
    };
  }
  if (includesAny(lower, ['unavailable', '503', '502'])) {
    return { message, code: 'service', retryable: true };
  }
  if (includesAny(lower, ['network', 'failed to fetch', 'load failed'])) {
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

const isAbortError = (value: unknown): boolean =>
  value instanceof DOMException && value.name === 'AbortError';

export function useSetlistImportState() {
  const [inputValue, setInputValueState] = useState('');
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ImportError | null>(null);
  const [history, setHistory] = useState<ImportHistoryItem[]>([]);
  const currentRequestRef = useRef(0);
  const requestCounterRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => setHistory(readImportHistory()), []);
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const validateInput = (): boolean => {
    const validationError = invalidInputError(inputValue);
    setError(validationError);
    return validationError === null;
  };

  const loadSetlist = async (rawValue: string): Promise<boolean> => {
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
        };
        setHistory((prev) => {
          const next = pushImportHistoryItem(prev, item);
          writeImportHistory(next);
          return next;
        });
        return true;
      }
      setError(classifyError(result.error));
      setSetlist(null);
      return false;
    } catch (caught) {
      if (isAbortError(caught)) return false;
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
  };

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
    clearImportHistory();
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
