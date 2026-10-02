'use client';

import { useEffect, useRef } from 'react';
import { buildPlaylistName, type Setlist } from '@/domain/setlist';
import { CassetteArtwork } from '@/ui/CassetteArtwork';
import { Button } from '@/ui/Button';
import { getSafeAppleUrl } from './appleUrl';

interface CreatedPlaylist {
  id: string;
  url?: string;
}

interface SuccessExportStateProps {
  setlist: Setlist;
  created: CreatedPlaylist;
  songIds: string[];
  onStartAnother?: VoidFunction;
}

export function SuccessExportState({
  setlist,
  created,
  songIds,
  onStartAnother,
}: SuccessExportStateProps) {
  const safeAppleUrl = getSafeAppleUrl(created.url);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section
      className="terminal-state terminal-state--success export-terminal"
      aria-labelledby="success-title"
    >
      <p className="completion-stamp">Completed</p>
      <h3 id="success-title" ref={headingRef} tabIndex={-1}>
        Made you a mixtape.
      </h3>
      <p>Your Apple Music playlist is ready.</p>
      <CassetteArtwork
        artist={setlist.artist}
        venue={setlist.venue}
        eventDate={setlist.eventDate}
        className="success-artwork"
      />
      <p className="playlist-name success-playlist-name">{buildPlaylistName(setlist)}</p>
      <p className="sr-only">Venue: {setlist.venue}</p>
      <p className="success-count">
        <strong>
          {songIds.length} of {songIds.length} recordings added
        </strong>
        <span>In the order you reviewed.</span>
      </p>
      <div className="step-actions">
        {safeAppleUrl ? (
          <a
            href={safeAppleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="button button--primary"
          >
            Open in Apple Music
          </a>
        ) : (
          <p className="support-text">Open Apple Music to find the new playlist.</p>
        )}
        {onStartAnother ? (
          <Button variant="secondary" onClick={onStartAnother}>
            Import another setlist
          </Button>
        ) : null}
      </div>
    </section>
  );
}
