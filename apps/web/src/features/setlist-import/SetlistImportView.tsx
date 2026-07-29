'use client';

import { type ReactNode, useRef, useState } from 'react';
import { Button } from '@repo/ui';
import { SetlistAttribution } from '@/components/SetlistAttribution';
import { StepHeader } from '@/components/StepHeader';
import { WorkflowRail } from '@/components/WorkflowRail';
import { MatchingView } from '@/features/matching/MatchingView';
import { CreatePlaylistView } from '@/features/playlist-export/CreatePlaylistView';
import { ImportStep } from './ImportStep';
import { PreviewStep } from './PreviewStep';
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
      .catch(() => setSubmissionError('Unable to load the setlist. Please try again.'));
  }

  function handleSelectHistoryItem(item: ImportHistoryItem): void {
    setSubmissionError(null);
    void selectHistoryItem(item)
      .then((ok) => {
        if (ok) goToPreview();
      })
      .catch(() => setSubmissionError('Unable to load the setlist. Please try again.'));
  }

  function handleStartAnother(): void {
    resetForAnother();
    startAnotherSetlist();
  }

  function handleClearHistory(): void {
    clearHistory();
    setHistoryAnnouncement('Recent imports cleared.');
  }

  function handleRetry(): void {
    void retryLast().then((ok) => {
      if (ok) goToPreview();
    });
  }

  const displayedError = error?.message ?? submissionError;
  const retryable = error?.retryable ?? Boolean(submissionError);
  const stepNumber = step === 'preview' ? 2 : step === 'matching' ? 3 : step === 'export' ? 4 : 1;
  let stageContent: ReactNode;

  if (step === 'matching' && setlist) {
    stageContent = (
      <section className="workflow-section" aria-label="Confirm each song">
        <StepHeader
          step={3}
          title="Confirm each song"
          stageLabel="Step 3 of 4 · Match catalog tracks"
          context={`${setlist.artist}${setlist.venue ? ` at ${setlist.venue}` : ''}`}
          headingRef={stepContainerRef}
        />
        <Button variant="secondary" onClick={goBackToPreview} className="back-button">
          Back to preview
        </Button>
        <SetlistAttribution sourceUrl={setlist.sourceUrl} />
        <MatchingView
          setlist={setlist}
          initialDraft={matchRows}
          onMatchesChange={updateMatchDraft}
          onProceedToCreatePlaylist={goToExport}
        />
      </section>
    );
  } else if (step === 'export' && setlist && matchRows) {
    stageContent = (
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
        <SetlistAttribution sourceUrl={setlist.sourceUrl} />
      </section>
    );
  } else if (step === 'preview' && setlist) {
    stageContent = (
      <PreviewStep
        setlist={setlist}
        headingRef={stepContainerRef}
        onChangeSetlist={startAnotherSetlist}
        onMatchSongs={goToMatching}
      />
    );
  } else {
    stageContent = (
      <ImportStep
        inputValue={inputValue}
        setInputValue={setInputValue}
        loading={loading}
        displayedError={displayedError}
        retryable={retryable}
        history={history}
        historyAnnouncement={historyAnnouncement}
        inputRef={inputRef}
        headingRef={stepContainerRef}
        onSubmit={handleSubmit}
        onValidateInput={validateInput}
        onCancelLoad={cancelLoad}
        onRetry={handleRetry}
        onSelectHistoryItem={handleSelectHistoryItem}
        onClearHistory={handleClearHistory}
      />
    );
  }

  return (
    <div className={`workflow-shell workflow-shell--${step}`}>
      <WorkflowRail currentStep={stepNumber} />
      <div className={`workflow-stage workflow-stage--${step}`}>{stageContent}</div>
    </div>
  );
}
