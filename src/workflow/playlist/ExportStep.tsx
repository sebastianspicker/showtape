import { lazy, Suspense, type RefObject } from 'react';
import type { Setlist } from '@/domain/setlist';
import { SetlistAttribution } from '@/ui/SetlistAttribution';
import { StepHeader } from '@/workflow/journey';
import type { MatchRow } from '@/workflow/matching/model';

// Loaded on demand so MusicKit stays out of the first-load bundle.
const PlaylistExportWorkflow = lazy(() =>
  import('@/workflow/playlist/PlaylistExportWorkflow').then((module) => ({
    default: module.PlaylistExportWorkflow,
  }))
);

export interface ExportStepProps {
  setlist: Setlist;
  matchRows: MatchRow[];
  headingRef: RefObject<HTMLElement | null>;
  onBack: () => void;
  onStartAnother: () => void;
}

export function ExportStep({
  setlist,
  matchRows,
  headingRef,
  onBack,
  onStartAnother,
}: ExportStepProps) {
  return (
    <section className="workflow-section export-section" aria-label="Export playlist">
      <StepHeader
        step="export"
        title="Save to Apple Music"
        context={`${setlist.artist} · ${matchRows.filter((row) => row.appleTrack).length} selected`}
        headingRef={headingRef}
      />
      <Suspense fallback={<p role="status">Loading playlist export…</p>}>
        <PlaylistExportWorkflow
          setlist={setlist}
          matchRows={matchRows}
          onBack={onBack}
          onStartAnother={onStartAnother}
        />
      </Suspense>
      <SetlistAttribution sourceUrl={setlist.sourceUrl} />
    </section>
  );
}
