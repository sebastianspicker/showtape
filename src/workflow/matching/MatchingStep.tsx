import { lazy, Suspense, type RefObject } from 'react';
import type { Setlist } from '@/domain/setlist';
import { CassetteArtwork } from '@/ui/CassetteArtwork';
import { Button } from '@/ui/Button';
import { SetlistAttribution } from '@/ui/SetlistAttribution';
import { StepHeader } from '@/workflow/journey';
import type { MatchRow } from './model';

// Loaded on demand so MusicKit and catalog search stay out of the first-load bundle.
const MatchingWorkflow = lazy(() =>
  import('@/workflow/matching/MatchingWorkflow').then((module) => ({
    default: module.MatchingWorkflow,
  }))
);

export interface MatchingStepProps {
  setlist: Setlist;
  draft: MatchRow[] | null;
  headingRef: RefObject<HTMLElement | null>;
  onBack: () => void;
  onDraftChange: (rows: MatchRow[]) => void;
  onProceed: (rows: MatchRow[]) => void;
}

export function MatchingStep({
  setlist,
  draft,
  headingRef,
  onBack,
  onDraftChange,
  onProceed,
}: MatchingStepProps) {
  return (
    <section className="workflow-section" aria-label="Confirm each song">
      <div className="matching-event-header">
        <div className="matching-event-details">
          <Button variant="secondary" onClick={onBack} className="back-button">
            Back to preview
          </Button>
          <StepHeader
            step="matching"
            title={setlist.artist}
            context={[setlist.venue, setlist.eventDate].filter(Boolean).join(' · ')}
            headingRef={headingRef}
          />
          <SetlistAttribution sourceUrl={setlist.sourceUrl} />
        </div>
        <CassetteArtwork
          artist={setlist.artist}
          venue={setlist.venue}
          eventDate={setlist.eventDate}
          className="matching-event-artwork"
        />
      </div>
      <Suspense fallback={<p role="status">Loading track matching…</p>}>
        <MatchingWorkflow
          setlist={setlist}
          initialDraft={draft}
          onMatchesChange={onDraftChange}
          onProceedToCreatePlaylist={onProceed}
        />
      </Suspense>
    </section>
  );
}
