'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type RefObject,
} from 'react';
import { isOk } from '@/contracts/api';
import type { Setlist } from '@/domain/setlist';
import { getErrorMessage } from '@/ui/error-message';
import { requestSetlist } from '@/client/showtape-api';
import {
  clearImportHistory,
  pushImportHistoryItem,
  readImportHistory,
  writeImportHistory,
  type ImportHistoryItem,
} from './importHistory';
import {
  classifyImportError,
  formatImportError,
  getInvalidInputError,
  isAbortError,
  LOAD_FAILURE,
  networkImportError,
  type ImportError,
} from './importErrors';

const subscribeToHydration = () => () => {};

export interface UseSetlistImportParams {
  /** Called after a setlist loaded successfully from a submit, retry, or history item. */
  onLoaded: () => void;
  /** Called when the user goes back to import, with or without clearing it. */
  onRestart: () => void;
}

export interface SetlistImport {
  inputValue: string;
  setInputValue: (value: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  setlist: Setlist | null;
  loading: boolean;
  /** User-facing error text, including retry guidance. */
  displayedError: string | null;
  retryable: boolean;
  history: ImportHistoryItem[];
  historyAnnouncement: string;
  validateInput: () => boolean;
  submit: (event: FormEvent) => void;
  retry: () => void;
  selectHistoryItem: (item: ImportHistoryItem) => void;
  clearHistory: () => void;
  cancel: () => void;
  /** Return to import keeping the input and the loaded setlist. */
  backToImport: () => void;
  /** Return to import with a cleared input and no setlist. */
  reset: () => void;
}

/** Owns the input, the loaded setlist, its errors, and the recent-import history. */
export function useSetlistImport({ onLoaded, onRestart }: UseSetlistImportParams): SetlistImport {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false
  );
  const [inputValue, setInputValueState] = useState('');
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ImportError | null>(null);
  const [initialHistory] = useState(readImportHistory);
  const [history, setHistory] = useState<ImportHistoryItem[]>(initialHistory);
  const [historyAnnouncement, setHistoryAnnouncement] = useState('');
  const historyRef = useRef(initialHistory);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentRequestRef = useRef(0);
  const requestCounterRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    currentRequestRef.current = 0;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setLoading(false);
  }, []);

  useEffect(() => cancel, [cancel]);

  const recordImport = useCallback((item: ImportHistoryItem) => {
    const next = pushImportHistoryItem(historyRef.current, item);
    historyRef.current = next;
    setHistory(next);
    writeImportHistory(next);
  }, []);

  const load = useCallback(
    async (rawValue: string): Promise<boolean> => {
      const trimmed = rawValue.trim();
      const validationError = getInvalidInputError(trimmed);
      setError(validationError);
      if (validationError) return false;

      const requestId = ++requestCounterRef.current;
      currentRequestRef.current = requestId;
      abortControllerRef.current?.abort();
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      setLoading(true);
      try {
        const result = await requestSetlist(trimmed, { signal: abortController.signal });
        if (currentRequestRef.current !== requestId) return false;
        if (!isOk(result)) {
          setError(classifyImportError(result.error));
          setSetlist(null);
          return false;
        }
        setSetlist(result.value);
        recordImport({ input: trimmed, setlistId: result.value.id });
        return true;
      } catch (caught) {
        if (isAbortError(caught) || currentRequestRef.current !== requestId) return false;
        setError(networkImportError(getErrorMessage(caught, 'Network error.')));
        setSetlist(null);
        return false;
      } finally {
        if (currentRequestRef.current === requestId) cancel();
      }
    },
    [cancel, recordImport]
  );

  const loadAndAdvance = (value: string): void => {
    void load(value)
      .then((ok) => {
        if (ok) onLoaded();
      })
      .catch(() => {
        setError((current) => current ?? LOAD_FAILURE);
      });
  };

  const validateInput = (): boolean => {
    const validationError = getInvalidInputError(inputValue);
    setError(validationError);
    return validationError === null;
  };

  return {
    inputValue,
    setInputValue: (value) => {
      setInputValueState(value);
      setError(null);
    },
    inputRef,
    setlist,
    loading,
    displayedError: formatImportError(error),
    retryable: error?.retryable ?? false,
    history: hydrated ? history : [],
    historyAnnouncement,
    validateInput,
    submit: (event) => {
      event.preventDefault();
      if (!validateInput()) {
        window.requestAnimationFrame(() => inputRef.current?.focus());
        return;
      }
      loadAndAdvance(inputValue);
    },
    retry: () => {
      loadAndAdvance(inputValue);
    },
    selectHistoryItem: (item) => {
      setInputValueState(item.input);
      loadAndAdvance(item.input);
    },
    clearHistory: () => {
      historyRef.current = [];
      setHistory([]);
      clearImportHistory();
      setHistoryAnnouncement('Recent imports cleared.');
    },
    cancel,
    backToImport: onRestart,
    reset: () => {
      cancel();
      setInputValueState('');
      setSetlist(null);
      setError(null);
      onRestart();
    },
  };
}
