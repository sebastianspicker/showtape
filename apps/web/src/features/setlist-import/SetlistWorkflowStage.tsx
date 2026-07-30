import { type ReactNode, type RefObject } from 'react';
import type { MatchRow } from '@/features/matching/types';
import type { FlowStep, UseFlowStateResult } from './useFlowState';
import type { useSetlistImportState } from './useSetlistImportState';
import { ExportStage, MatchingStage, PreviewStage } from './SetlistWorkflowStages';

type SetlistImportState = ReturnType<typeof useSetlistImportState>;

interface WorkflowStageProps {
  step: FlowStep;
  setlist: SetlistImportState['setlist'];
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

export function getStepNumber(step: FlowStep): number {
  if (step === 'preview') return 2;
  if (step === 'matching') return 3;
  if (step === 'export') return 4;
  return 1;
}

export function WorkflowStage({
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
  if (step === 'preview' && setlist) return <PreviewStage setlist={setlist} {...stageProps} />;
  return importContent;
}
