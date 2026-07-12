'use client';

import { useRef, useState } from 'react';
import { Button } from '@repo/ui';
import { ErrorAlert } from '@/components/ErrorAlert';
import { StatusText } from '@/components/StatusText';
import { StepHeader } from '@/components/StepHeader';
import { MatchingView } from '@/features/matching/MatchingView';
import { CreatePlaylistView } from '@/features/playlist-export/CreatePlaylistView';
import { SetlistPreview } from './SetlistPreview';
import { useFlowState } from './useFlowState';
import { useSetlistImportState, type ImportHistoryItem } from './useSetlistImportState';

export function SetlistImportView() {
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [historyAnnouncement, setHistoryAnnouncement] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const {
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
  } = useSetlistImportState();
  const {
    step,
    matchRows,
    stepContainerRef,
    goToPreview,
    goToMatching,
    goToExport,
    goBackToPreview,
    goBackToMatching,
    updateMatchDraft,
    startAnotherSetlist,
  } = useFlowState();

  function focusInvalidInput() {
    window.requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault();
    setSubmissionError(null);
    if (!validateInput()) {
      focusInvalidInput();
      return;
    }
    void loadSetlist(inputValue)
      .then((ok) => {
        if (ok) goToPreview();
      })
      .catch(() => {
        setSubmissionError('Unable to load the setlist. Please try again.');
      });
  }

  function handleSelectHistoryItem(item: ImportHistoryItem): void {
    setSubmissionError(null);
    void selectHistoryItem(item)
      .then((ok) => {
        if (ok) goToPreview();
      })
      .catch(() => {
        setSubmissionError('Unable to load the setlist. Please try again.');
      });
  }

  const handleStartAnother = (): void => {
    resetForAnother();
    startAnotherSetlist();
  };

  if (step === 'matching' && setlist) {
    return (
      <section className="workflow-section" aria-label="Match songs">
        <StepHeader
          step={3}
          title="Match songs"
          context={`${setlist.artist}${setlist.venue ? ` at ${setlist.venue}` : ''}`}
          headingRef={stepContainerRef}
        />
        <Button variant="secondary" onClick={goBackToPreview} className="back-button">
          Back to preview
        </Button>
        <MatchingView
          setlist={setlist}
          initialDraft={matchRows}
          onMatchesChange={updateMatchDraft}
          onProceedToCreatePlaylist={goToExport}
        />
      </section>
    );
  }

  if (step === 'export' && setlist && matchRows) {
    return (
      <section className="workflow-section" aria-label="Export playlist">
        <StepHeader
          step={4}
          title="Save to Apple Music"
          context={`${setlist.artist} · ${matchRows.filter((row) => row.appleTrack).length} selected`}
          headingRef={stepContainerRef}
        />
        <CreatePlaylistView
          setlist={setlist}
          matchRows={matchRows}
          onBack={goBackToMatching}
          onStartAnother={handleStartAnother}
        />
      </section>
    );
  }

  if (step === 'preview' && setlist) {
    const songCount = setlist.sets.reduce((count, set) => count + set.length, 0);
    return (
      <section className="workflow-section" aria-label="Review setlist">
        <StepHeader
          step={2}
          title="Review setlist"
          context="Confirm the show and song order before matching."
          headingRef={stepContainerRef}
        />
        <SetlistPreview setlist={setlist} />
        <div className="step-actions">
          <Button variant="secondary" onClick={startAnotherSetlist}>
            Change setlist
          </Button>
          <Button onClick={goToMatching} disabled={songCount === 0}>
            Match songs on Apple Music
          </Button>
        </div>
      </section>
    );
  }

  const displayedError = error?.message ?? submissionError;
  const retryable = error?.retryable ?? Boolean(submissionError);

  return (
    <section className="workflow-section import-section" aria-label="Import setlist">
      <StepHeader
        step={1}
        title="Find a setlist"
        context="Paste a setlist.fm link or enter its setlist ID."
        headingRef={stepContainerRef}
      />
      <ol className="workflow-orientation" aria-label="How it works">
        <li>Import the concert setlist.</li>
        <li>Confirm the show and song order.</li>
        <li>Review the Apple Music matches.</li>
        <li>Create the playlist in your library.</li>
      </ol>

      <form onSubmit={handleSubmit} className="import-form" noValidate>
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
            onChange={(event) => {
              setInputValue(event.target.value);
            }}
            onBlur={() => inputValue.trim() && validateInput()}
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
            <Button type="button" variant="secondary" onClick={cancelLoad}>
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
            onRetry={
              retryable
                ? () => {
                    void retryLast().then((ok) => {
                      if (ok) goToPreview();
                    });
                  }
                : undefined
            }
            retryLabel="Retry load setlist"
          />
        </div>
      ) : null}

      {history.length > 0 ? (
        <section className="history-section" aria-labelledby="history-title">
          <div className="history-header">
            <h3 id="history-title">Recent imports</h3>
            <Button
              variant="secondary"
              className="button--compact"
              onClick={() => {
                clearHistory();
                setHistoryAnnouncement('Recent imports cleared.');
              }}
            >
              Clear history
            </Button>
          </div>
          <ul className="history-list">
            {history.map((item) => (
              <li key={`${item.setlistId}:${item.input}`}>
                <button
                  type="button"
                  className="history-item-button"
                  onClick={() => {
                    handleSelectHistoryItem(item);
                  }}
                >
                  <strong>{item.artist}</strong>
                  <span>
                    {[item.venue, item.date].filter(Boolean).join(' · ') || item.setlistId}
                  </span>
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
