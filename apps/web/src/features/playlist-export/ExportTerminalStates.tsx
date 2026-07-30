'use client';

import { Button } from '@repo/ui';
import type { Setlist } from '@repo/core';
import { getSafeAppleUrl } from './appleUrl';

export interface IncompleteResumeState {
  progress: 'exact' | 'unknown';
  url?: string;
  remainingIds: string[];
}

export interface CreatedPlaylist {
  id: string;
  url?: string;
}

export interface IncompleteExportStateProps {
  incompleteState: IncompleteResumeState;
  songIds: string[];
  addTracksError: string | null;
  loading: boolean;
  onAddRemainingTracks: VoidFunction;
  onStartAnother?: VoidFunction;
}

export function IncompleteExportState({
  incompleteState,
  songIds,
  addTracksError,
  loading,
  onAddRemainingTracks,
  onStartAnother,
}: IncompleteExportStateProps) {
  const hasUnknownProgress = incompleteState.progress === 'unknown';
  const remainingCount = incompleteState.remainingIds.length;
  const addedCount = hasUnknownProgress ? null : Math.max(songIds.length - remainingCount, 0);
  const safeAppleUrl = getSafeAppleUrl(incompleteState.url);

  return (
    <section
      className="terminal-state terminal-state--warning export-terminal"
      aria-labelledby="partial-title"
    >
      <h3 id="partial-title">Playlist created; import incomplete</h3>
      {hasUnknownProgress ? (
        <p>
          Apple Music did not report which songs were added. Automatic resume is unavailable because
          retrying could create duplicates.
        </p>
      ) : (
        <p>
          {addedCount} of {songIds.length} songs were added. {remainingCount} remain.
        </p>
      )}
      {addTracksError ? (
        <p role="alert" className="error-text">
          Finishing the import failed: {addTracksError}
        </p>
      ) : null}
      <div className="step-actions">
        {!hasUnknownProgress ? (
          <Button
            variant="secondary"
            onClick={onAddRemainingTracks}
            loading={loading}
            loadingChildren="Adding remaining songs…"
          >
            Add remaining songs
          </Button>
        ) : null}
        {safeAppleUrl ? (
          <a
            href={safeAppleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="button button--primary"
          >
            Open in Apple Music
          </a>
        ) : null}
        {onStartAnother ? (
          <Button variant="secondary" onClick={onStartAnother}>
            Start another setlist
          </Button>
        ) : null}
      </div>
    </section>
  );
}

export interface SuccessExportStateProps {
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

  return (
    <section
      className="terminal-state terminal-state--success export-terminal"
      aria-labelledby="success-title"
    >
      <h3 id="success-title">Playlist ready</h3>
      <p>
        {setlist.artist}
        {setlist.venue ? ` at ${setlist.venue}` : ''} · {songIds.length} song
        {songIds.length === 1 ? '' : 's'} added
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
            Start another setlist
          </Button>
        ) : null}
      </div>
    </section>
  );
}
