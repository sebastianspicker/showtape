'use client';

import { ImportStep } from './import/ImportStep';
import { PreviewStep } from './import/PreviewStep';
import { useSetlistImport } from './import/useSetlistImport';
import { JourneyRail, useJourney } from './journey';
import { MatchingStep } from './matching/MatchingStep';
import { ExportStep } from './playlist/ExportStep';

/** Renders the journey rail and the one active stage of the Showtape journey. */
export function ShowtapeWorkflow() {
  const journey = useJourney();
  const importer = useSetlistImport({
    onLoaded: journey.previewImported,
    onRestart: journey.restart,
  });
  const { setlist } = importer;
  const { step, headingRef, matchDraft: draft } = journey;

  const renderStep = () => {
    const importStep = <ImportStep importer={importer} headingRef={headingRef} />;
    if (!setlist || step === 'import') return importStep;
    if (step === 'preview') {
      return (
        <PreviewStep
          setlist={setlist}
          headingRef={headingRef}
          onChangeSetlist={importer.backToImport}
          onMatchSongs={journey.showMatching}
        />
      );
    }
    if (step === 'matching') {
      return (
        <MatchingStep
          setlist={setlist}
          draft={draft}
          headingRef={headingRef}
          onBack={journey.showPreview}
          onDraftChange={journey.saveMatchDraft}
          onProceed={journey.showExport}
        />
      );
    }
    if (!draft) return importStep;
    return (
      <ExportStep
        setlist={setlist}
        matchRows={draft}
        headingRef={headingRef}
        onBack={journey.showMatching}
        onStartAnother={importer.reset}
      />
    );
  };

  return (
    <div className={`workflow-shell workflow-shell--${step}`}>
      <JourneyRail current={step} />
      <div className={`workflow-stage workflow-stage--${step}`}>{renderStep()}</div>
    </div>
  );
}
