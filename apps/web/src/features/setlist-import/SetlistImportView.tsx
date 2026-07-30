'use client';

import { type ReactNode, type RefObject, useRef, useState } from 'react';
import { Button } from '@repo/ui';
import type { Setlist } from '@repo/core';
import { SetlistAttribution } from '@/components/SetlistAttribution';
import { StepHeader } from '@/components/StepHeader';
import { WorkflowRail } from '@/components/WorkflowRail';
import { MatchingView } from '@/features/matching/MatchingView';
import type { MatchRow } from '@/features/matching/types';
import { CreatePlaylistView } from '@/features/playlist-export/CreatePlaylistView';
import { ImportStep, type ImportStepProps } from './ImportStep';
import { PreviewStep } from './PreviewStep';
import { type FlowStep, type UseFlowStateResult, useFlowState } from './useFlowState';
import { useSetlistImportState, type ImportHistoryItem } from './useSetlistImportState';

type SetlistImportState = ReturnType<typeof useSetlistImportState>;

const STEP_NUMBERS: Record<FlowStep, number> = {
  import: 1,
  preview: 2,
  matching: 3,
  export: 4,
};

interface ImportStageProps {
  state: SetlistImportState;
  displayedError: string | null;
  retryable: boolean;
  historyAnnouncement: string;
  inputRef: RefObject<HTMLInputElement | null>;
  headingRef: RefObject<HTMLElement | null>;
  onSubmit: ImportStepProps['onSubmit'];
  onRetry: ImportStepProps['onRetry'];
  onSelectHistoryItem: ImportStepProps['onSelectHistoryItem'];
  onClearHistory: ImportStepProps['onClearHistory'];
}

function ImportStage({
  state,
  displayedError,
  retryable,
  historyAnnouncement,
  inputRef,
  headingRef,
  onSubmit,
  onRetry,
  onSelectHistoryItem,
  onClearHistory,
}: ImportStageProps) {
  return (
    <ImportStep
      inputValue={state.inputValue}
      setInputValue={state.setInputValue}
      loading={state.loading}
      displayedError={displayedError}
      retryable={retryable}
      history={state.history}
      historyAnnouncement={historyAnnouncement}
      inputRef={inputRef}
      headingRef={headingRef}
      onSubmit={onSubmit}
      onValidateInput={state.validateInput}
      onCancelLoad={state.cancelLoad}
      onRetry={onRetry}
      onSelectHistoryItem={onSelectHistoryItem}
      onClearHistory={onClearHistory}
    />
  );
}

interface WorkflowStageProps {
  step: FlowStep;
  setlist: Setlist | null;
  matchRows: MatchRow[] | null;
  stepContainerRef: RefObject<HTMLElement | null>;
  goToMatching: UseFlowStateResult['goToMatching'];
  goToExport: UseFlowStateResult['goToExport'];
  goBackToPreview: UseFlowStateResult['goBackToPreview'];
  goBackToMatching: UseFlowStateResult['goBackToMatching'];
  updateMatchDraft: UseFlowStateResult['updateMatchDraft'];
  startAnotherSetlist: UseFlowStateResult['startAnotherSetlist'];
  importContent: ReactNode;
  onStartAnother: UseFlowStateResult['startAnotherSetlist'];
}

interface MatchingStageProps {
  setlist: Setlist | null;
  matchRows: MatchRow[] | null;
  stepContainerRef: RefObject<HTMLElement | null>;
  goToExport: UseFlowStateResult['goToExport'];
  goBackToPreview: UseFlowStateResult['goBackToPreview'];
  updateMatchDraft: UseFlowStateResult['updateMatchDraft'];
}

function MatchingStage({
  setlist,
  matchRows,
  stepContainerRef,
  goToExport,
  goBackToPreview,
  updateMatchDraft,
}: MatchingStageProps) {
  if (!setlist) return null;

  return (
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
}

interface ExportStageProps {
  setlist: Setlist | null;
  matchRows: MatchRow[] | null;
  stepContainerRef: RefObject<HTMLElement | null>;
  goBackToMatching: UseFlowStateResult['goBackToMatching'];
  onStartAnother: UseFlowStateResult['startAnotherSetlist'];
}

function ExportStage({
  setlist,
  matchRows,
  stepContainerRef,
  goBackToMatching,
  onStartAnother,
}: ExportStageProps) {
  if (!setlist || !matchRows) return null;

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
        onStartAnother={onStartAnother}
      />
      <SetlistAttribution sourceUrl={setlist.sourceUrl} />
    </section>
  );
}

