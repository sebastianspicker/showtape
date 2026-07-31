'use client';

import { useEffect, useState } from 'react';
import type { Setlist } from '@repo/core';
import { readImportHistory, type ImportHistoryItem } from './importHistory';
import { type ImportError } from './setlistImportErrors';
import { useSetlistImportControls } from './useSetlistImportControls';
import { useSetlistLoader } from './useSetlistLoader';

export type { ImportHistoryItem };
export type { ImportError } from './setlistImportErrors';

export function useSetlistImportState() {
  const [inputValue, setInputValueState] = useState('');
  const [setlist, setSetlist] = useState<Setlist | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ImportError | null>(null);
  const [history, setHistory] = useState<ImportHistoryItem[]>(() => readImportHistory());
  const { cancelLoad, loadSetlist } = useSetlistLoader({
    setSetlist,
    setLoading,
    setError,
    setHistory,
  });
  const controls = useSetlistImportControls({
    inputValue,
    setInputValueState,
    setSetlist,
    setError,
    setHistory,
    loadSetlist,
    cancelLoad,
  });

  useEffect(() => {
    return () => {
      cancelLoad();
    };
  }, [cancelLoad]);

  return {
    inputValue,
    setInputValue: controls.setInputValue,
    setlist,
    loading,
    error,
    history,
    loadSetlist,
    validateInput: controls.validateInput,
    cancelLoad,
    retryLast: controls.retryLast,
    selectHistoryItem: controls.selectHistoryItem,
    clearHistory: controls.clearHistory,
    resetForAnother: controls.resetForAnother,
  };
}
