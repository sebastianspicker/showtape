'use client';

import { useRef, useState } from 'react';
import { WorkflowRail } from '@/components/WorkflowRail';
import { ImportStage } from './SetlistWorkflowStages';
import { getStepNumber, WorkflowStage } from './SetlistWorkflowStage';
import { useFlowState } from './useFlowState';
import { useSetlistImportState } from './useSetlistImportState';
import { useSetlistImportHandlers } from './useSetlistImportHandlers';

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

  const {
    handleSubmit,
    handleSelectHistoryItem,
    handleStartAnother,
    handleClearHistory,
    handleRetry,
  } = useSetlistImportHandlers({
    importState,
    inputRef,
    goToPreview,
    startAnotherSetlist,
    setSubmissionError,
    setHistoryAnnouncement,
  });

  const displayedError = importState.error?.message ?? submissionError;
  const retryable = importState.error?.retryable ?? Boolean(submissionError);
  const stepNumber = getStepNumber(step);
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
