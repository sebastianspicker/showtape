import { type ReactNode, type RefObject } from 'react';
import { Button } from '@repo/ui';
import { SetlistAttribution } from '@/components/SetlistAttribution';
import { StepHeader } from '@/components/StepHeader';
import { MatchingView } from '@/features/matching/MatchingView';
import type { MatchRow } from '@/features/matching/types';
import { CreatePlaylistView } from '@/features/playlist-export/CreatePlaylistView';
import { ImportStep, type ImportStepProps } from './ImportStep';
import { PreviewStep } from './PreviewStep';
import type { UseFlowStateResult } from './useFlowState';
import type { useSetlistImportState } from './useSetlistImportState';

type SetlistImportState = ReturnType<typeof useSetlistImportState>;

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

export function ImportStage(props: ImportStageProps): ReactNode {
  const { state } = props;
  return (
    <ImportStep
      inputValue={state.inputValue}
      setInputValue={state.setInputValue}
      loading={state.loading}
      displayedError={props.displayedError}
      retryable={props.retryable}
      history={state.history}
      historyAnnouncement={props.historyAnnouncement}
      inputRef={props.inputRef}
      headingRef={props.headingRef}
      onSubmit={props.onSubmit}
      onValidateInput={state.validateInput}
      onCancelLoad={state.cancelLoad}
      onRetry={props.onRetry}
      onSelectHistoryItem={props.onSelectHistoryItem}
      onClearHistory={props.onClearHistory}
    />
  );
}

interface MatchingStageProps {
  setlist: SetlistImportState['setlist'];
  matchRows: MatchRow[] | null;
  stepContainerRef: RefObject<HTMLElement | null>;
  goToExport: UseFlowStateResult['goToExport'];
  goBackToPreview: UseFlowStateResult['goBackToPreview'];
  updateMatchDraft: UseFlowStateResult['updateMatchDraft'];
}

export function MatchingStage({
  setlist,
  matchRows,
  stepContainerRef,
  goToExport,
  goBackToPreview,
  updateMatchDraft,
}: MatchingStageProps): ReactNode {
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
  setlist: SetlistImportState['setlist'];
  matchRows: MatchRow[] | null;
  stepContainerRef: RefObject<HTMLElement | null>;
  goBackToMatching: UseFlowStateResult['goBackToMatching'];
  onStartAnother: UseFlowStateResult['startAnotherSetlist'];
}

export function ExportStage({
  setlist,
  matchRows,
  stepContainerRef,
  goBackToMatching,
  onStartAnother,
}: ExportStageProps): ReactNode {
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
  setlist: SetlistImportState['setlist'];
  stepContainerRef: RefObject<HTMLElement | null>;
  goToMatching: UseFlowStateResult['goToMatching'];
  startAnotherSetlist: UseFlowStateResult['startAnotherSetlist'];
}

export function PreviewStage({
  setlist,
  stepContainerRef,
  goToMatching,
  startAnotherSetlist,
}: PreviewStageProps): ReactNode {
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
