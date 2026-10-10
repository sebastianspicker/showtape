'use client';

import type { RefObject } from 'react';
import { flattenSetlistToEntries, type Setlist } from '@/domain/setlist';
import { Button } from '@/ui/Button';
import { StepHeader } from '@/workflow/journey';
import { SetlistPreview } from './SetlistPreview';

export interface PreviewStepProps {
  setlist: Setlist;
  headingRef: RefObject<HTMLElement | null>;
  onChangeSetlist: () => void;
  onMatchSongs: () => void;
}

export function PreviewStep({
  setlist,
  headingRef,
  onChangeSetlist,
  onMatchSongs,
}: PreviewStepProps) {
  // Count what the list shows, so the header and the rows always agree.
  const songCount = flattenSetlistToEntries(setlist).length;
  const context = [
    setlist.venue,
    setlist.eventDate,
    `${songCount} ${songCount === 1 ? 'song' : 'songs'}`,
  ].filter((part): part is string => Boolean(part));

  return (
    <section className="workflow-section" aria-label="Review setlist">
      <StepHeader
        setlistTitle="Review setlist"
        title={setlist.artist || 'Untitled setlist'}
        context={context}
        headingRef={headingRef}
      />
      <SetlistPreview setlist={setlist} />
      <div className="step-actions">
        <Button onClick={onMatchSongs} disabled={songCount === 0}>
          Match songs on Apple Music
        </Button>
        <Button variant="quiet" onClick={onChangeSetlist}>
          Change setlist
        </Button>
      </div>
    </section>
  );
}