interface PreviewStageProps {
  setlist: Setlist | null;
  stepContainerRef: RefObject<HTMLElement | null>;
  goToMatching: UseFlowStateResult['goToMatching'];
  startAnotherSetlist: UseFlowStateResult['startAnotherSetlist'];
}

function PreviewStage({
  setlist,
  stepContainerRef,
  goToMatching,
  startAnotherSetlist,
}: PreviewStageProps) {
  if (!setlist) return null;

  return (
    <PreviewStep
      setlist={setlist}
      headingRef={stepContainerRef}
      onChangeSetlist={startAnotherSetlist}
      onMatchSongs={goToMatching}
    />
  );
}

function WorkflowStage({
  step,
  setlist,
  matchRows,
  importContent,
  ...stageProps
}: WorkflowStageProps): ReactNode {
  if (step === 'matching' && setlist) {
    return <MatchingStage setlist={setlist} matchRows={matchRows} {...stageProps} />;
  }
  if (step === 'export' && setlist && matchRows) {
    return <ExportStage setlist={setlist} matchRows={matchRows} {...stageProps} />;
  }
  if (step === 'preview' && setlist) {
    return <PreviewStage setlist={setlist} {...stageProps} />;
  }
  return importContent;
}

export function SetlistImportView() {
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [historyAnnouncement, setHistoryAnnouncement] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const importState = useSetlistImportState();
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
    if (!importState.validateInput()) {
      focusInvalidInput();
      return;
    }
    void importState
      .loadSetlist(importState.inputValue)
      .then((ok) => {
        if (ok) goToPreview();
      })
      .catch(() => setSubmissionError('Unable to load the setlist. Please try again.'));
  }

  function handleSelectHistoryItem(item: ImportHistoryItem): void {
    setSubmissionError(null);
    void importState
      .selectHistoryItem(item)
      .then((ok) => {
        if (ok) goToPreview();
      })
      .catch(() => setSubmissionError('Unable to load the setlist. Please try again.'));
  }

  function handleStartAnother(): void {
    importState.resetForAnother();
    startAnotherSetlist();
  }

  function handleClearHistory(): void {
    importState.clearHistory();
    setHistoryAnnouncement('Recent imports cleared.');
  }

  function handleRetry(): void {
    void importState.retryLast().then((ok) => {
      if (ok) goToPreview();
    });
  }

  const displayedError = importState.error?.message ?? submissionError;
  const retryable = importState.error?.retryable ?? Boolean(submissionError);
  const stepNumber = STEP_NUMBERS[step];
  const importContent = (
    <ImportStage
      state={importState}
      displayedError={displayedError}
      retryable={retryable}
      historyAnnouncement={historyAnnouncement}
      inputRef={inputRef}
      headingRef={stepContainerRef}
      onSubmit={handleSubmit}
      onRetry={handleRetry}
      onSelectHistoryItem={handleSelectHistoryItem}
      onClearHistory={handleClearHistory}
    />
  );

  return (
    <div className={`workflow-shell workflow-shell--${step}`}>
      <WorkflowRail currentStep={stepNumber} />
      <div className={`workflow-stage workflow-stage--${step}`}>
        <WorkflowStage
          step={step}
          setlist={importState.setlist}
          matchRows={matchRows}
          stepContainerRef={stepContainerRef}
          goToMatching={goToMatching}
          goToExport={goToExport}
          goBackToPreview={goBackToPreview}
          goBackToMatching={goBackToMatching}
          updateMatchDraft={updateMatchDraft}
          startAnotherSetlist={startAnotherSetlist}
          importContent={importContent}
          onStartAnother={handleStartAnother}
        />
      </div>
    </div>
  );
}
