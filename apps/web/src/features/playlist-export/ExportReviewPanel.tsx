'use client';

import { Button } from '@repo/ui';
import type { Setlist } from '@repo/core';
import type { MatchRow } from '@/features/matching/types';

export interface ExportReviewPanelProps {
  playlistName: string;
  setlist: Setlist;
  selectedMatches: MatchRow[];
  loading: boolean;
  onBack?: () => void;
}

export function ExportReviewPanel({
  playlistName,
  setlist,
  selectedMatches,
  loading,
  onBack,
}: ExportReviewPanelProps) {
  return (
    <section className="export-review" aria-labelledby="playlist-name-label">
      <p id="playlist-name-label" className="export-label">
        Playlist name
      </p>
      <p className="playlist-name">{playlistName}</p>
      <p className="export-meta">
        {setlist.venue ?? 'Venue not listed'}
        {setlist.eventDate ? ` · ${setlist.eventDate}` : ''}
      </p>

      <ol className="export-track-list" aria-label="Selected songs">
        {selectedMatches.map((match, index) => (
          <li key={`${match.appleTrack?.id ?? match.setlistEntry.name}-${index}`}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{match.appleTrack?.name ?? match.setlistEntry.name}</strong>
          </li>
        ))}
      </ol>

      {onBack ? (
        <Button variant="secondary" onClick={onBack} disabled={loading} className="export-back">
          ← Back to matching
        </Button>
      ) : null}
    </section>
  );
}
