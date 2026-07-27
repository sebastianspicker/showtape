'use client';

import type { FormEvent, RefObject } from 'react';
import { Button } from '@repo/ui';
import { ErrorAlert } from '@/components/ErrorAlert';
import { StatusText } from '@/components/StatusText';
import { StepHeader } from '@/components/StepHeader';
import type { ImportHistoryItem } from './useSetlistImportState';

export interface ImportStepProps {
  inputValue: string;
  setInputValue: (value: string) => void;
  loading: boolean;
  displayedError: string | null;
  retryable: boolean;
  history: ImportHistoryItem[];
  historyAnnouncement: string;
  inputRef: RefObject<HTMLInputElement | null>;
  headingRef: RefObject<HTMLElement | null>;
  onSubmit: (event: FormEvent) => void;
  onValidateInput: () => boolean;
  onCancelLoad: () => void;
  onRetry: () => void;
  onSelectHistoryItem: (item: ImportHistoryItem) => void;
  onClearHistory: () => void;
}

export function ImportStep({
  inputValue,
  setInputValue,
  loading,
  displayedError,
  retryable,
  history,
  historyAnnouncement,
  inputRef,
  headingRef,
  onSubmit,
  onValidateInput,
  onCancelLoad,
  onRetry,
  onSelectHistoryItem,
  onClearHistory,
}: ImportStepProps) {
  return (
    <section className="workflow-section import-section" aria-label="Import setlist">
      <StepHeader
        step={1}
        title="Import a setlist"
        stageLabel="Step 1 of 4 · Start with a show"
        context="Paste a setlist.fm link or enter its setlist ID."
        headingRef={headingRef}
      />

      <div className="workflow-orientation-panel" aria-labelledby="workflow-orientation-title">
        <h3 id="workflow-orientation-title">How it works</h3>
        <ol className="workflow-orientation">
          <li>Import the concert setlist.</li>
          <li>Confirm the show and song order.</li>
          <li>Review the Apple Music matches.</li>
          <li>Create the playlist in your library.</li>
        </ol>
      </div>

      <form onSubmit={onSubmit} className="import-form" noValidate>
        <div className="import-input-wrap">
          <label htmlFor="setlist-input" className="input-label">
            Setlist URL or ID
          </label>
          <input
            ref={inputRef}
            id="setlist-input"
            type="text"
            className="input"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onBlur={() => inputValue.trim() && onValidateInput()}
            placeholder="setlist.fm URL or 63de4613"
            disabled={loading}
            aria-invalid={Boolean(displayedError)}
            aria-describedby={displayedError ? 'setlist-error' : 'setlist-hint'}
          />
          {!displayedError ? (
            <p id="setlist-hint" className="input-hint">
              Example ID: <code>63de4613</code>
            </p>
          ) : null}
        </div>
        <div className="import-actions">
          <Button type="submit" loading={loading} loadingChildren="Fetching setlist…">
            Load setlist
          </Button>
          {loading ? (
            <Button type="button" variant="secondary" onClick={onCancelLoad}>
              Cancel
            </Button>
          ) : null}
        </div>
      </form>

      {loading ? <StatusText>Loading setlist…</StatusText> : null}
      {displayedError ? (
        <div id="setlist-error">
          <ErrorAlert
            message={displayedError}
            onRetry={retryable ? onRetry : undefined}
            retryLabel="Retry load setlist"
          />
        </div>
      ) : null}

      {history.length > 0 ? (
        <section className="history-section" aria-labelledby="history-title">
          <div className="history-header">
            <h3 id="history-title">Recent imports</h3>
            <Button variant="secondary" className="button--compact" onClick={onClearHistory}>
              Clear history
            </Button>
          </div>
          <ul className="history-list">
            {history.map((item) => (
              <li key={`${item.setlistId}:${item.input}`}>
                <button
                  type="button"
                  className="history-item-button"
                  onClick={() => onSelectHistoryItem(item)}
                >
                  <strong>Setlist {item.setlistId}</strong>
                  <span>{item.input === item.setlistId ? 'Setlist ID' : item.input}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <span className="sr-only" role="status" aria-live="polite">
        {historyAnnouncement}
      </span>
    </section>
  );
}
